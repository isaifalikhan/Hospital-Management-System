const express = require('express');
const router = express.Router();
const { sendDueReminders } = require('../utils/reminderScheduler');

// Triggered by Vercel Cron (see the "crons" entry in vercel.json) on a
// schedule, since a stateless serverless deployment can't keep the
// setInterval-based scheduler (utils/reminderScheduler.js) alive between
// invocations the way the local/LAN single-process deployment can — this
// gives the same reminder logic a way to run there too.
//
// Vercel signs cron requests with `Authorization: Bearer ${CRON_SECRET}`
// (see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs),
// so this route refuses to do anything unless CRON_SECRET is configured and
// the header matches — closed by default rather than open to anyone who
// finds the URL.
router.get('/reminders', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(501).json({ message: 'CRON_SECRET is not configured — set it in the environment to enable this endpoint.' });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  await sendDueReminders();
  res.json({ message: 'Reminders processed' });
});

module.exports = router;
