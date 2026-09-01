const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medicalRecordController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin', 'doctor'));

router.get('/', medicalRecordController.list);
router.get('/:id', medicalRecordController.get);
router.post('/', medicalRecordController.create);
router.put('/:id', medicalRecordController.update);
router.delete('/:id', authorize('admin'), medicalRecordController.remove);

module.exports = router;
