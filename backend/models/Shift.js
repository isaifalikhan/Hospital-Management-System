const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Shift = sequelize.define('Shift', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  startTime: { type: DataTypes.STRING, allowNull: false }, // "09:00"
  endTime: { type: DataTypes.STRING, allowNull: false }, // "17:00"
  note: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'shifts',
  timestamps: true,
});

module.exports = Shift;
