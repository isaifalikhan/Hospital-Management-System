const { Medicine, StockTransaction, sequelize } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/audit');
const { checkExpiry } = require('../utils/safetyChecks');
const { searchOp } = require('../utils/search');

exports.list = async (req, res, next) => {
  try {
    const { search, lowStock } = req.query;
    const where = {};
    if (search) where.name = { [searchOp]: `%${search}%` };
    let medicines = await Medicine.findAll({ where, order: [['name', 'ASC']] });
    if (lowStock === 'true') {
      medicines = medicines.filter(m => m.quantityInStock <= m.reorderLevel);
    }
    res.json(medicines.map((m) => ({ ...m.toJSON(), expiryStatus: checkExpiry(m.expiryDate) })));
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const medicine = await Medicine.findByPk(req.params.id, {
      include: [{ model: StockTransaction, separate: true, order: [['createdAt', 'DESC']], limit: 50 }],
    });
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    res.json({ ...medicine.toJSON(), expiryStatus: checkExpiry(medicine.expiryDate) });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const medicine = await Medicine.create(req.body);
    res.status(201).json(medicine);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const medicine = await Medicine.findByPk(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    await medicine.update(req.body);
    res.json(medicine);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const medicine = await Medicine.findByPk(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    await medicine.destroy();
    res.json({ message: 'Medicine deleted' });
  } catch (err) { next(err); }
};

exports.adjustStock = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { type, quantity, reason } = req.body;
    if (!['in', 'out'].includes(type)) {
      await t.rollback();
      return res.status(400).json({ message: "type must be 'in' or 'out'" });
    }
    if (!quantity || quantity <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'quantity must be a positive number' });
    }
    const medicine = await Medicine.findByPk(req.params.id, { transaction: t });
    if (!medicine) {
      await t.rollback();
      return res.status(404).json({ message: 'Medicine not found' });
    }
    if (type === 'out' && medicine.quantityInStock < quantity) {
      await t.rollback();
      return res.status(400).json({ message: 'Insufficient stock for this transaction' });
    }

    medicine.quantityInStock += type === 'in' ? Number(quantity) : -Number(quantity);
    await medicine.save({ transaction: t });

    await StockTransaction.create({
      medicineId: medicine.id,
      type,
      quantity,
      reason,
      date: new Date().toISOString().slice(0, 10),
    }, { transaction: t });

    await t.commit();
    await logAudit(req, {
      action: 'update', entityType: 'Medicine', entityId: medicine.id,
      summary: `Stock ${type === 'in' ? 'added to' : 'removed from'} ${medicine.name}: ${quantity} (${reason || 'no reason given'})`,
    });
    res.json(medicine);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
