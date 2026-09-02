const { Invoice, InvoiceItem, Patient, Appointment } = require('../models');
const { sequelize } = require('../models');
const { logAudit } = require('../utils/audit');

function generateInvoiceNumber() {
  const ts = Date.now().toString().slice(-8);
  return `INV${ts}`;
}

function computeTotals(items, discount = 0, tax = 0) {
  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unitPrice)), 0);
  const total = subtotal - Number(discount || 0) + Number(tax || 0);
  return { subtotal, total: Math.max(total, 0) };
}

// UPI (India) "scan to pay" nudge: when the hospital has configured UPI_ID,
// attach a ready-to-encode upi://pay deep link for the invoice's outstanding
// balance so the frontend can render a QR code on the invoice view. This is
// a payment *nudge* only, not a live payment integration — front desk still
// records the actual payment via POST /:id/payments.
function attachUpiPaymentUri(invoiceInstance) {
  const data = invoiceInstance.toJSON();
  const upiId = process.env.UPI_ID && process.env.UPI_ID.trim();
  const balanceDue = Number(data.total) - Number(data.amountPaid);
  if (upiId && balanceDue > 0 && data.status !== 'cancelled') {
    const params = [
      `pa=${encodeURIComponent(upiId)}`,
      `pn=${encodeURIComponent('MediCare HMS')}`,
      `am=${encodeURIComponent(balanceDue.toFixed(2))}`,
      'cu=INR',
      `tn=${encodeURIComponent(`Invoice ${data.invoiceNumber}`)}`,
    ];
    data.upiPaymentUri = `upi://pay?${params.join('&')}`;
  }
  return data;
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
    res.json(invoices.map(attachUpiPaymentUri));
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [{ model: Patient }, { model: InvoiceItem }, { model: Appointment }],
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(attachUpiPaymentUri(invoice));
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

    await logAudit(req, {
      action: 'create', entityType: 'Invoice', entityId: invoice.id,
      summary: `Created invoice ${invoice.invoiceNumber} for patient #${patientId} ($${total.toFixed(2)})`,
    });

    const full = await Invoice.findByPk(invoice.id, {
      include: [{ model: Patient, attributes: ['id', 'name', 'mrn'] }, { model: InvoiceItem }],
    });
    res.status(201).json(attachUpiPaymentUri(full));
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
    await logAudit(req, {
      action: 'update', entityType: 'Invoice', entityId: invoice.id,
      summary: `Recorded payment of $${Number(amount).toFixed(2)} on ${invoice.invoiceNumber}`,
    });
    res.json(attachUpiPaymentUri(invoice));
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    const { notes, status } = req.body;
    if (notes !== undefined) invoice.notes = notes;
    if (status !== undefined) {
      // unpaid/partially_paid/paid are derived from amountPaid by
      // recordPayment; allowing them here would let status say "paid"
      // while amountPaid stays untouched. 'cancelled' is the only
      // legitimate manual override.
      if (status !== 'cancelled') {
        return res.status(400).json({
          message: "status can only be set to 'cancelled' here. Paid/partially paid/unpaid are derived automatically from recorded payments — use POST /:id/payments.",
        });
      }
      invoice.status = status;
    }
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
