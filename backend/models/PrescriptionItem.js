const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// A structured prescription line tied to a medical record, referencing an
// item in the pharmacy inventory so dispensing can decrement real stock.
const PrescriptionItem = sequelize.define('PrescriptionItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  medicineName: { type: DataTypes.STRING, allowNull: false }, // snapshot, survives medicine deletion
  dosage: { type: DataTypes.STRING, allowNull: true }, // e.g. "500mg"
  frequency: { type: DataTypes.STRING, allowNull: true }, // e.g. "twice daily"
  duration: { type: DataTypes.STRING, allowNull: true }, // e.g. "7 days"
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  instructions: { type: DataTypes.STRING, allowNull: true },
  dispensed: { type: DataTypes.BOOLEAN, defaultValue: false },
  dispensedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'prescription_items',
  timestamps: true,
});

module.exports = PrescriptionItem;
