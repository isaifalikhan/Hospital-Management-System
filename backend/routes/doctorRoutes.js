const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { doctorValidators, appointmentValidators } = require('../middleware/validators');

router.use(authenticate);

router.get('/', doctorController.list);
router.get('/:id', doctorController.get);
router.get('/:id/available-slots', appointmentValidators.availableSlots, validate, doctorController.availableSlots);
router.post('/', authorize('admin'), doctorValidators.create, validate, doctorController.create);
router.put('/:id', authorize('admin'), doctorController.update);
router.delete('/:id', authorize('admin'), doctorController.remove);

module.exports = router;
