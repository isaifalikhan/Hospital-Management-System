const { AuditLog } = require('../models');

/**
 * Best-effort audit trail. Failures here must never break the request that
 * triggered them, so errors are logged and swallowed.
 */
async function logAudit(req, { action, entityType, entityId, summary }) {
  try {
    await AuditLog.create({
      userName: req.user?.name || 'System',
      userRole: req.user?.role || null,
      action,
      entityType,
      entityId: entityId ?? null,
      summary: summary || null,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
