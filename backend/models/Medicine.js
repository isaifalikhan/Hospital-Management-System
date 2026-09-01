const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Medicine = sequelize.define('Medicine', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: true },
  manufacturer: { type: DataTypes.STRING, allowNull: true },
  unit: { type: DataTypes.STRING, defaultValue: 'unit' }, // tablet, bottle, box...
  unitPrice: { type: DataTypes.FLOAT, defaultValue: 0 },
  quantityInStock: { type: DataTypes.INTEGER, defaultValue: 0 },
  reorderLevel: { type: DataTypes.INTEGER, defaultValue: 10 },
  expiryDate: { type: DataTypes.DATEONLY, allowNull: true },
}, {
  tableName: 'medicines',
  timestamps: true,
});

module.exports = Medicine;
