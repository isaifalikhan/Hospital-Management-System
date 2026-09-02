const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Appointment = sequelize.define('Appointment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  time: { type: DataTypes.STRING, allowNull: false }, // "10:30"
  reason: { type: DataTypes.STRING, allowNull: true },
  status: {
    type: DataTypes.ENUM('scheduled', 'completed', 'cancelled', 'no-show'),
    defaultValue: 'scheduled',
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
  // Set once a 24-26h-ahead reminder email has been sent for this
  // appointment (see backend/utils/reminderScheduler.js), so the scheduler
  // never emails the same patient twice for the same visit.
  reminderSentAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'appointments',
  timestamps: true,
});

module.exports = Appointment;
