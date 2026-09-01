const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MedicalRecord = sequelize.define('MedicalRecord', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  diagnosis: { type: DataTypes.TEXT, allowNull: true },
  treatment: { type: DataTypes.TEXT, allowNull: true },
  prescription: { type: DataTypes.TEXT, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  vitals: { type: DataTypes.STRING, allowNull: true }, // e.g. "BP:120/80, Temp:98.6F, Pulse:72"
}, {
  tableName: 'medical_records',
  timestamps: true,
});

module.exports = MedicalRecord;
