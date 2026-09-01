const express = require('express');
const router = express.Router();
const labOrderController = require('../controllers/labOrderController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { labOrderValidators } = require('../middleware/validators');

router.use(authenticate, authorize('admin', 'doctor'));

router.get('/', labOrderController.list);
router.get('/:id', labOrderController.get);
router.post('/', labOrderValidators.create, validate, labOrderController.create);
router.put('/:id', labOrderController.update);
router.delete('/:id', authorize('admin'), labOrderController.remove);

module.exports = router;
