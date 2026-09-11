const express = require('express');
const router = express.Router();
const labOrderController = require('../controllers/labOrderController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { labOrderValidators } = require('../middleware/validators');

router.use(authenticate);

// Reception reads the queue too — every order carries the test's bill, and
// the front desk is who collects it. Ordering tests and entering results
// stay with the clinical/lab side.
router.get('/', authorize('admin', 'doctor', 'receptionist'), labOrderController.list);
router.get('/:id', authorize('admin', 'doctor', 'receptionist'), labOrderController.get);

router.use(authorize('admin', 'doctor'));

router.post('/', labOrderValidators.create, validate, labOrderController.create);
router.put('/:id', labOrderController.update);
router.delete('/:id', authorize('admin'), labOrderController.remove);

module.exports = router;
