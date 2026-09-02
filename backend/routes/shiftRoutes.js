const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { shiftValidators } = require('../middleware/validators');

// Any authenticated staff member can view the roster (own shifts only,
// unless admin); only admins can create/edit/delete shifts.
router.use(authenticate);

router.get('/', shiftController.list);
router.post('/', authorize('admin'), shiftValidators.create, validate, shiftController.create);
router.put('/:id', authorize('admin'), shiftValidators.update, validate, shiftController.update);
router.delete('/:id', authorize('admin'), shiftController.remove);

module.exports = router;
