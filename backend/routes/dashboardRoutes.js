const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { dashboardValidators } = require('../middleware/validators');

router.use(authenticate);
router.get('/summary', dashboardController.summary);
router.get('/analytics', dashboardController.analytics);
router.get('/owner-insights', authorize('admin'), dashboardValidators.ownerInsights, validate, dashboardController.ownerInsights);

module.exports = router;
