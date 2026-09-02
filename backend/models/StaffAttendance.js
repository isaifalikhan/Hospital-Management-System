const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StaffAttendance = sequelize.define('StaffAttendance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false }, // date of the clock-in, for reporting/filtering
  clockIn: { type: DataTypes.DATE, allowNull: false },
  clockOut: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'staff_attendance',
  timestamps: true,
});

module.exports = StaffAttendance;
