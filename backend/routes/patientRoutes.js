const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { patientValidators } = require('../middleware/validators');

router.use(authenticate, authorize('admin', 'doctor', 'receptionist'));

router.get('/', patientController.list);
router.get('/:id', patientController.get);
router.post('/', authorize('admin', 'receptionist'), patientValidators.create, validate, patientController.create);
router.put('/:id', authorize('admin', 'receptionist'), patientValidators.update, validate, patientController.update);
router.put(
  '/:id/portal-pin',
  authorize('admin', 'receptionist'),
  patientValidators.setPortalPin,
  validate,
  patientController.setPortalPin
);
router.delete('/:id', authorize('admin'), patientController.remove);

module.exports = router;
