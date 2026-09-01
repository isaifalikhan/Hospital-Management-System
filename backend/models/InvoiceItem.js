const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  description: { type: DataTypes.STRING, allowNull: false },
  category: {
    type: DataTypes.ENUM('consultation', 'procedure', 'medicine', 'lab', 'room', 'other'),
    defaultValue: 'other',
  },
  quantity: { type: DataTypes.FLOAT, defaultValue: 1 },
  unitPrice: { type: DataTypes.FLOAT, defaultValue: 0 },
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
}, {
  tableName: 'invoice_items',
  timestamps: true,
});

module.exports = InvoiceItem;
