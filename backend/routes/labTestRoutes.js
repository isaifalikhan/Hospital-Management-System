const express = require('express');
const router = express.Router();
const labTestController = require('../controllers/labTestController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { labTestValidators } = require('../middleware/validators');

router.use(authenticate);

// Readable by everyone who works with test bills: doctors pick from the
// catalogue when ordering, reception quotes and collects the fee, and the
// lab checks what was charged. Only admins maintain the price list.
router.get('/', authorize('admin', 'doctor', 'receptionist'), labTestController.list);

router.use(authorize('admin'));

router.post('/', labTestValidators.create, validate, labTestController.create);
router.put('/:id', labTestValidators.update, validate, labTestController.update);
router.delete('/:id', labTestController.remove);

module.exports = router;
