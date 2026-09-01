const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', doctorController.list);
router.get('/:id', doctorController.get);
router.post('/', authorize('admin'), doctorController.create);
router.put('/:id', authorize('admin'), doctorController.update);
router.delete('/:id', authorize('admin'), doctorController.remove);

module.exports = router;
