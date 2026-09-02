const sequelize = require('../config/db');

const User = require('./User');
const Department = require('./Department');
const Doctor = require('./Doctor');
const Patient = require('./Patient');
const Appointment = require('./Appointment');
const MedicalRecord = require('./MedicalRecord');
const Invoice = require('./Invoice');
const InvoiceItem = require('./InvoiceItem');
const Medicine = require('./Medicine');
const StockTransaction = require('./StockTransaction');
const PrescriptionItem = require('./PrescriptionItem');
const LabOrder = require('./LabOrder');
const Admission = require('./Admission');
const AuditLog = require('./AuditLog');
const StaffAttendance = require('./StaffAttendance');
const Shift = require('./Shift');

// User <-> Doctor (a doctor may have a login account)
User.hasOne(Doctor, { foreignKey: 'userId', onDelete: 'SET NULL' });
Doctor.belongsTo(User, { foreignKey: 'userId' });

// Department <-> Doctor
Department.hasMany(Doctor, { foreignKey: 'departmentId', onDelete: 'SET NULL' });
Doctor.belongsTo(Department, { foreignKey: 'departmentId' });

// Patient <-> Appointment <-> Doctor
Patient.hasMany(Appointment, { foreignKey: 'patientId', onDelete: 'CASCADE' });
Appointment.belongsTo(Patient, { foreignKey: 'patientId' });

Doctor.hasMany(Appointment, { foreignKey: 'doctorId', onDelete: 'SET NULL' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctorId' });

// Patient <-> MedicalRecord <-> Doctor <-> Appointment
Patient.hasMany(MedicalRecord, { foreignKey: 'patientId', onDelete: 'CASCADE' });
MedicalRecord.belongsTo(Patient, { foreignKey: 'patientId' });

Doctor.hasMany(MedicalRecord, { foreignKey: 'doctorId', onDelete: 'SET NULL' });
MedicalRecord.belongsTo(Doctor, { foreignKey: 'doctorId' });

Appointment.hasOne(MedicalRecord, { foreignKey: 'appointmentId', onDelete: 'SET NULL' });
MedicalRecord.belongsTo(Appointment, { foreignKey: 'appointmentId' });

// Patient <-> Invoice <-> InvoiceItem
Patient.hasMany(Invoice, { foreignKey: 'patientId', onDelete: 'CASCADE' });
Invoice.belongsTo(Patient, { foreignKey: 'patientId' });

Appointment.hasOne(Invoice, { foreignKey: 'appointmentId', onDelete: 'SET NULL' });
Invoice.belongsTo(Appointment, { foreignKey: 'appointmentId' });

Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', onDelete: 'CASCADE' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId' });

// Medicine <-> StockTransaction
Medicine.hasMany(StockTransaction, { foreignKey: 'medicineId', onDelete: 'CASCADE' });
StockTransaction.belongsTo(Medicine, { foreignKey: 'medicineId' });

// MedicalRecord <-> PrescriptionItem (structured prescriptions)
MedicalRecord.hasMany(PrescriptionItem, { foreignKey: 'medicalRecordId', onDelete: 'CASCADE' });
PrescriptionItem.belongsTo(MedicalRecord, { foreignKey: 'medicalRecordId' });

PrescriptionItem.belongsTo(Medicine, { foreignKey: 'medicineId', allowNull: true });

// Patient <-> LabOrder <-> Doctor
Patient.hasMany(LabOrder, { foreignKey: 'patientId', onDelete: 'CASCADE' });
LabOrder.belongsTo(Patient, { foreignKey: 'patientId' });

Doctor.hasMany(LabOrder, { foreignKey: 'doctorId', onDelete: 'SET NULL' });
LabOrder.belongsTo(Doctor, { foreignKey: 'doctorId' });

// Patient <-> Admission <-> Doctor
Patient.hasMany(Admission, { foreignKey: 'patientId', onDelete: 'CASCADE' });
Admission.belongsTo(Patient, { foreignKey: 'patientId' });

Doctor.hasMany(Admission, { foreignKey: 'doctorId', onDelete: 'SET NULL' });
Admission.belongsTo(Doctor, { foreignKey: 'doctorId' });

// User <-> StaffAttendance (clock-in/out log)
User.hasMany(StaffAttendance, { foreignKey: 'userId', onDelete: 'CASCADE' });
StaffAttendance.belongsTo(User, { foreignKey: 'userId' });

// User <-> Shift (weekly roster assignments)
User.hasMany(Shift, { foreignKey: 'userId', onDelete: 'CASCADE' });
Shift.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Department,
  Doctor,
  Patient,
  Appointment,
  MedicalRecord,
  Invoice,
  InvoiceItem,
  Medicine,
  StockTransaction,
  PrescriptionItem,
  LabOrder,
  Admission,
  AuditLog,
  StaffAttendance,
  Shift,
};
