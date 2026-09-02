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
  // Telemedicine: when true, videoLink holds a free Jitsi Meet room URL
  // (https://meet.jit.si/<uuid>) generated server-side at booking time —
  // no API key or third-party account needed. See utils/telemedicine.js.
  isVideoConsult: { type: DataTypes.BOOLEAN, defaultValue: false },
  videoLink: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'appointments',
  timestamps: true,
});

module.exports = Appointment;
