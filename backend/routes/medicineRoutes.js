const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin', 'pharmacist'));

router.get('/', medicineController.list);
router.get('/:id', medicineController.get);
router.post('/', medicineController.create);
router.put('/:id', medicineController.update);
router.post('/:id/stock', medicineController.adjustStock);
router.delete('/:id', authorize('admin'), medicineController.remove);

module.exports = router;
