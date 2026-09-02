const { StaffAttendance, User } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/audit');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

exports.clockIn = async (req, res, next) => {
  try {
    const open = await StaffAttendance.findOne({
      where: { userId: req.user.id, clockOut: null },
    });
    if (open) {
      return res.status(409).json({ message: 'You are already clocked in. Clock out first.' });
    }
    const record = await StaffAttendance.create({
      userId: req.user.id,
      date: todayStr(),
      clockIn: new Date(),
    });
    await logAudit(req, {
      action: 'create', entityType: 'StaffAttendance', entityId: record.id,
      summary: `${req.user.name} clocked in`,
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
};

exports.clockOut = async (req, res, next) => {
  try {
    const record = await StaffAttendance.findOne({
      where: { userId: req.user.id, clockOut: null },
      order: [['clockIn', 'DESC']],
    });
    if (!record) {
      return res.status(400).json({ message: 'No active clock-in found. Clock in first.' });
    }
    record.clockOut = new Date();
    await record.save();
    await logAudit(req, {
      action: 'update', entityType: 'StaffAttendance', entityId: record.id,
      summary: `${req.user.name} clocked out`,
    });
    res.json(record);
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const { userId, from, to } = req.query;
    const where = {};
    // Admins can see (and filter by) anyone's attendance; every other role
    // only ever sees their own records, regardless of what's in the query.
    if (req.user.role === 'admin') {
      if (userId) where.userId = userId;
    } else {
      where.userId = req.user.id;
    }
    if (from && to) where.date = { [Op.between]: [from, to] };
    else if (from) where.date = { [Op.gte]: from };
    else if (to) where.date = { [Op.lte]: to };

    const records = await StaffAttendance.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'name', 'role'] }],
      order: [['date', 'DESC'], ['clockIn', 'DESC']],
    });
    res.json(records);
  } catch (err) { next(err); }
};
