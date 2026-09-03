const express = require('express');
const multer = require('multer');
const router = express.Router();
const attachmentController = require('../controllers/attachmentController');
const { authenticate } = require('../middleware/auth');
const { MAX_FILE_BYTES, ALLOWED_MIME_TYPES } = require('../utils/attachmentStorage');

// Parsed straight into memory, never written to disk -- this also has to
// work on Vercel, where the filesystem outside /tmp is read-only.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, PDF.`));
    }
    cb(null, true);
  },
});

// Per-entity-type role checks happen inside the controller, not here --
// see attachmentController.js's ENTITY_CONFIG.
router.use(authenticate);

router.get('/', attachmentController.list);
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, attachmentController.upload);
router.get('/:id/file', attachmentController.download);
router.delete('/:id', attachmentController.remove);

module.exports = router;
