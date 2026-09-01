const { MedicalRecord, Patient, Doctor, Appointment } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const { patientId, doctorId } = req.query;
    const where = {};
    if (patientId) where.patientId = patientId;
    if (doctorId) where.doctorId = doctorId;
    const records = await MedicalRecord.findAll({
      where,
      include: [
        { model: Patient, attributes: ['id', 'name', 'mrn'] },
        { model: Doctor, attributes: ['id', 'name'] },
      ],
      order: [['date', 'DESC']],
    });
    res.json(records);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findByPk(req.params.id, {
      include: [{ model: Patient }, { model: Doctor }, { model: Appointment }],
    });
    if (!record) return res.status(404).json({ message: 'Medical record not found' });
    res.json(record);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    const record = await MedicalRecord.create(req.body);

    if (req.body.appointmentId) {
      await Appointment.update(
        { status: 'completed' },
        { where: { id: req.body.appointmentId } }
      );
    }

    const full = await MedicalRecord.findByPk(record.id, {
      include: [{ model: Patient, attributes: ['id', 'name'] }, { model: Doctor, attributes: ['id', 'name'] }],
    });
    res.status(201).json(full);
  } catch (err) { next(err); }
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
    res.json({ message: 'Medical record deleted' });
  } catch (err) { next(err); }
};
