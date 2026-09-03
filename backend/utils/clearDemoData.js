require('dotenv').config();
const {
  sequelize, PrescriptionItem, InvoiceItem, StockTransaction, AuditLog,
  MedicalRecord, LabOrder, Admission, Invoice, Appointment, StaffAttendance,
  Shift, Patient, Doctor, Department, Medicine,
} = require('../models');

// Deletes every row of clinical/business data while leaving the `users`
// table (staff logins) completely untouched, so nobody gets locked out.
// Deletes in child-to-parent order rather than relying on each dialect's
// cascade behavior, so it works the same on SQLite and Postgres.
async function clearDemoData() {
  const models = [
    PrescriptionItem, InvoiceItem, StockTransaction, AuditLog,
    MedicalRecord, LabOrder, Admission, Invoice, Appointment,
    StaffAttendance, Shift, Patient, Doctor, Department, Medicine,
  ];
  for (const model of models) {
    const count = await model.destroy({ where: {}, truncate: false });
    console.log(`  cleared ${model.name}: ${count} row(s)`);
  }
}

if (require.main === module) {
  clearDemoData()
    .then(async () => {
      console.log('Demo data cleared. Staff logins were left untouched.');
      await sequelize.close();
    })
    .catch(async (err) => {
      console.error('Failed to clear demo data:', err);
      await sequelize.close();
      process.exit(1);
    });
}

module.exports = { clearDemoData };
