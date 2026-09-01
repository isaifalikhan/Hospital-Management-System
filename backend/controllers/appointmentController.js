const { Appointment, Patient, Doctor } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/audit');

exports.list = async (req, res, next) => {
  try {
    const { date, doctorId, patientId, status, from, to } = req.query;
    const where = {};
    if (date) where.date = date;
    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
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
    const { patientId, doctorId, date, time } = req.body;
    if (!patientId || !doctorId || !date || !time) {
      return res.status(400).json({ message: 'patientId, doctorId, date, and time are required' });
    }

    const clash = await Appointment.findOne({
      where: { doctorId, date, time, status: { [Op.ne]: 'cancelled' } },
    });
    if (clash) {
      return res.status(409).json({ message: 'This doctor already has an appointment at that date and time.' });
    }

    let appt;
    try {
      appt = await Appointment.create(req.body);
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
      summary: `Booked appointment for patient #${patientId} with doctor #${doctorId} on ${date} ${time}`,
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

    try {
      await appt.update(req.body);
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
