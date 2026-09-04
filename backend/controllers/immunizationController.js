const { Immunization, Patient } = require('../models');
const { logAudit } = require('../utils/audit');

exports.list = async (req, res, next) => {
  try {
    const { patientId } = req.query;
    const where = {};
    if (patientId) where.patientId = patientId;
    const records = await Immunization.findAll({
      where,
      include: [{ model: Patient, attributes: ['id', 'name', 'mrn'] }],
      order: [['dateGiven', 'DESC']],
    });
    res.json(records);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const record = await Immunization.create(req.body);
    await logAudit(req, {
      action: 'create', entityType: 'Immunization', entityId: record.id,
      summary: `Recorded ${record.vaccineName}${record.doseNumber ? ` (dose ${record.doseNumber})` : ''} for patient #${record.patientId}`,
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const record = await Immunization.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: 'Immunization record not found' });
    await record.update(req.body);
    await logAudit(req, { action: 'update', entityType: 'Immunization', entityId: record.id, summary: `Updated ${record.vaccineName}` });
    res.json(record);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const record = await Immunization.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: 'Immunization record not found' });
    await record.destroy();
    await logAudit(req, { action: 'delete', entityType: 'Immunization', entityId: req.params.id, summary: `Deleted ${record.vaccineName}` });
    res.json({ message: 'Immunization record deleted' });
  } catch (err) { next(err); }
};
