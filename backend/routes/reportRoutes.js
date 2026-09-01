const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin', 'receptionist'));

router.get('/patients.csv', reportController.exportPatients);
router.get('/appointments.csv', reportController.exportAppointments);
router.get('/invoices.csv', reportController.exportInvoices);

module.exports = router;
