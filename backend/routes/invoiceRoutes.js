const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin', 'receptionist'));

router.get('/', invoiceController.list);
router.get('/:id', invoiceController.get);
router.post('/', invoiceController.create);
router.post('/:id/payments', invoiceController.recordPayment);
router.put('/:id', invoiceController.update);
router.delete('/:id', authorize('admin'), invoiceController.remove);

module.exports = router;
