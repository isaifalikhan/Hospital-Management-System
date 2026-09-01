const { Department, Doctor } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const departments = await Department.findAll({
      include: [{ model: Doctor, attributes: ['id', 'name', 'specialization'] }],
      order: [['name', 'ASC']],
    });
    res.json(departments);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Department name is required' });
    const dept = await Department.create({ name, description });
    res.status(201).json(dept);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    const { name, description } = req.body;
    if (name !== undefined) dept.name = name;
    if (description !== undefined) dept.description = description;
    await dept.save();
    res.json(dept);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    await dept.destroy();
    res.json({ message: 'Department deleted' });
  } catch (err) { next(err); }
};
