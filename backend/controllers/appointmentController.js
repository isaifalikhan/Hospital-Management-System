const { Appointment, Patient, Doctor, Invoice, InvoiceItem, sequelize } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/audit');
const { buildVideoConsultLink } = require('../utils/telemedicine');
const { generateInvoiceNumber } = require('../utils/billing');

// Billing columns the OPD chalan and the queue need — enough to show the
// bill number and whether reception has collected it.
const INVOICE_SUMMARY = ['id', 'invoiceNumber', 'total', 'amountPaid', 'status', 'date'];

exports.list = async (req, res, next) => {
  try {
    const { date, doctorId, patientId, status, from, to, visitType } = req.query;
    const where = {};
    if (date) where.date = date;
    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (visitType) where.visitType = visitType;
    if (from && to) where.date = { [Op.between]: [from, to] };

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Patient, attributes: ['id', 'name', 'mrn', 'phone'] },
        // consultationFee so the queue can reprint a visit's OPD chalan
        // without a second round-trip for the doctor.
        { model: Doctor, attributes: ['id', 'name', 'specialization', 'consultationFee'] },
        { model: Invoice, attributes: INVOICE_SUMMARY },
      ],
      order: [['date', 'DESC'], ['time', 'ASC']],
    });
    res.json(appointments);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const appt = await Appointment.findByPk(req.params.id, {
      include: [
        { model: Patient, attributes: { exclude: ['portalPin'] } },
        { model: Doctor },
      ],
    });
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    res.json(appt);
  } catch (err) { next(err); }
};

// A walk-in check-in raises the consultation bill at the same time it issues
// the token, the way a lab order raises the test's bill. Without it the OPD
// chalan printed "Total Payable" against nothing, and reception had no record
// to collect the doctor's fee on. Scheduled bookings are deliberately left
// out: they're made ahead of time (including by patients themselves through
// the portal and the public page), and billing a visit nobody has turned up
// for yet would just fill the billing queue with invoices to cancel.
// Retries exist only for the walk-in token race — see the catch below. A busy
// front desk can have several receptionists checking patients in at once, and
// every one of them that loses the race retries, so allow enough attempts to
// clear a realistic burst.
const MAX_TOKEN_ATTEMPTS = 12;
const TOKEN_INDEX = 'appointments_walkin_date_token';

// Sequelize reports a unique violation differently per dialect: Postgres puts
// the index name in `constraint`/`message`, SQLite names the columns instead.
// Check every shape rather than assuming one.
function isTokenCollision(err) {
  if (err?.parent?.constraint === TOKEN_INDEX) return true;
  if (Object.keys(err?.fields || {}).some((f) => /tokenNumber/i.test(f))) return true;
  const text = `${err?.parent?.message || ''} ${err?.message || ''}`;
  return new RegExp(`${TOKEN_INDEX}|tokenNumber`, 'i').test(text);
}

