const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  invoiceNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  discount: { type: DataTypes.FLOAT, defaultValue: 0 },
  tax: { type: DataTypes.FLOAT, defaultValue: 0 },
  total: { type: DataTypes.FLOAT, defaultValue: 0 },
  amountPaid: { type: DataTypes.FLOAT, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('unpaid', 'partially_paid', 'paid', 'cancelled'),
    defaultValue: 'unpaid',
  },
  paymentMethod: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'invoices',
  timestamps: true,
});

module.exports = Invoice;
