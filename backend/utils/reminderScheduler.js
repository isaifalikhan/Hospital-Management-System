const { Op } = require('sequelize');
const { Appointment, Patient, Doctor } = require('../models');
const { sendEmail } = require('./emailService');

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // run every ~15 minutes
const WINDOW_START_HOURS = 24; // remind for appointments 24-26h out...
const WINDOW_END_HOURS = 26;   // ...a 2h band so a 15-min poll can't skip one

// Appointment.date is DATEONLY ("YYYY-MM-DD") and Appointment.time is a
// plain "HH:MM" string (see backend/models/Appointment.js), so combine them
// into a real Date in JS rather than relying on dialect-specific date/time
// arithmetic in SQL (this needs to work unchanged on SQLite and Postgres).
function combineDateTime(dateStr, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d;
}

async function sendDueReminders() {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + WINDOW_START_HOURS * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + WINDOW_END_HOURS * 60 * 60 * 1000);

    // Narrow with a coarse, dialect-agnostic date-range query first, then
    // filter precisely to the combined date+time window in JS.
    const fromDate = windowStart.toISOString().slice(0, 10);
    const toDate = windowEnd.toISOString().slice(0, 10);

    const candidates = await Appointment.findAll({
      where: {
        status: 'scheduled',
        reminderSentAt: null,
        date: { [Op.between]: [fromDate, toDate] },
      },
      include: [
        { model: Patient, attributes: ['id', 'name', 'email', 'phone'] },
        { model: Doctor, attributes: ['id', 'name'] },
      ],
    });

    const due = candidates.filter((appt) => {
      const when = combineDateTime(appt.date, appt.time);
      return when >= windowStart && when <= windowEnd;
    });

    for (const appt of due) {
      const patientEmail = appt.Patient?.email;
      const doctorName = appt.Doctor?.name || 'your doctor';
      const subject = `Reminder: appointment on ${appt.date} at ${appt.time}`;
      const text =
        `Hi ${appt.Patient?.name || 'there'},\n\n` +
        `This is a reminder of your upcoming appointment with Dr. ${doctorName} on ${appt.date} at ${appt.time}.\n\n` +
        `If you need to reschedule or cancel, please contact the hospital.\n\n` +
        `— MediCare HMS`;

      if (patientEmail) {
        await sendEmail({ to: patientEmail, subject, text });
      } else {
        console.log(`[reminderScheduler] Appointment #${appt.id} has no patient email on file — skipping reminder email.`);
      }

      // Mark as reminded regardless of whether an email address was on file,
      // so we don't re-evaluate (and re-log) the same appointment every poll.
      appt.reminderSentAt = new Date();
      await appt.save();
    }

    if (due.length) {
      console.log(`[reminderScheduler] Processed ${due.length} appointment reminder(s).`);
    }
  } catch (err) {
    console.error('[reminderScheduler] Failed to process reminders:', err.message);
  }
}

let intervalHandle = null;

// Plain setInterval — no cron dependency needed for a 15-minute poll. Note
// this only works while the process stays alive (the local/LAN "single
// process" deployment); it's a no-op in between invocations of a stateless
// serverless deployment (e.g. Vercel functions), since nothing keeps a
// setInterval alive across separate function invocations there.
function startReminderScheduler() {
  if (intervalHandle) return; // idempotent — never stack multiple intervals
  sendDueReminders(); // also run once on boot so a restart doesn't wait up to 15 min
  intervalHandle = setInterval(sendDueReminders, CHECK_INTERVAL_MS);
  if (intervalHandle.unref) intervalHandle.unref();
}

module.exports = { startReminderScheduler, sendDueReminders };
