const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { authenticate, authorize } = require('../middleware/auth');

// Admin-only: downloads a full backup of the system's data (SQLite file
// snapshot, or a JSON export of every table when running on Postgres).
router.use(authenticate, authorize('admin'));

router.get('/backup', backupController.download);
router.post('/alert-digest', backupController.sendAlertDigestNow);

module.exports = router;
