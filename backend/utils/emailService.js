const nodemailer = require('nodemailer');

let transporter; // lazily created, memoized — undefined until first checked, null if unconfigured
let loggedFallbackNotice = false;

function getTransporter() {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) {
    transporter = null; // zero-config fallback: callers log instead of sending
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transporter;
}

/**
 * Sends an email if SMTP_HOST (and friends) are configured in the
 * environment; otherwise logs the would-be email to the console instead of
 * throwing, so email-dependent features (appointment reminders, etc.) work
 * out of the box with zero setup. Never throws — email delivery is a
 * best-effort side channel and must not break whatever triggered it.
 */
async function sendEmail({ to, subject, text, html }) {
  if (!to) return { sent: false, reason: 'no recipient email on file' };

  const t = getTransporter();
  if (!t) {
    if (!loggedFallbackNotice) {
      console.log(
        '[emailService] SMTP_HOST is not configured — emails will be logged here instead of sent. ' +
        'Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM in backend/.env to send real email.'
      );
      loggedFallbackNotice = true;
    }
    console.log(`[emailService] Would send email to ${to}\nSubject: ${subject}\n${text}`);
    return { sent: false, reason: 'SMTP not configured' };
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@medicare-hms.local',
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error(`[emailService] Failed to send email to ${to}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendEmail };
