const { Appointment, Patient, Doctor } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/audit');
const { buildVideoConsultLink } = require('../utils/telemedicine');

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
        { model: Doctor, attributes: ['id', 'name', 'specialization'] },
      ],
      order: [['date', 'DESC'], ['time', 'ASC']],
    });
    res.json(appointments);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const appt = await Appointment.findByPk(req.params.id, {
      include: [{ model: Patient }, { model: Doctor }],
    });
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    res.json(appt);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { patientId, doctorId } = req.body;
    const visitType = req.body.visitType === 'walk-in' ? 'walk-in' : 'scheduled';
    if (!patientId || !doctorId) {
      return res.status(400).json({ message: 'patientId and doctorId are required' });
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
      const last = await Appointment.findOne({
        where: { doctorId, date: payload.date, visitType: 'walk-in' },
        order: [['tokenNumber', 'DESC']],
      });
      payload.tokenNumber = (last?.tokenNumber || 0) + 1;
    } else {
      const { date, time } = req.body;
      if (!date || !time) {
        return res.status(400).json({ message: 'date and time are required for a scheduled appointment' });
      }
      const clash = await Appointment.findOne({
        where: { doctorId, date, time, status: { [Op.ne]: 'cancelled' } },
      });
      if (clash) {
        return res.status(409).json({ message: 'This doctor already has an appointment at that date and time.' });
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
      appt = await Appointment.create(payload);
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'This doctor already has an appointment at that date and time.' });
      }
      throw err;
    }
    const full = await Appointment.findByPk(appt.id, {
      include: [{ model: Patient, attributes: ['id', 'name', 'mrn'] }, { model: Doctor, attributes: ['id', 'name'] }],
    });
    await logAudit(req, {
      action: 'create', entityType: 'Appointment', entityId: appt.id,
      summary: visitType === 'walk-in'
        ? `Checked in walk-in patient #${patientId} with doctor #${doctorId} — token #${payload.tokenNumber}`
        : `Booked appointment for patient #${patientId} with doctor #${doctorId} on ${payload.date} ${payload.time}`,
    });
    res.status(201).json(full);
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
