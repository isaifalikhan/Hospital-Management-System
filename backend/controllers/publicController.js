const { Op } = require('sequelize');
const { Patient, Doctor, Appointment } = require('../models');
const { computeAvailableSlots } = require('./doctorController');
const { logAudit } = require('../utils/audit');

function generateMRN() {
  const ts = Date.now().toString().slice(-8);
  return `MRN${ts}`;
}

// Minimal, non-sensitive doctor info for the public booking picker — no
// phone/email/user account details, which are staff-only elsewhere.
exports.listDoctors = async (req, res, next) => {
  try {
    const doctors = await Doctor.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'specialization', 'qualification', 'consultationFee', 'availableDays', 'availableTime'],
      order: [['name', 'ASC']],
    });
    res.json(doctors);
  } catch (err) { next(err); }
};

// Public, unauthenticated booking: a walk-in web visitor submits their own
// details and picks a genuinely open slot. This is the one write endpoint in
// the whole app with no auth at all, so every field is validated
// (backend/middleware/validators.js) and the chosen slot is re-checked
// server-side here — never trust that the client only showed open slots.
exports.book = async (req, res, next) => {
  try {
    const { name, phone, email, doctorId, date, time, reason } = req.body;

    const doctor = await Doctor.findByPk(doctorId);
    if (!doctor || doctor.status !== 'active') {
      return res.status(404).json({ message: 'Selected doctor is not available for booking.' });
    }

    const { slots, reason: unavailableReason } = await computeAvailableSlots(doctor, date);
    if (!slots.includes(time)) {
      return res.status(409).json({
        message: unavailableReason || 'That slot is no longer available. Please choose another time.',
      });
    }

    // Belt-and-braces: computeAvailableSlots already excludes booked times,
    // but re-check immediately before the write to shrink the race window
    // (the DB-level unique index below is the real guarantee).
    const clash = await Appointment.findOne({
      where: { doctorId, date, time, status: { [Op.ne]: 'cancelled' } },
    });
    if (clash) {
      return res.status(409).json({ message: 'That slot was just booked by someone else. Please choose another time.' });
    }

    let patient = await Patient.findOne({ where: { phone } });
    if (!patient) {
      patient = await Patient.create({ mrn: generateMRN(), name, phone, email: email || null });
    }

    let appt;
    try {
      appt = await Appointment.create({
        patientId: patient.id,
        doctorId,
        date,
        time,
        reason: reason || 'Online booking',
        status: 'scheduled',
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'That slot was just booked by someone else. Please choose another time.' });
      }
      throw err;
    }

    // logAudit reads req.user for attribution and gracefully falls back to
    // "System" when it's absent (as it always is on this unauthenticated route).
    await logAudit(req, {
      action: 'create',
      entityType: 'Appointment',
      entityId: appt.id,
      summary: `Public online booking: ${patient.name} (${patient.phone}) with Dr. ${doctor.name.replace(/^Dr\.?\s*/, '')} on ${date} ${time}`,
    });

    res.status(201).json({
      message: 'Appointment booked successfully.',
      appointment: {
        id: appt.id,
        date: appt.date,
        time: appt.time,
        doctorName: doctor.name,
        patientName: patient.name,
      },
    });
  } catch (err) { next(err); }
};

// Public, unauthenticated waiting-room queue board — meant to run on a
// lobby TV/kiosk with no login. Deliberately returns token numbers and
// doctor names only, never patient names, so it's safe to display where
// anyone can see it. Staff call/complete tokens from the authenticated
// Queue page (PUT /api/appointments/:id — see frontend/src/pages/Queue.jsx).
exports.queue = async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const appts = await Appointment.findAll({
      where: { date, visitType: 'walk-in', status: { [Op.ne]: 'cancelled' } },
      include: [{ model: Doctor, attributes: ['id', 'name'] }],
    });

    const byDoctor = new Map();
    for (const a of appts) {
      if (!byDoctor.has(a.doctorId)) {
        byDoctor.set(a.doctorId, { doctorId: a.doctorId, doctorName: a.Doctor?.name, tokens: [] });
      }
      byDoctor.get(a.doctorId).tokens.push(a);
    }

    const queue = Array.from(byDoctor.values()).map(({ doctorId, doctorName, tokens }) => {
      const active = tokens.filter((t) => t.status !== 'completed' && t.status !== 'no-show');
      const called = active.filter((t) => t.calledAt).sort((a, b) => new Date(b.calledAt) - new Date(a.calledAt));
      const waiting = active.filter((t) => !t.calledAt).sort((a, b) => a.tokenNumber - b.tokenNumber);
      return {
        doctorId,
        doctorName,
        nowServing: called[0]?.tokenNumber ?? null,
        waitingCount: waiting.length,
        nextTokens: waiting.slice(0, 3).map((t) => t.tokenNumber),
      };
    });

    res.json(queue);
  } catch (err) { next(err); }
};
