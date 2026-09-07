const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { appointmentValidators } = require('../middleware/validators');

router.use(authenticate);

// Readable by every logged-in role — a visit's doctor, reason and queue token
// are part of the reception record staff print on the registration slip, and
// neither listing carries clinical detail. Writing to the schedule stays with
// the roles that ran it before.
router.get('/', appointmentController.list);
router.get('/:id', appointmentController.get);

router.use(authorize('admin', 'doctor', 'receptionist'));

router.post('/', authorize('admin', 'receptionist'), appointmentValidators.create, validate, appointmentController.create);
router.put('/:id', appointmentController.update);
router.delete('/:id', authorize('admin', 'receptionist'), appointmentController.remove);

module.exports = router;
