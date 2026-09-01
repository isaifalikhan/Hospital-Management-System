const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StockTransaction = sequelize.define('StockTransaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  type: { type: DataTypes.ENUM('in', 'out'), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  reason: { type: DataTypes.STRING, allowNull: true }, // "restock", "dispensed", "expired", etc.
  date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'stock_transactions',
  timestamps: true,
});

module.exports = StockTransaction;
