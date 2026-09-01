const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Doctor = sequelize.define('Doctor', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  specialization: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },
  qualification: { type: DataTypes.STRING, allowNull: true },
  consultationFee: { type: DataTypes.FLOAT, defaultValue: 0 },
  availableDays: { type: DataTypes.STRING, allowNull: true }, // e.g. "Mon,Tue,Wed"
  availableTime: { type: DataTypes.STRING, allowNull: true }, // e.g. "09:00-17:00"
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
}, {
  tableName: 'doctors',
  timestamps: true,
});

module.exports = Doctor;
