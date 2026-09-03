const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const doctorController = require('../controllers/doctorController');
const validate = require('../middleware/validate');
const { appointmentValidators, publicValidators } = require('../middleware/validators');

// Deliberately NO authenticate/authorize here — this is the public, no-login
// booking flow (walk-in web visitors). It's the only surface in the app
// reachable without a JWT, so every field is validated defensively
// (see publicValidators.book) and the write endpoint is additionally
// rate-limited in server.js (publicBookingLimiter) on top of the general
// per-IP limiter that already applies to all of /api.

router.get('/doctors', publicController.listDoctors);

// Same handler as the authenticated GET /api/doctors/:id/available-slots —
// reused as-is so a walk-in only ever sees genuinely open slots.
router.get('/doctors/:id/available-slots', appointmentValidators.availableSlots, validate, doctorController.availableSlots);

router.post('/appointments', publicValidators.book, validate, publicController.book);

// Waiting-room queue board — no auth, no patient names (see
// publicController.queue for what it deliberately omits).
router.get('/queue', publicValidators.queue, validate, publicController.queue);

module.exports = router;
