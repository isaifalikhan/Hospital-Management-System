const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authValidators } = require('../middleware/validators');

router.post('/login', authValidators.login, validate, authController.login);
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, authValidators.changePassword, validate, authController.changePassword);

module.exports = router;
