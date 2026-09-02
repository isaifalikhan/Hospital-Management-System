const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { aiValidators } = require('../middleware/validators');

// Gated to the roles that can write discharge notes (admin/doctor/receptionist,
// see admissionRoutes.js) or medical record notes (admin/doctor, see
// medicalRecordRoutes.js) — the union of both, since this one endpoint feeds
// both "Generate Summary" buttons.
router.use(authenticate, authorize('admin', 'doctor', 'receptionist'));

router.post('/summary', aiValidators.summary, validate, aiController.summary);

module.exports = router;
