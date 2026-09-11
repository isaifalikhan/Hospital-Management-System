const { LabTest } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../utils/audit');
const { searchOp } = require('../utils/search');

exports.list = async (req, res, next) => {
  try {
    const { search, activeOnly } = req.query;
    const where = {};
    // activeOnly is what the order form passes: retired tests stay readable
    // for the orders that already reference them, but shouldn't be offered.
    if (activeOnly === 'true') where.active = true;
    if (search) where.name = { [searchOp]: `%${search}%` };
    const tests = await LabTest.findAll({ where, order: [['name', 'ASC']] });
    res.json(tests);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const test = await LabTest.create(req.body);
    await logAudit(req, {
      action: 'create', entityType: 'LabTest', entityId: test.id,
      summary: `Added lab test ${test.name} at Rs. ${Number(test.price).toFixed(2)}`,
    });
    res.status(201).json(test);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'A lab test with that name already exists' });
    }
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const test = await LabTest.findByPk(req.params.id);
    if (!test) return res.status(404).json({ message: 'Lab test not found' });
    await test.update(req.body);
    await logAudit(req, {
      action: 'update', entityType: 'LabTest', entityId: test.id,
      summary: `Updated lab test ${test.name} (Rs. ${Number(test.price).toFixed(2)})`,
    });
    res.json(test);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'A lab test with that name already exists' });
    }
    next(err);
  }
};

// Orders already raised against this test keep their copied name and price —
// the association is ON DELETE SET NULL (see models/index.js), so removing a
// test from the catalogue never rewrites billing history.
exports.remove = async (req, res, next) => {
  try {
    const test = await LabTest.findByPk(req.params.id);
    if (!test) return res.status(404).json({ message: 'Lab test not found' });
    await test.destroy();
    await logAudit(req, {
      action: 'delete', entityType: 'LabTest', entityId: req.params.id,
      summary: `Removed lab test ${test.name}`,
    });
    res.json({ message: 'Lab test deleted' });
  } catch (err) { next(err); }
};
