const { Patient, Appointment, MedicalRecord, Invoice, Doctor } = require('../models');
const { Op } = require('sequelize');

function generateMRN() {
  const ts = Date.now().toString().slice(-8);
  return `MRN${ts}`;
}

exports.list = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { mrn: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }
    const patients = await Patient.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(patients);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const patient = await Patient.findByPk(req.params.id, {
      include: [
        { model: Appointment, include: [{ model: Doctor, attributes: ['id', 'name', 'specialization'] }] },
        { model: MedicalRecord, include: [{ model: Doctor, attributes: ['id', 'name'] }] },
        { model: Invoice },
      ],
    });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, mrn: req.body.mrn || generateMRN() };
    const patient = await Patient.create(data);
    res.status(201).json(patient);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    await patient.update(req.body);
    res.json(patient);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    await patient.destroy();
    res.json({ message: 'Patient deleted' });
  } catch (err) { next(err); }
};
