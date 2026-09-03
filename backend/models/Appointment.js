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
  // Telemedicine: when true, videoLink holds a free Jitsi Meet room URL
  // (https://meet.jit.si/<uuid>) generated server-side at booking time —
  // no API key or third-party account needed. See utils/telemedicine.js.
  isVideoConsult: { type: DataTypes.BOOLEAN, defaultValue: false },
  videoLink: { type: DataTypes.STRING, allowNull: true },
  // 'walk-in' = a front-desk check-in (see controllers/appointmentController.js
  // #create): the server assigns today's date, the actual check-in time, and
  // a per-doctor daily tokenNumber instead of a client-picked time slot, and
  // it's exempt from the doctor/date/time uniqueness index below (multiple
  // walk-ins legitimately share a "time" — they're queued, not slot-booked).
  visitType: { type: DataTypes.ENUM('scheduled', 'walk-in'), defaultValue: 'scheduled' },
  tokenNumber: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'appointments',
  timestamps: true,
});

module.exports = Appointment;
