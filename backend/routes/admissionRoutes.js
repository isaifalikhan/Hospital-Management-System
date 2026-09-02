const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admissionController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { admissionValidators } = require('../middleware/validators');

router.use(authenticate, authorize('admin', 'doctor', 'receptionist'));

router.get('/', admissionController.list);
router.post('/', admissionValidators.create, validate, admissionController.create);
router.put('/:id', admissionController.update);
router.post('/:id/discharge', admissionValidators.discharge, validate, admissionController.discharge);
router.delete('/:id', authorize('admin'), admissionController.remove);

module.exports = router;
