const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Immunization = sequelize.define('Immunization', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  vaccineName: { type: DataTypes.STRING, allowNull: false },
  doseNumber: { type: DataTypes.INTEGER, allowNull: true },
  dateGiven: { type: DataTypes.DATEONLY, allowNull: false },
  nextDueDate: { type: DataTypes.DATEONLY, allowNull: true },
  administeredBy: { type: DataTypes.STRING, allowNull: true }, // free text -- may be a nurse, not necessarily a system user
  batchNumber: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'immunizations',
  timestamps: true,
});

module.exports = Immunization;
