const { Attachment } = require('../models');

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

// Thin boundary around wherever file bytes actually live. Everything above
// this file talks to the store only through these three functions -- today
// that's the Attachment table's own `data` column, but swapping in a cloud
// object store later only means changing the inside of this module.
async function saveFile({ buffer, filename, mimeType, entityType, entityId, uploadedBy }) {
  const attachment = await Attachment.create({
    filename, mimeType, fileSize: buffer.length, data: buffer, entityType, entityId, uploadedBy,
  });
  return attachment;
}

async function getFile(id) {
  return Attachment.findByPk(id);
}

async function deleteFile(id) {
  const attachment = await Attachment.findByPk(id);
  if (!attachment) return false;
  await attachment.destroy();
  return true;
}

async function deleteAllForEntity(entityType, entityId) {
  return Attachment.destroy({ where: { entityType, entityId } });
}

module.exports = { saveFile, getFile, deleteFile, deleteAllForEntity, MAX_FILE_BYTES, ALLOWED_MIME_TYPES };
