const express = require('express');
const router = express.Router();
const patientPortalController = require('../controllers/patientPortalController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { patientPortalValidators } = require('../middleware/validators');

// Public: phone + PIN login, issues a JWT scoped to role 'patient'. Rate
// limited separately (see server.js) since a 4-6 digit PIN is a small
// enough search space that login attempts need tighter throttling than the
// general API limiter.
router.post('/login', patientPortalValidators.login, validate, patientPortalController.login);

// Everything below requires a valid 'patient' JWT. This role is deliberately
// excluded from every authorize(...) list on the staff-facing routers, so a
// patient token can't be reused to hit /api/patients, /api/invoices, etc.
router.use(authenticate, authorize('patient'));

router.get('/me', patientPortalController.me);

router.get('/doctors', patientPortalController.listDoctors);
router.get('/doctors/:doctorId/available-slots', patientPortalController.availableSlots);

router.get('/appointments', patientPortalController.listAppointments);
router.post('/appointments', patientPortalValidators.bookAppointment, validate, patientPortalController.bookAppointment);
router.post('/appointments/:id/cancel', patientPortalController.cancelAppointment);

router.get('/medical-records', patientPortalController.listMedicalRecords);
router.get('/invoices', patientPortalController.listInvoices);

module.exports = router;
