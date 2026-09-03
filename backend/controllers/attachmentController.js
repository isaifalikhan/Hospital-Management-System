const { MedicalRecord, LabOrder, Admission, Attachment } = require('../models');
const { saveFile, getFile, deleteFile } = require('../utils/attachmentStorage');
const { logAudit } = require('../utils/audit');

// Attachments are polymorphic (one table for three entity types), so access
// is scoped per entityType here rather than by a fixed router-level
// authorize() list -- matching whatever roles can already read/edit that
// parent entity elsewhere in the app.
const ENTITY_CONFIG = {
  MedicalRecord: { model: MedicalRecord, roles: ['admin', 'doctor'] },
  LabOrder: { model: LabOrder, roles: ['admin', 'doctor'] },
  Admission: { model: Admission, roles: ['admin', 'doctor', 'receptionist'] },
};

function checkEntityAccess(req, res, entityType) {
  const config = ENTITY_CONFIG[entityType];
  if (!config) {
    res.status(400).json({ message: `entityType must be one of ${Object.keys(ENTITY_CONFIG).join(', ')}` });
    return null;
  }
  if (!config.roles.includes(req.user.role)) {
    res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    return null;
  }
  return config;
}

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded (field name must be "file")' });
    }
    const { entityType, entityId } = req.body;
    const config = checkEntityAccess(req, res, entityType);
    if (!config) return;

    const parent = await config.model.findByPk(entityId);
    if (!parent) {
      return res.status(404).json({ message: `${entityType} #${entityId} not found` });
    }

    const attachment = await saveFile({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      entityType,
      entityId,
      uploadedBy: req.user.name,
    });

    await logAudit(req, {
      action: 'create', entityType: 'Attachment', entityId: attachment.id,
      summary: `Uploaded ${attachment.filename} to ${entityType} #${entityId}`,
    });

    res.status(201).json({
      id: attachment.id, filename: attachment.filename, mimeType: attachment.mimeType,
      fileSize: attachment.fileSize, uploadedBy: attachment.uploadedBy, createdAt: attachment.createdAt,
    });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.query;
    const config = checkEntityAccess(req, res, entityType);
    if (!config) return;

    const attachments = await Attachment.findAll({
      where: { entityType, entityId },
      attributes: ['id', 'filename', 'mimeType', 'fileSize', 'uploadedBy', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json(attachments);
  } catch (err) { next(err); }
};

exports.download = async (req, res, next) => {
  try {
    const attachment = await getFile(req.params.id);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });
    if (!checkEntityAccess(req, res, attachment.entityType)) return;

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.filename)}"`);
    res.send(attachment.data);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const attachment = await getFile(req.params.id);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });
    if (!checkEntityAccess(req, res, attachment.entityType)) return;

    const { filename, entityType, entityId } = attachment;
    await deleteFile(attachment.id);
    await logAudit(req, {
      action: 'delete', entityType: 'Attachment', entityId: req.params.id,
      summary: `Deleted ${filename} from ${entityType} #${entityId}`,
    });
    res.json({ message: 'Attachment deleted' });
  } catch (err) { next(err); }
};
