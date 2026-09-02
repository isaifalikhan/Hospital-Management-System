const { Doctor, Department, User, Appointment } = require('../models');
const { Op } = require('sequelize');
const { searchOp } = require('../utils/search');
const scheduling = require('../utils/scheduling');

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

// Computes open 30-minute appointment slots for a doctor on a given date:
// fetches this doctor's non-cancelled bookings for the date, then delegates
// the actual availability math to utils/scheduling.js (the single shared
// implementation also used by the public booking flow, patient portal, and
// owner-insights utilization calc).
//
// Extracted as a plain (non-Express) function so it can be reused outside
// this handler — the public booking flow (controllers/publicController.js)
// calls it to re-validate a slot server-side before creating an
// unauthenticated appointment, rather than trusting whatever the client
// last saw.
async function computeAvailableSlots(doctor, date) {
  const booked = await Appointment.findAll({
    where: { doctorId: doctor.id, date, status: { [Op.ne]: 'cancelled' } },
    attributes: ['time'],
  });
  const result = scheduling.computeAvailableSlots(doctor, date, booked.map((a) => a.time));
  return { date, ...result };
}
exports.computeAvailableSlots = computeAvailableSlots;

exports.availableSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    const doctor = await Doctor.findByPk(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    const result = await computeAvailableSlots(doctor, date);
    res.json(result);
  } catch (err) { next(err); }
};
