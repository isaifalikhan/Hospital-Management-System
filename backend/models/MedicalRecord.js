const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MedicalRecord = sequelize.define('MedicalRecord', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  diagnosis: { type: DataTypes.TEXT, allowNull: true },
  treatment: { type: DataTypes.TEXT, allowNull: true },
  prescription: { type: DataTypes.TEXT, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  vitals: { type: DataTypes.STRING, allowNull: true }, // free-text catch-all for anything not covered below
  bpSystolic: { type: DataTypes.INTEGER, allowNull: true },
  bpDiastolic: { type: DataTypes.INTEGER, allowNull: true },
  temperature: { type: DataTypes.FLOAT, allowNull: true }, // Fahrenheit
  pulse: { type: DataTypes.INTEGER, allowNull: true }, // beats per minute
  weight: { type: DataTypes.FLOAT, allowNull: true }, // pounds
  signatureData: { type: DataTypes.TEXT, allowNull: true }, // base64 PNG of the doctor's e-signature
}, {
  tableName: 'medical_records',
  timestamps: true,
});

module.exports = MedicalRecord;
