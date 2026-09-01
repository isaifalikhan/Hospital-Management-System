const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Patient = sequelize.define('Patient', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  mrn: { type: DataTypes.STRING, allowNull: false, unique: true }, // medical record number
  name: { type: DataTypes.STRING, allowNull: false },
  dob: { type: DataTypes.DATEONLY, allowNull: true },
  gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: true },
  bloodGroup: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  emergencyContactName: { type: DataTypes.STRING, allowNull: true },
  emergencyContactPhone: { type: DataTypes.STRING, allowNull: true },
  allergies: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('admitted', 'discharged', 'outpatient'), defaultValue: 'outpatient' },
}, {
  tableName: 'patients',
  timestamps: true,
});

module.exports = Patient;
