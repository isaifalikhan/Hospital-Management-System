const { MedicalRecord, Patient, Doctor, Appointment, PrescriptionItem, Medicine, sequelize } = require('../models');
const { logAudit } = require('../utils/audit');

const recordIncludes = [
  { model: Patient, attributes: ['id', 'name', 'mrn'] },
  { model: Doctor, attributes: ['id', 'name'] },
  { model: PrescriptionItem },
];

exports.list = async (req, res, next) => {
  try {
    const { patientId, doctorId } = req.query;
    const where = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    const records = await MedicalRecord.findAll({
      where,
      include: recordIncludes,
      order: [['date', 'DESC']],
    });
    res.json(records);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findByPk(req.params.id, {
      include: [{ model: Patient }, { model: Doctor }, { model: Appointment }, { model: PrescriptionItem }],
    });
    if (!record) return res.status(404).json({ message: 'Medical record not found' });
    res.json(record);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { patientId, prescriptionItems = [] } = req.body;
    if (!patientId) {
      await t.rollback();
      return res.status(400).json({ message: 'patientId is required' });
    }
    const record = await MedicalRecord.create(req.body, { transaction: t });

    if (prescriptionItems.length) {
      await PrescriptionItem.bulkCreate(
        prescriptionItems.map((item) => ({ ...item, medicalRecordId: record.id })),
        { transaction: t }
      );
    }

    if (req.body.appointmentId) {
      await Appointment.update(
        { status: 'completed' },
        { where: { id: req.body.appointmentId }, transaction: t }
      );
    }

    await t.commit();

    await logAudit(req, {
      action: 'create', entityType: 'MedicalRecord', entityId: record.id,
      summary: `Added medical record for patient #${patientId}`,
    });

    const full = await MedicalRecord.findByPk(record.id, { include: recordIncludes });
    res.status(201).json(full);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: 'Medical record not found' });
    await record.update(req.body);
    res.json(record);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: 'Medical record not found' });
    await record.destroy();
    await logAudit(req, { action: 'delete', entityType: 'MedicalRecord', entityId: req.params.id });
    res.json({ message: 'Medical record deleted' });
  } catch (err) { next(err); }
};

// Pharmacist marks a prescription item as dispensed, decrementing real
// inventory stock when the item is linked to a known Medicine.
exports.dispensePrescriptionItem = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const item = await PrescriptionItem.findByPk(req.params.itemId, { transaction: t });
    if (!item) {
      await t.rollback();
      return res.status(404).json({ message: 'Prescription item not found' });
    }
    if (item.dispensed) {
      await t.rollback();
      return res.status(400).json({ message: 'This item has already been dispensed' });
    }

    if (item.medicineId) {
      const medicine = await Medicine.findByPk(item.medicineId, { transaction: t });
      if (medicine) {
        if (medicine.quantityInStock < item.quantity) {
          await t.rollback();
          return res.status(400).json({ message: `Insufficient stock for ${medicine.name}` });
        }
        medicine.quantityInStock -= item.quantity;
        await medicine.save({ transaction: t });
      }
    }

    item.dispensed = true;
    item.dispensedAt = new Date();
    await item.save({ transaction: t });

    await t.commit();
    await logAudit(req, {
      action: 'update', entityType: 'PrescriptionItem', entityId: item.id,
      summary: `Dispensed ${item.medicineName} (qty ${item.quantity})`,
    });
    res.json(item);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
