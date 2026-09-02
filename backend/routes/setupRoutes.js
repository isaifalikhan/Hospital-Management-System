const express = require('express');
const router = express.Router();
const { User } = require('../models');
const seed = require('../utils/seed');

// One-time production bootstrap: creates the schema (via sequelize.sync
// inside seed()) and the demo accounts on a freshly provisioned database
// that has never been seeded (e.g. a new Vercel Postgres instance). Meant
// to be triggered once by hand, then the SETUP_SECRET env var removed —
// delete this file once you've moved past the demo accounts.
//
// Closed by default like routes/cronRoutes.js: refuses to run unless
// SETUP_SECRET is configured and matches, and separately refuses if any
// user already exists so it can never be used to wipe real data.
router.get('/seed', async (req, res) => {
  const secret = process.env.SETUP_SECRET;
  if (!secret) {
    return res.status(501).json({ message: 'SETUP_SECRET is not configured — set it in the environment to enable this endpoint.' });
  }
  const provided = req.headers.authorization === `Bearer ${secret}` ? secret : req.query.secret;
  if (provided !== secret) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const existing = await User.count().catch(() => 0);
  if (existing > 0) {
    return res.status(409).json({ message: `Database already has ${existing} user(s) — refusing to reseed and overwrite existing data.` });
  }

  await seed();
  res.json({ message: 'Database seeded. Login with admin / password123 (see backend/utils/seed.js for the other demo accounts), then remove SETUP_SECRET and this route.' });
});

module.exports = router;
