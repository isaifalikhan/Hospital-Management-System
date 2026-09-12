const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// The hospital's catalogue of orderable lab tests and what each one costs.
// Ordering a test copies the price onto the LabOrder (see
// controllers/labOrderController.js#create) rather than reading through this
// row later, so re-pricing a test never rewrites the amount a patient was
// already billed.
const LabTest = sequelize.define('LabTest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  price: { type: DataTypes.FLOAT, defaultValue: 0 },
  sampleType: { type: DataTypes.STRING, allowNull: true }, // e.g. "Blood", "Urine"
  referenceRange: { type: DataTypes.STRING, allowNull: true },
  // The report's rows: [{ parameter, unit, referenceRange }, ...]. Defining
  // them once here is what lets the result form open as a ready-made table
  // with only the value column left to fill in. A test with none (an X-ray,
  // say) falls back to a free-text narrative result.
  parameters: { type: DataTypes.JSON, allowNull: true },
  // Retired tests stay on old orders but drop out of the order-form picker.
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'lab_tests',
  timestamps: true,
});

module.exports = LabTest;
