const { LabOrder, LabTest, Patient, Doctor, Invoice, InvoiceItem, sequelize } = require('../models');
const { logAudit } = require('../utils/audit');
const { deleteAllForEntity } = require('../utils/attachmentStorage');
const { generateInvoiceNumber } = require('../utils/billing');

// What reception needs to take payment and the lab needs to see whether a
// test has been paid for. Kept to the billing columns — the invoice's own
// line items live behind the Billing screen.
const INVOICE_SUMMARY = ['id', 'invoiceNumber', 'total', 'amountPaid', 'status', 'date'];

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
        { model: Invoice, attributes: INVOICE_SUMMARY },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(orders);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const order = await LabOrder.findByPk(req.params.id, {
      include: [
        { model: Patient, attributes: { exclude: ['portalPin'] } },
        { model: Doctor },
        { model: Invoice, attributes: INVOICE_SUMMARY },
      ],
    });
    if (!order) return res.status(404).json({ message: 'Lab order not found' });
    res.json(order);
  } catch (err) { next(err); }
};

// Ordering a test also raises its bill: one invoice with a single 'lab' line
// item, linked back to the order. That's what puts the charge in front of
// reception (Billing) and tells the lab whether the patient has paid — both
// read it off the same invoice, so there's no second place to keep in sync.
// Order and invoice are created in one transaction: a test that failed to
// bill, or a bill with no test behind it, would both be worse than an error.
exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { labTestId } = req.body;
    const payload = { ...req.body };

    // The catalogue is the source of truth for the name and price, but an
    // explicit price in the request still wins so the desk can waive or
    // discount a test without editing the catalogue for everyone.
    if (labTestId) {
      const test = await LabTest.findByPk(labTestId, { transaction: t });
      if (!test) {
        await t.rollback();
        return res.status(400).json({ message: 'Lab test not found in the catalogue' });
      }
      payload.testName = test.name;
      payload.referenceRange = payload.referenceRange || test.referenceRange;
      if (payload.price === undefined || payload.price === '') payload.price = test.price;
    }
    payload.price = Number(payload.price) || 0;

    const order = await LabOrder.create(payload, { transaction: t });

    // A free test (price 0, e.g. a waived or camp test) gets no invoice —
    // an unpaid Rs. 0.00 bill would just be noise on the billing queue.
    if (order.price > 0) {
      const invoice = await Invoice.create({
        invoiceNumber: generateInvoiceNumber(),
        patientId: order.patientId,
        date: new Date().toISOString().slice(0, 10),
        subtotal: order.price,
        discount: 0,
        tax: 0,
        total: order.price,
        status: 'unpaid',
        notes: `Lab test: ${order.testName}`,
      }, { transaction: t });

      await InvoiceItem.create({
        invoiceId: invoice.id,
        description: order.testName,
        category: 'lab',
        quantity: 1,
        unitPrice: order.price,
        amount: order.price,
      }, { transaction: t });

      order.invoiceId = invoice.id;
      await order.save({ transaction: t });
    }

    await t.commit();

    const full = await LabOrder.findByPk(order.id, {
      include: [
        { model: Patient, attributes: ['id', 'name'] },
        { model: Doctor, attributes: ['id', 'name'] },
        { model: Invoice, attributes: INVOICE_SUMMARY },
      ],
    });
    await logAudit(req, {
      action: 'create', entityType: 'LabOrder', entityId: order.id,
      summary: order.invoiceId
        ? `Ordered ${order.testName} for patient #${order.patientId} — billed Rs. ${order.price.toFixed(2)}`
        : `Ordered ${order.testName} for patient #${order.patientId}`,
    });
    res.status(201).json(full);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// Payment comes before the test: reception collects, then the patient walks
// to the lab. Enforced for the 'lab' role only — admins and the ordering
// doctor can still push a test through ahead of payment for an emergency or
// a waived charge, which is a call the bench shouldn't be making alone.
const WORK_STATUSES = ['in_progress', 'completed'];

exports.update = async (req, res, next) => {
  try {
    const order = await LabOrder.findByPk(req.params.id, { include: [{ model: Invoice }] });
    if (!order) return res.status(404).json({ message: 'Lab order not found' });

    if (
      req.user.role === 'lab'
      && WORK_STATUSES.includes(req.body.status)
      && order.Invoice
      && order.Invoice.status !== 'paid'
    ) {
      return res.status(403).json({
        message: `Payment not collected for ${order.testName} (${order.Invoice.invoiceNumber}). Ask the patient to pay at reception first.`,
      });
    }

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
