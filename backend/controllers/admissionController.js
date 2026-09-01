const { Admission, Patient, Doctor } = require('../models');
const { logAudit } = require('../utils/audit');

exports.list = async (req, res, next) => {
  try {
    const { status, patientId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    const admissions = await Admission.findAll({
      where,
      include: [
        { model: Patient, attributes: ['id', 'name', 'mrn'] },
        { model: Doctor, attributes: ['id', 'name'] },
      ],
      order: [['admissionDate', 'DESC']],
    });
    res.json(admissions);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const admission = await Admission.create(req.body);
    await Patient.update({ status: 'admitted' }, { where: { id: admission.patientId } });
    const full = await Admission.findByPk(admission.id, {
      include: [{ model: Patient, attributes: ['id', 'name'] }, { model: Doctor, attributes: ['id', 'name'] }],
    });
    await logAudit(req, {
      action: 'create', entityType: 'Admission', entityId: admission.id,
      summary: `Admitted patient #${admission.patientId} to ${admission.ward} (bed ${admission.bedNumber})`,
    });
    res.status(201).json(full);
  } catch (err) { next(err); }
};

exports.discharge = async (req, res, next) => {
  try {
    const admission = await Admission.findByPk(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    if (admission.status === 'discharged') {
      return res.status(400).json({ message: 'This admission is already discharged' });
    }
    admission.status = 'discharged';
    admission.dischargeDate = new Date().toISOString().slice(0, 10);
    admission.dischargeNotes = req.body.dischargeNotes || admission.dischargeNotes;
    await admission.save();

    const stillAdmitted = await Admission.count({ where: { patientId: admission.patientId, status: 'admitted' } });
    if (stillAdmitted === 0) {
      await Patient.update({ status: 'discharged' }, { where: { id: admission.patientId } });
    }

    await logAudit(req, {
      action: 'update', entityType: 'Admission', entityId: admission.id,
      summary: `Discharged patient #${admission.patientId} from ${admission.ward}`,
    });
    res.json(admission);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const admission = await Admission.findByPk(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    await admission.update(req.body);
    res.json(admission);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const admission = await Admission.findByPk(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    await admission.destroy();
    await logAudit(req, { action: 'delete', entityType: 'Admission', entityId: req.params.id });
    res.json({ message: 'Admission record deleted' });
  } catch (err) { next(err); }
};
