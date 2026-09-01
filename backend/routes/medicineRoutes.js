const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { medicineValidators } = require('../middleware/validators');

router.use(authenticate, authorize('admin', 'pharmacist'));

router.get('/', medicineController.list);
router.get('/:id', medicineController.get);
router.post('/', medicineValidators.create, validate, medicineController.create);
router.put('/:id', medicineController.update);
router.post('/:id/stock', medicineValidators.stock, validate, medicineController.adjustStock);
router.delete('/:id', authorize('admin'), medicineController.remove);

module.exports = router;
