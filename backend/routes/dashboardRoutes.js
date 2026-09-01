const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/summary', dashboardController.summary);
router.get('/analytics', dashboardController.analytics);

module.exports = router;
