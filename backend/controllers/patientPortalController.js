const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Patient, Appointment, Doctor, MedicalRecord, Invoice, InvoiceItem } = require('../models');
const { computeAvailableSlots } = require('../utils/scheduling');
const { buildVideoConsultLink } = require('../utils/telemedicine');

// Every handler below (except login) runs after patientPortalRoutes.js has
// already required authenticate + authorize('patient'), so req.user is a
// verified JWT payload with role 'patient' and id === the logged-in
// patient's own Patient.id. That id — never anything from the request body
// or params — is what every query below filters on. This is the one place
// in the app where a bug means one patient reading another patient's
// medical/billing data, so every query here scopes explicitly by
// req.user.id even where an ORM default might otherwise happen to be safe.

function signPatientToken(patient) {
  return jwt.sign(
    { id: patient.id, role: 'patient', name: patient.name, mrn: patient.mrn },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

exports.login = async (req, res, next) => {
  try {
    const { phone, pin } = req.body;
    if (!phone || !pin) {
      return res.status(400).json({ message: 'Phone and PIN are required' });
    }
    // NOTE (scope cut): Patient.phone has no uniqueness constraint in this
    // schema (family members may share a landline). Portal login therefore
    // matches the first patient row with that phone number who also has a
    // PIN set. For a real deployment, phone numbers used for portal login
    // should be kept distinct per patient, or login should be extended to
    // also take the MRN.
    const patient = await Patient.findOne({ where: { phone: phone.trim() } });
    if (!patient || !patient.portalPin) {
      return res.status(401).json({ message: 'Invalid phone number or PIN, or portal access has not been enabled for this patient yet.' });
    }
    const match = await bcrypt.compare(pin, patient.portalPin);
    if (!match) {
      return res.status(401).json({ message: 'Invalid phone number or PIN, or portal access has not been enabled for this patient yet.' });
    }
    const token = signPatientToken(patient);
    res.json({
      token,
      patient: { id: patient.id, name: patient.name, mrn: patient.mrn, phone: patient.phone, portalEmail: patient.portalEmail },
    });
  } catch (err) { next(err); }
};

exports.me = async (req, res, next) => {
  try {
    const patient = await Patient.findByPk(req.user.id, {
      attributes: { exclude: ['portalPin'] },
    });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) { next(err); }
};

// Read-only doctor directory + slot picker so the portal can offer the same
// self-service booking UX as staff, without exposing anything beyond what's
// needed to pick a doctor and a time.
exports.listDoctors = async (req, res, next) => {
  try {
    const doctors = await Doctor.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'specialization', 'consultationFee', 'availableDays', 'availableTime', 'departmentId'],
      order: [['name', 'ASC']],
    });
    res.json(doctors);
  } catch (err) { next(err); }
};

exports.availableSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'A valid date query param is required' });
    const doctor = await Doctor.findByPk(req.params.doctorId);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const booked = await Appointment.findAll({
      where: { doctorId: doctor.id, date, status: { [Op.ne]: 'cancelled' } },
      attributes: ['time'],
    });
    const result = computeAvailableSlots(doctor, date, booked.map((a) => a.time));
    res.json({ date, ...result });
  } catch (err) { next(err); }
};

exports.listAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.findAll({
      where: { patientId: req.user.id },
      include: [{ model: Doctor, attributes: ['id', 'name', 'specialization'] }],
      order: [['date', 'DESC'], ['time', 'ASC']],
    });
    res.json(appointments);
  } catch (err) { next(err); }
};

exports.bookAppointment = async (req, res, next) => {
  try {
    const { doctorId, date, time, reason, isVideoConsult } = req.body;
    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const clash = await Appointment.findOne({
      where: { doctorId, date, time, status: { [Op.ne]: 'cancelled' } },
    });
    if (clash) {
      return res.status(409).json({ message: 'This doctor already has an appointment at that date and time. Please pick another slot.' });
    }

    const payload = {
      patientId: req.user.id, // forced to the logged-in patient — never trust a client-supplied patientId here
      doctorId,
      date,
      time,
      reason: reason || 'Booked via patient portal',
      status: 'scheduled',
      isVideoConsult: !!isVideoConsult,
      videoLink: isVideoConsult ? buildVideoConsultLink() : null,
    };

    let appt;
    try {
      appt = await Appointment.create(payload);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'This doctor already has an appointment at that date and time. Please pick another slot.' });
      }
      throw err;
    }

    const full = await Appointment.findByPk(appt.id, {
      include: [{ model: Doctor, attributes: ['id', 'name', 'specialization'] }],
    });
    res.status(201).json(full);
  } catch (err) { next(err); }
};

exports.cancelAppointment = async (req, res, next) => {
  try {
    // Scoped by patientId as well as id: a patient can only ever find (and
    // therefore cancel) their own appointments. A mismatched id looks
    // exactly like a nonexistent one (404), never a 403 that would confirm
    // another patient's appointment exists.
    const appt = await Appointment.findOne({
      where: { id: req.params.id, patientId: req.user.id },
    });
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    if (appt.status !== 'scheduled') {
      return res.status(400).json({ message: 'Only scheduled appointments can be cancelled' });
    }
    appt.status = 'cancelled';
    await appt.save();
    res.json(appt);
  } catch (err) { next(err); }
};

// Patient-appropriate clinical summary: diagnosis + treatment only. Vitals,
// prescription detail, and free-text clinician notes are intentionally left
// out of the portal view — full clinical detail stays staff-only.
exports.listMedicalRecords = async (req, res, next) => {
  try {
    const records = await MedicalRecord.findAll({
      where: { patientId: req.user.id },
      attributes: ['id', 'date', 'diagnosis', 'treatment'],
      include: [{ model: Doctor, attributes: ['id', 'name'] }],
      order: [['date', 'DESC']],
    });
    res.json(records);
  } catch (err) { next(err); }
};

exports.listInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.findAll({
      where: { patientId: req.user.id },
      include: [{ model: InvoiceItem }],
      order: [['createdAt', 'DESC']],
    });
    res.json(invoices);
  } catch (err) { next(err); }
};
