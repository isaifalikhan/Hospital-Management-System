const express = require('express');
const router = express.Router();
const labOrderController = require('../controllers/labOrderController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { labOrderValidators } = require('../middleware/validators');

router.use(authenticate);

// Reception reads the queue too — every order carries the test's bill, and
// the front desk is who collects it.
router.get('/', authorize('admin', 'doctor', 'receptionist', 'lab'), labOrderController.list);
router.get('/:id', authorize('admin', 'doctor', 'receptionist', 'lab'), labOrderController.get);

// Working a test — marking it in progress, entering the result — is the
// laboratory's job, so 'lab' can update but not raise orders. Ordering stays
// with the doctors, who decide a test is needed in the first place.
router.put('/:id', authorize('admin', 'doctor', 'lab'), labOrderController.update);

router.use(authorize('admin', 'doctor'));

router.post('/', labOrderValidators.create, validate, labOrderController.create);
router.delete('/:id', authorize('admin'), labOrderController.remove);

module.exports = router;
