const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('admin', 'doctor', 'receptionist', 'pharmacist'),
    allowNull: false,
    defaultValue: 'receptionist',
  },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
