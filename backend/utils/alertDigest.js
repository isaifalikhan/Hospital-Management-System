const { Op } = require('sequelize');
const { Medicine, Invoice, Patient, User } = require('../models');
const { sendEmail } = require('./emailService');

// Same threshold used for the existing low-stock badge on the pharmacy page.
function isLowStock(m) {
  return m.quantityInStock <= m.reorderLevel;
}

// An invoice counts as overdue once it's more than this many days past its
// own date and still has a balance outstanding.
const OVERDUE_DAYS = 3;

function isOverdue(inv) {
  if (inv.status === 'paid' || inv.status === 'cancelled') return false;
  const ageDays = (Date.now() - new Date(inv.date)) / 86400000;
  return ageDays > OVERDUE_DAYS;
}

async function gatherAlerts() {
  const [medicines, invoices] = await Promise.all([
    Medicine.findAll(),
    Invoice.findAll({
      where: { status: { [Op.in]: ['unpaid', 'partially_paid'] } },
      include: [{ model: Patient, attributes: ['name'] }],
    }),
  ]);

  return {
    lowStock: medicines.filter(isLowStock),
    overdueInvoices: invoices.filter(isOverdue),
  };
}

function buildDigestText({ lowStock, overdueInvoices }) {
  const lines = [`MediCare HMS — Daily Alert Digest (${new Date().toISOString().slice(0, 10)})`, ''];

  if (lowStock.length) {
    lines.push(`LOW STOCK (${lowStock.length}):`);
    lowStock.forEach((m) => lines.push(`  - ${m.name}: ${m.quantityInStock} left (reorder at ${m.reorderLevel})`));
    lines.push('');
  }

  if (overdueInvoices.length) {
    const totalOutstanding = overdueInvoices.reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0);
    lines.push(`OVERDUE INVOICES (${overdueInvoices.length}, $${totalOutstanding.toFixed(2)} outstanding):`);
    overdueInvoices.forEach((inv) => {
      const balance = (inv.total - inv.amountPaid).toFixed(2);
      lines.push(`  - ${inv.invoiceNumber} (${inv.Patient?.name || 'Unknown patient'}): $${balance} outstanding, dated ${inv.date}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

// Sends a daily digest to every active admin with an email on file — skips
// sending (and just logs it was skipped) when there's nothing to report, so
// admins aren't spammed with empty emails every day.
async function sendAlertDigest() {
  try {
    const { lowStock, overdueInvoices } = await gatherAlerts();
    if (!lowStock.length && !overdueInvoices.length) {
      console.log('[alertDigest] Nothing to report today — skipping digest.');
      return { sent: false, reason: 'nothing to report', lowStockCount: 0, overdueCount: 0 };
    }

    const admins = await User.findAll({ where: { role: 'admin', active: true } });
    const text = buildDigestText({ lowStock, overdueInvoices });
    const subject = `HMS Alert Digest: ${lowStock.length} low stock, ${overdueInvoices.length} overdue invoice(s)`;

    let sentTo = 0;
    for (const admin of admins) {
      if (!admin.email) {
        console.log(`[alertDigest] Admin ${admin.username} has no email on file — skipping.`);
        continue;
      }
      await sendEmail({ to: admin.email, subject, text });
      sentTo += 1;
    }

    console.log(`[alertDigest] Digest sent to ${sentTo} admin(s): ${lowStock.length} low stock, ${overdueInvoices.length} overdue invoice(s).`);
    return { sent: true, sentTo, lowStockCount: lowStock.length, overdueCount: overdueInvoices.length };
  } catch (err) {
    console.error('[alertDigest] Failed to send alert digest:', err.message);
    return { sent: false, reason: err.message };
  }
}

let intervalHandle = null;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day

// Same setInterval pattern as reminderScheduler.js — only keeps running for
// the local/LAN single-process deployment; Vercel uses the "crons" entry in
// vercel.json (routes/cronRoutes.js) instead, since a stateless serverless
// function can't keep a setInterval alive between invocations.
//
// Unlike reminderScheduler, this deliberately does NOT also fire once on
// boot: a 15-minute reminder check catching up after a restart is harmless,
// but a "daily" digest firing on every dev-server restart would spam admins
// far more often than once a day.
function startAlertScheduler() {
  if (intervalHandle) return;
  intervalHandle = setInterval(sendAlertDigest, CHECK_INTERVAL_MS);
  if (intervalHandle.unref) intervalHandle.unref();
}

module.exports = { sendAlertDigest, startAlertScheduler, gatherAlerts };
