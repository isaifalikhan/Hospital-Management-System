const { Invoice, InvoiceItem, Patient, Appointment } = require('../models');
const { sequelize } = require('../models');

function generateInvoiceNumber() {
  const ts = Date.now().toString().slice(-8);
  return `INV${ts}`;
}

function computeTotals(items, discount = 0, tax = 0) {
  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unitPrice)), 0);
  const total = subtotal - Number(discount || 0) + Number(tax || 0);
  return { subtotal, total: Math.max(total, 0) };
}

exports.list = async (req, res, next) => {
  try {
    const { patientId, status } = req.query;
    const where = {};
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    const invoices = await Invoice.findAll({
      where,
      include: [{ model: Patient, attributes: ['id', 'name', 'mrn'] }, { model: InvoiceItem }],
      order: [['createdAt', 'DESC']],
    });
    res.json(invoices);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [{ model: Patient }, { model: InvoiceItem }, { model: Appointment }],
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { patientId, appointmentId, items = [], discount = 0, tax = 0, notes, date } = req.body;
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    if (!items.length) return res.status(400).json({ message: 'At least one invoice item is required' });

    const itemsWithAmount = items.map(it => ({
      ...it,
      amount: Number(it.quantity) * Number(it.unitPrice),
    }));
    const { subtotal, total } = computeTotals(itemsWithAmount, discount, tax);

    const invoice = await Invoice.create({
      invoiceNumber: generateInvoiceNumber(),
      patientId,
      appointmentId: appointmentId || null,
      date: date || new Date().toISOString().slice(0, 10),
      subtotal,
      discount,
      tax,
      total,
      status: 'unpaid',
      notes,
    }, { transaction: t });

    await InvoiceItem.bulkCreate(
      itemsWithAmount.map(it => ({ ...it, invoiceId: invoice.id })),
      { transaction: t }
    );

    await t.commit();

    const full = await Invoice.findByPk(invoice.id, {
      include: [{ model: Patient, attributes: ['id', 'name', 'mrn'] }, { model: InvoiceItem }],
    });
    res.status(201).json(full);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const { amount, paymentMethod } = req.body;
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (!amount || amount <= 0) return res.status(400).json({ message: 'A positive payment amount is required' });

    invoice.amountPaid = Number(invoice.amountPaid) + Number(amount);
    invoice.paymentMethod = paymentMethod || invoice.paymentMethod;
    if (invoice.amountPaid >= invoice.total) {
      invoice.status = 'paid';
      invoice.amountPaid = invoice.total;
    } else if (invoice.amountPaid > 0) {
      invoice.status = 'partially_paid';
    }
    await invoice.save();
    res.json(invoice);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const { notes, status } = req.body;
    if (notes !== undefined) invoice.notes = notes;
    if (status !== undefined) invoice.status = status;
    await invoice.save();
    res.json(invoice);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    await invoice.destroy();
    res.json({ message: 'Invoice deleted' });
  } catch (err) { next(err); }
};