// A short, jittered pause before retrying. Without it every loser of a race
// re-reads the same max at the same moment and collides all over again.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Returns { retry } to ask for another attempt, or { status, body } to answer
// the request. Kept separate from the exported handler so a token collision
// can roll back and start cleanly: Postgres aborts a transaction on a
// constraint error, so retrying inside the same one isn't an option.
async function attemptCreate(req, attempt) {
  const t = await sequelize.transaction();
  try {
    const { patientId, doctorId } = req.body;
    const visitType = req.body.visitType === 'walk-in' ? 'walk-in' : 'scheduled';
    if (!patientId || !doctorId) {
      await t.rollback();
      return { status: 400, body: { message: 'patientId and doctorId are required' } };
    }

    const payload = { ...req.body, visitType };

    if (visitType === 'walk-in') {
      // Front-desk check-in: the server — not the client — decides the
      // date/time (right now) and the queue position, so a receptionist
      // only ever needs to pick the patient and the doctor. Deliberately
      // not run through the doctor/date/time clash check above: walk-ins
      // queue by tokenNumber, they don't occupy a discrete booked slot, so
      // more than one can legitimately share the same check-in minute (the
      // DB-level unique index is scoped to visitType = 'scheduled' for the
      // same reason — see server.js).
      const now = new Date();
      payload.date = now.toISOString().slice(0, 10);
      payload.time = now.toTimeString().slice(0, 5);
      // One sequence for the whole hospital per day, not one per doctor.
      // Per-doctor numbering meant two patients seeing different doctors both
      // walked out holding a chalan reading "Token #1", so the number on the
      // slip identified nobody. Cancelled and no-show walk-ins keep their
      // number — the patient is holding a printed copy of it, so it must
      // never be handed to someone else.
      const last = await Appointment.findOne({
        where: { date: payload.date, visitType: 'walk-in' },
        order: [['tokenNumber', 'DESC']],
        transaction: t,
      });
      payload.tokenNumber = (last?.tokenNumber || 0) + 1;
    } else {
      const { date, time } = req.body;
      if (!date || !time) {
        await t.rollback();
        return { status: 400, body: { message: 'date and time are required for a scheduled appointment' } };
      }
      const clash = await Appointment.findOne({
        where: { doctorId, date, time, status: { [Op.ne]: 'cancelled' } },
        transaction: t,
      });
      if (clash) {
        await t.rollback();
        return { status: 409, body: { message: 'This doctor already has an appointment at that date and time.' } };
      }
      payload.tokenNumber = null;
    }

    // Generate the Jitsi room link server-side at booking time (not
    // client-supplied) so it can't be spoofed to point somewhere else.
    if (payload.isVideoConsult) {
      payload.videoLink = buildVideoConsultLink();
    }

    let appt;
    try {
      appt = await Appointment.create(payload, { transaction: t });
    } catch (err) {
      await t.rollback();
      if (err.name === 'SequelizeUniqueConstraintError') {
        // Two front desks checking someone in at the same instant both read
        // the same highest token before either wrote. The unique index caught
        // it; retrying re-reads and takes the next number.
        //
        // Identified by index name as well as column: Postgres reports
        // 'duplicate key value violates unique constraint
        // "appointments_walkin_date_token"' and never names the column, so
        // matching on "tokenNumber" alone silently missed every collision and
        // returned the double-booking message instead.
        if (visitType === 'walk-in' && isTokenCollision(err)) {
          if (attempt < MAX_TOKEN_ATTEMPTS - 1) return { retry: true };
          return { status: 409, body: { message: 'Could not allocate a queue token — please try again.' } };
        }
        return { status: 409, body: { message: 'This doctor already has an appointment at that date and time.' } };
      }
      throw err;
    }

    // The consultation bill the patient pays at reception before seeing the
    // doctor. A doctor with no fee set raises nothing, same rule the lab
    // order billing uses for a free test.
    const doctor = await Doctor.findByPk(doctorId, { transaction: t });
    const fee = Number(doctor?.consultationFee) || 0;
    if (visitType === 'walk-in' && fee > 0) {
      const invoice = await Invoice.create({
        invoiceNumber: generateInvoiceNumber(),
        patientId,
        appointmentId: appt.id,
        date: payload.date,
        subtotal: fee,
        discount: 0,
        tax: 0,
        total: fee,
        status: 'unpaid',
        notes: `OPD consultation — ${doctor.name}`,
      }, { transaction: t });

      await InvoiceItem.create({
        invoiceId: invoice.id,
        description: `Consultation — ${doctor.name}`,
        category: 'consultation',
        quantity: 1,
        unitPrice: fee,
        amount: fee,
      }, { transaction: t });
    }

    await t.commit();

    const full = await Appointment.findByPk(appt.id, {
      include: [
        { model: Patient, attributes: ['id', 'name', 'mrn'] },
        { model: Doctor, attributes: ['id', 'name', 'specialization', 'consultationFee'] },
        { model: Invoice, attributes: INVOICE_SUMMARY },
      ],
    });
    await logAudit(req, {
      action: 'create', entityType: 'Appointment', entityId: appt.id,
      summary: visitType === 'walk-in'
        ? `Checked in walk-in patient #${patientId} with doctor #${doctorId} — token #${payload.tokenNumber}${fee > 0 ? ` — billed Rs. ${fee.toFixed(2)}` : ''}`
        : `Booked appointment for patient #${patientId} with doctor #${doctorId} on ${payload.date} ${payload.time}`,
    });
    return { status: 201, body: full };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

exports.create = async (req, res, next) => {
  try {
    for (let attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt++) {
      const outcome = await attemptCreate(req, attempt);
      if (!outcome.retry) return res.status(outcome.status).json(outcome.body);
      await sleep(5 + Math.floor(Math.random() * 25));
    }
    return res.status(409).json({ message: 'Could not allocate a queue token — please try again.' });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const appt = await Appointment.findByPk(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    if (req.body.date || req.body.time) {
      const date = req.body.date || appt.date;
      const time = req.body.time || appt.time;
      const doctorId = req.body.doctorId || appt.doctorId;
      const clash = await Appointment.findOne({
        where: { doctorId, date, time, status: { [Op.ne]: 'cancelled' }, id: { [Op.ne]: appt.id } },
      });
      if (clash) {
        return res.status(409).json({ message: 'This doctor already has an appointment at that date and time.' });
      }
    }

    const updates = { ...req.body };
    // Only mint a new room the first time video is turned on for this
    // appointment; once a link exists we keep it so it stays shareable.
    if (updates.isVideoConsult && !appt.videoLink) {
      updates.videoLink = buildVideoConsultLink();
    }

    try {
      await appt.update(updates);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'This doctor already has an appointment at that date and time.' });
      }
      throw err;
    }
    await logAudit(req, { action: 'update', entityType: 'Appointment', entityId: appt.id, summary: `Updated appointment #${appt.id} (status: ${appt.status})` });
    res.json(appt);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const appt = await Appointment.findByPk(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    await appt.destroy();
    await logAudit(req, { action: 'delete', entityType: 'Appointment', entityId: req.params.id });
    res.json({ message: 'Appointment deleted' });
  } catch (err) { next(err); }
};
