const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userName: { type: DataTypes.STRING, allowNull: true }, // snapshot, survives user deletion
  userRole: { type: DataTypes.STRING, allowNull: true },
  action: { type: DataTypes.ENUM('create', 'update', 'delete'), allowNull: false },
  entityType: { type: DataTypes.STRING, allowNull: false }, // e.g. "Patient", "Invoice"
  entityId: { type: DataTypes.INTEGER, allowNull: true },
  summary: { type: DataTypes.STRING, allowNull: true }, // short human-readable description
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false,
});

module.exports = AuditLog;
