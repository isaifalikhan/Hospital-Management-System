const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { dashboardValidators } = require('../middleware/validators');

router.use(authenticate, authorize('admin', 'receptionist'));

router.get('/patients.csv', reportController.exportPatients);
router.get('/appointments.csv', reportController.exportAppointments);
router.get('/invoices.csv', reportController.exportInvoices);
router.get('/owner-insights.csv', authorize('admin'), dashboardValidators.ownerInsights, validate, reportController.exportOwnerInsights);

module.exports = router;
