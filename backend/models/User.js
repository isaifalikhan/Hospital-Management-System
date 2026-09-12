const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    // 'lab' is the laboratory bench: it works the lab order queue (progress a
    // test, enter results, attach reports) the way 'pharmacist' owns the
    // pharmacy, without the clinical or billing access the other roles carry.
    type: DataTypes.ENUM('admin', 'doctor', 'receptionist', 'pharmacist', 'lab'),
    allowNull: false,
    defaultValue: 'receptionist',
  },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
