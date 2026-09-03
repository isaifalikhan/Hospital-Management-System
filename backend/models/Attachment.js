const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Generic, reusable across every entity that can carry a file (medical
// records, lab orders, admissions) rather than one table per entity type.
// entityType/entityId is a polymorphic reference, not a real FK -- Sequelize
// can't constrain a column that points at different tables depending on
// entityType, so parent-delete cleanup is handled by hand in each parent's
// controller instead of an onDelete cascade.
const Attachment = sequelize.define('Attachment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  filename: { type: DataTypes.STRING, allowNull: false },
  mimeType: { type: DataTypes.STRING, allowNull: false },
  fileSize: { type: DataTypes.INTEGER, allowNull: false },
  data: { type: DataTypes.BLOB('long'), allowNull: false },
  entityType: { type: DataTypes.ENUM('MedicalRecord', 'LabOrder', 'Admission'), allowNull: false },
  entityId: { type: DataTypes.INTEGER, allowNull: false },
  uploadedBy: { type: DataTypes.STRING, allowNull: true }, // snapshot, survives user deletion
}, {
  tableName: 'attachments',
  timestamps: true,
  indexes: [{ fields: ['entityType', 'entityId'] }],
});

module.exports = Attachment;
