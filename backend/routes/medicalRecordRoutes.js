const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medicalRecordController');
const { authenticate, authorize } = require('../middleware/auth');

// Dispensing a prescription item is a pharmacist action, so it's authorized
// separately before the admin/doctor-only restriction below applies to the
// rest of this router.
router.post(
  '/prescription-items/:itemId/dispense',
  authenticate,
  authorize('admin', 'pharmacist'),
  medicalRecordController.dispensePrescriptionItem
);

router.use(authenticate, authorize('admin', 'doctor'));

router.get('/', medicalRecordController.list);
router.get('/:id', medicalRecordController.get);
router.post('/', medicalRecordController.create);
router.put('/:id', medicalRecordController.update);
router.delete('/:id', authorize('admin'), medicalRecordController.remove);

module.exports = router;
