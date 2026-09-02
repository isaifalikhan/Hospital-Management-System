const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/auth');

// Any authenticated staff member can clock in/out and view attendance;
// role-based scoping (admin sees everyone, others see only their own) is
// enforced inside the controller.
router.use(authenticate);

router.get('/', attendanceController.list);
router.post('/clock-in', attendanceController.clockIn);
router.post('/clock-out', attendanceController.clockOut);

module.exports = router;
