const { LabOrder, Patient, Doctor } = require('../models');
const { logAudit } = require('../utils/audit');
const { deleteAllForEntity } = require('../utils/attachmentStorage');

exports.list = async (req, res, next) => {
  try {
    const { patientId, status } = req.query;
    const where = {};
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    const orders = await LabOrder.findAll({
      where,
      include: [
        { model: Patient, attributes: ['id', 'name', 'mrn'] },
        { model: Doctor, attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(orders);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const order = await LabOrder.findByPk(req.params.id, {
      include: [{ model: Patient }, { model: Doctor }],
    });
    if (!order) return res.status(404).json({ message: 'Lab order not found' });
    res.json(order);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const order = await LabOrder.create(req.body);
    const full = await LabOrder.findByPk(order.id, {
      include: [{ model: Patient, attributes: ['id', 'name'] }, { model: Doctor, attributes: ['id', 'name'] }],
    });
    await logAudit(req, {
      action: 'create', entityType: 'LabOrder', entityId: order.id,
      summary: `Ordered ${order.testName} for patient #${order.patientId}`,
    });
    res.status(201).json(full);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const order = await LabOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Lab order not found' });
    await order.update(req.body);
    await logAudit(req, {
      action: 'update', entityType: 'LabOrder', entityId: order.id,
      summary: `Updated ${order.testName} (status: ${order.status})`,
    });
    res.json(order);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const order = await LabOrder.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Lab order not found' });
    await order.destroy();
    await deleteAllForEntity('LabOrder', req.params.id);
    await logAudit(req, { action: 'delete', entityType: 'LabOrder', entityId: req.params.id });
    res.json({ message: 'Lab order deleted' });
  } catch (err) { next(err); }
};
