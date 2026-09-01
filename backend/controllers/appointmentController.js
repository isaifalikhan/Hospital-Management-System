const { Appointment, Patient, Doctor } = require('../models');
const { Op } = require('sequelize');

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
    const appt = await Appointment.create(req.body);
    const full = await Appointment.findByPk(appt.id, {
      include: [{ model: Patient, attributes: ['id', 'name', 'mrn'] }, { model: Doctor, attributes: ['id', 'name'] }],
    });
    res.status(201).json(full);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const appt = await Appointment.findByPk(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    await appt.update(req.body);
    res.json(appt);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const appt = await Appointment.findByPk(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });
    await appt.destroy();
    res.json({ message: 'Appointment deleted' });
  } catch (err) { next(err); }
};
