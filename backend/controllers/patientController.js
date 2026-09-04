const bcrypt = require('bcryptjs');
const { Patient, Appointment, MedicalRecord, Invoice, Doctor, LabOrder, Admission, PrescriptionItem, Immunization } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/audit');
const { searchOp } = require('../utils/search');

function generateMRN() {
  const ts = Date.now().toString().slice(-8);
  return `MRN${ts}`;
}

// portalPin must only ever be set through setPortalPin (below), which
// bcrypt-hashes it the same way authController hashes User passwords.
// Stripped here so a plain-text value in a create/update body can never
// land in the column and be compared against later as if it were a hash.
function stripPortalPin(body) {
  const { portalPin, ...rest } = body;
  return rest;
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
    const patients = await Patient.findAll({
      where,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['portalPin'] },
    });
    res.json(patients);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const patient = await Patient.findByPk(req.params.id, {
      attributes: { exclude: ['portalPin'] },
      include: [
        { model: Appointment, include: [{ model: Doctor, attributes: ['id', 'name', 'specialization'] }] },
        { model: MedicalRecord, include: [{ model: Doctor, attributes: ['id', 'name'] }, { model: PrescriptionItem }] },
        { model: Invoice },
        { model: LabOrder, include: [{ model: Doctor, attributes: ['id', 'name'] }] },
        { model: Admission, include: [{ model: Doctor, attributes: ['id', 'name'] }] },
        { model: Immunization },
      ],
    });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const data = { ...stripPortalPin(req.body), mrn: req.body.mrn || generateMRN() };
    const patient = await Patient.create(data);
    await logAudit(req, { action: 'create', entityType: 'Patient', entityId: patient.id, summary: `Registered patient ${patient.name} (${patient.mrn})` });
    const { portalPin, ...safePatient } = patient.toJSON();
    res.status(201).json(safePatient);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    await patient.update(stripPortalPin(req.body));
    await logAudit(req, { action: 'update', entityType: 'Patient', entityId: patient.id, summary: `Updated patient ${patient.name}` });
    const { portalPin, ...safePatient } = patient.toJSON();
    res.json(safePatient);
  } catch (err) { next(err); }
};

// Admin/receptionist sets (or resets) a patient's portal PIN from the
// patient profile screen. The PIN is hashed with bcrypt before storage,
// exactly like authController does for staff User passwords — the
// plaintext value is never persisted or logged.
exports.setPortalPin = async (req, res, next) => {
  try {
    const patient = await Patient.findByPk(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const { pin, portalEmail } = req.body;
    patient.portalPin = await bcrypt.hash(pin, 10);
    if (portalEmail !== undefined) patient.portalEmail = portalEmail || null;
    await patient.save();
    await logAudit(req, {
      action: 'update', entityType: 'Patient', entityId: patient.id,
      summary: `Set portal PIN for patient ${patient.name}`,
    });
    // Patient.phone has no uniqueness constraint, so portal login has to try
    // every patient sharing a phone number until one's PIN matches — that
    // works correctly as long as each shares a distinct PIN, but staff
    // should know the number isn't unique so they can pick distinguishable
    // PINs (or a different phone) for family members sharing a line.
    const sharedPhoneCount = patient.phone
      ? await Patient.count({ where: { phone: patient.phone, id: { [Op.ne]: patient.id } } })
      : 0;
    res.json({
      message: 'Portal PIN set successfully',
      ...(sharedPhoneCount > 0 && {
        warning: `${sharedPhoneCount} other patient(s) share this phone number. Portal login works as long as their PINs are different — consider using distinguishable PINs.`,
      }),
    });
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
