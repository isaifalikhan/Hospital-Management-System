const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin', 'doctor', 'receptionist'));

router.get('/', patientController.list);
router.get('/:id', patientController.get);
router.post('/', authorize('admin', 'receptionist'), patientController.create);
router.put('/:id', authorize('admin', 'receptionist'), patientController.update);
router.delete('/:id', authorize('admin'), patientController.remove);

module.exports = router;
