const { AuditLog } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const { entityType, action, limit } = req.query;
    const where = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    const logs = await AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: limit ? Math.min(Number(limit), 500) : 200,
    });
    res.json(logs);
  } catch (err) { next(err); }
};
