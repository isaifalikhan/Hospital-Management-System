const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { userValidators } = require('../middleware/validators');

router.use(authenticate, authorize('admin'));

router.get('/', userController.list);
router.get('/:id', userController.get);
router.post('/', userValidators.create, validate, userController.create);
router.put('/:id', userValidators.update, validate, userController.update);
router.delete('/:id', userController.remove);

module.exports = router;
