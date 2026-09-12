const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One measured line of a lab report — "Haemoglobin | 13.4 | g/dL | 13-17".
// Structured the same way PrescriptionItem breaks a prescription into rows
// instead of one blob of text, so a result can be read back per value rather
// than parsed out of free text.
//
// The rows are pre-created from the test's LabTest.parameters when the result
// form opens, so whoever enters the result only fills in the value column.
const LabResultItem = sequelize.define('LabResultItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  parameter: { type: DataTypes.STRING, allowNull: false },
  value: { type: DataTypes.STRING, allowNull: true },
  unit: { type: DataTypes.STRING, allowNull: true },
  referenceRange: { type: DataTypes.STRING, allowNull: true },
  // Set by whoever enters the result; the reference range is free text
  // ("13-17", "< 200", "Negative"), so the app can't reliably decide this.
  flag: { type: DataTypes.ENUM('normal', 'low', 'high', 'abnormal'), defaultValue: 'normal' },
}, {
  tableName: 'lab_result_items',
  timestamps: true,
});

module.exports = LabResultItem;
