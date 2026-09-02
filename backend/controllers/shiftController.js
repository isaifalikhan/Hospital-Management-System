const { Shift, User } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/audit');

exports.list = async (req, res, next) => {
  try {
    const { userId, from, to } = req.query;
    const where = {};
    // Admins see (and can filter by) the whole roster; every other role only
    // ever sees their own upcoming shifts, regardless of what's in the query.
    if (req.user.role === 'admin') {
      if (userId) where.userId = userId;
    } else {
      where.userId = req.user.id;
    }
    if (from && to) where.date = { [Op.between]: [from, to] };
    else if (from) where.date = { [Op.gte]: from };
    else if (to) where.date = { [Op.lte]: to };

    const shifts = await Shift.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'name', 'role'] }],
      order: [['date', 'ASC'], ['startTime', 'ASC']],
    });
    res.json(shifts);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { userId, date, startTime, endTime, note } = req.body;
    const shift = await Shift.create({ userId, date, startTime, endTime, note });
    const full = await Shift.findByPk(shift.id, { include: [{ model: User, attributes: ['id', 'name', 'role'] }] });
    await logAudit(req, {
      action: 'create', entityType: 'Shift', entityId: shift.id,
      summary: `Scheduled shift for user #${userId} on ${date} (${startTime}-${endTime})`,
    });
    res.status(201).json(full);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ message: 'Shift not found' });
    const { userId, date, startTime, endTime, note } = req.body;
    if (userId !== undefined) shift.userId = userId;
    if (date !== undefined) shift.date = date;
    if (startTime !== undefined) shift.startTime = startTime;
    if (endTime !== undefined) shift.endTime = endTime;
    if (note !== undefined) shift.note = note;
    await shift.save();
    const full = await Shift.findByPk(shift.id, { include: [{ model: User, attributes: ['id', 'name', 'role'] }] });
    await logAudit(req, { action: 'update', entityType: 'Shift', entityId: shift.id, summary: `Updated shift #${shift.id}` });
    res.json(full);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const shift = await Shift.findByPk(req.params.id);
    if (!shift) return res.status(404).json({ message: 'Shift not found' });
    await shift.destroy();
    await logAudit(req, { action: 'delete', entityType: 'Shift', entityId: req.params.id });
    res.json({ message: 'Shift deleted' });
  } catch (err) { next(err); }
};
