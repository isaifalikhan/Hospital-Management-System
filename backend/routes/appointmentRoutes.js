const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { appointmentValidators } = require('../middleware/validators');

router.use(authenticate, authorize('admin', 'doctor', 'receptionist'));

router.get('/', appointmentController.list);
router.get('/:id', appointmentController.get);
router.post('/', authorize('admin', 'receptionist'), appointmentValidators.create, validate, appointmentController.create);
router.put('/:id', appointmentController.update);
router.delete('/:id', authorize('admin', 'receptionist'), appointmentController.remove);

module.exports = router;
