const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Admission = sequelize.define('Admission', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ward: { type: DataTypes.STRING, allowNull: false }, // e.g. "General Ward", "ICU"
  bedNumber: { type: DataTypes.STRING, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: true },
  admissionDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  dischargeDate: { type: DataTypes.DATEONLY, allowNull: true },
  dischargeNotes: { type: DataTypes.TEXT, allowNull: true },
  signatureData: { type: DataTypes.TEXT, allowNull: true }, // base64 PNG of the discharging doctor's e-signature
  status: { type: DataTypes.ENUM('admitted', 'discharged'), defaultValue: 'admitted' },
}, {
  tableName: 'admissions',
  timestamps: true,
});

module.exports = Admission;
