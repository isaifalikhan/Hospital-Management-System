const express = require('express');
const router = express.Router();
const immunizationController = require('../controllers/immunizationController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { immunizationValidators } = require('../middleware/validators');

router.use(authenticate, authorize('admin', 'doctor'));

router.get('/', immunizationController.list);
router.post('/', immunizationValidators.create, validate, immunizationController.create);
router.put('/:id', immunizationValidators.update, validate, immunizationController.update);
router.delete('/:id', authorize('admin'), immunizationController.remove);

module.exports = router;
