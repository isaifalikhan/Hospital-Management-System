const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { patientValidators } = require('../middleware/validators');

router.use(authenticate);

// Open to every logged-in role: the patient list and the registration
// projection both return only what the front desk collected (demographics,
// contact, emergency contact, allergies) — no clinical, billing or portal
// credential data — so any staff member can look a patient up and print
// their registration slip. Everything below the role gate is narrower.
router.get('/', patientController.list);
router.get('/:id/registration', patientController.registration);

router.use(authorize('admin', 'doctor', 'receptionist'));

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
