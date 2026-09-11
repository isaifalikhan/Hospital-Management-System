const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LabOrder = sequelize.define('LabOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  testName: { type: DataTypes.STRING, allowNull: false },
  status: {
    type: DataTypes.ENUM('ordered', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'ordered',
  },
  priority: { type: DataTypes.ENUM('routine', 'urgent'), defaultValue: 'routine' },
  // Copied off the LabTest catalogue row at order time (or typed directly for
  // a one-off test) and billed on the invoice this order links to via
  // invoiceId. Held here as well as on the invoice so the lab queue can show
  // what a test costs without loading the invoice.
  price: { type: DataTypes.FLOAT, defaultValue: 0 },
  orderedDate: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  resultDate: { type: DataTypes.DATEONLY, allowNull: true },
  result: { type: DataTypes.TEXT, allowNull: true },
  referenceRange: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'lab_orders',
  timestamps: true,
});

module.exports = LabOrder;
