const { Patient, Appointment, MedicalRecord, Invoice, Doctor, LabOrder, Admission, PrescriptionItem } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/audit');
const { searchOp } = require('../utils/search');

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
        { name: { [searchOp]: `%${search}%` } },
        { mrn: { [searchOp]: `%${search}%` } },
        { phone: { [searchOp]: `%${search}%` } },
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
        { model: MedicalRecord, include: [{ model: Doctor, attributes: ['id', 'name'] }, { model: PrescriptionItem }] },
        { model: Invoice },
        { model: LabOrder, include: [{ model: Doctor, attributes: ['id', 'name'] }] },
        { model: Admission, include: [{ model: Doctor, attributes: ['id', 'name'] }] },
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
    await logAudit(req, { action: 'create', entityType: 'Patient', entityId: patient.id, summary: `Registered patient ${patient.name} (${patient.mrn})` });
    res.status(201).json(patient);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    await patient.update(req.body);
    await logAudit(req, { action: 'update', entityType: 'Patient', entityId: patient.id, summary: `Updated patient ${patient.name}` });
    res.json(patient);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    await patient.destroy();
    await logAudit(req, { action: 'delete', entityType: 'Patient', entityId: req.params.id, summary: `Deleted patient ${patient.name}` });
    res.json({ message: 'Patient deleted' });
  } catch (err) { next(err); }
};
