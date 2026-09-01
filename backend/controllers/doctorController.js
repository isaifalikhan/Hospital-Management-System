const { Doctor, Department, User, Appointment } = require('../models');
const { Op } = require('sequelize');
const { searchOp } = require('../utils/search');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SLOT_MINUTES = 30;

function timeToMinutes(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

exports.list = async (req, res, next) => {
  try {
    const { search, departmentId, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    if (search) {
      where.name = { [searchOp]: `%${search}%` };
    }

    const doctors = await Doctor.findAll({
      where,
      include: [
        { model: Department, attributes: ['id', 'name'] },
        { model: User, attributes: ['id', 'username', 'email'] },
      ],
      order: [['name', 'ASC']],
    });
    res.json(doctors);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id, {
      include: [{ model: Department }, { model: User, attributes: ['id', 'username', 'email'] }],
    });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    res.json(doctor);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const doctor = await Doctor.create(req.body);
    res.status(201).json(doctor);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    await doctor.update(req.body);
    res.json(doctor);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByPk(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    await doctor.destroy();
    res.json({ message: 'Doctor deleted' });
  } catch (err) { next(err); }
};

// Computes open 30-minute appointment slots for a doctor on a given date,
// based on their weekly availability window minus appointments already on
// the books (any non-cancelled appointment blocks its slot).
exports.availableSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    const doctor = await Doctor.findByPk(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    if (!doctor.availableDays || !doctor.availableTime) {
      return res.json({ date, slots: [], reason: 'This doctor has no configured availability.' });
    }

    const dayName = DAY_NAMES[new Date(`${date}T00:00:00`).getDay()];
    const availableDays = doctor.availableDays.split(',').map((d) => d.trim());
    if (!availableDays.includes(dayName)) {
      return res.json({ date, slots: [], reason: `Dr. ${doctor.name} is not available on ${dayName}s.` });
    }

    const [startStr, endStr] = doctor.availableTime.split('-').map((t) => t.trim());
    const startMin = timeToMinutes(startStr);
    const endMin = timeToMinutes(endStr);

    const booked = await Appointment.findAll({
      where: { doctorId: doctor.id, date, status: { [Op.ne]: 'cancelled' } },
      attributes: ['time'],
    });
    const bookedTimes = new Set(booked.map((a) => a.time));

    const slots = [];
    for (let m = startMin; m + SLOT_MINUTES <= endMin; m += SLOT_MINUTES) {
      const slotTime = minutesToTime(m);
      if (!bookedTimes.has(slotTime)) slots.push(slotTime);
    }

    res.json({ date, slots });
  } catch (err) { next(err); }
};
