const { Doctor, Department, User } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const { search, departmentId, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const { Op } = require('sequelize');
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
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
