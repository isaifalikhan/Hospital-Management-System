require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  sequelize, User, Department, Doctor, Patient, Appointment, MedicalRecord,
  Invoice, InvoiceItem, Medicine, StockTransaction, PrescriptionItem,
  LabOrder, Admission, AuditLog,
} = require('../models');

async function seed() {
  await sequelize.sync({ force: true });
  // Enforces "one active appointment per doctor/date/time" at the DB level
  // so two concurrent booking requests can't both pass the app-level clash
  // check and double-book the same slot. Cancelled appointments are
  // excluded so a freed-up slot can be rebooked. Normally created by
  // server.js's start() on boot, which never runs on Vercel -- this is
  // that deployment's only path to getting the index created.
  await sequelize.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS appointments_doctor_date_time_active
     ON appointments (doctorId, date, time)
     WHERE status <> 'cancelled'`
  );
  console.log('Database reset. Seeding sample data...');

  const password = await bcrypt.hash('password123', 10);

  const [admin, drUser, receptionUser, pharmacyUser] = await User.bulkCreate([
    { name: 'Alex Admin', username: 'admin', email: 'admin@hms.local', password, role: 'admin' },
    { name: 'Dr. Sarah Johnson', username: 'sjohnson', email: 'sjohnson@hms.local', password, role: 'doctor' },
    { name: 'Riya Receptionist', username: 'reception', email: 'reception@hms.local', password, role: 'receptionist' },
    { name: 'Pat Pharmacist', username: 'pharmacist', email: 'pharmacist@hms.local', password, role: 'pharmacist' },
  ]);

  const [cardiology, pediatrics, orthopedics, general] = await Department.bulkCreate([
    { name: 'Cardiology', description: 'Heart and cardiovascular care' },
    { name: 'Pediatrics', description: 'Child healthcare' },
    { name: 'Orthopedics', description: 'Bones, joints, and muscles' },
    { name: 'General Medicine', description: 'General checkups and internal medicine' },
  ]);

  const [drSarah, drAmit, drLisa, drJohn] = await Doctor.bulkCreate([
    {
      name: 'Dr. Sarah Johnson', specialization: 'Cardiologist', phone: '555-0101',
      email: 'sjohnson@hms.local', qualification: 'MD, FACC', consultationFee: 150,
      availableDays: 'Mon,Tue,Wed,Thu,Fri', availableTime: '09:00-17:00',
      status: 'active', departmentId: cardiology.id, userId: drUser.id,
    },
    {
      name: 'Dr. Amit Patel', specialization: 'Pediatrician', phone: '555-0102',
      email: 'apatel@hms.local', qualification: 'MD', consultationFee: 100,
      availableDays: 'Mon,Wed,Fri', availableTime: '10:00-16:00',
      status: 'active', departmentId: pediatrics.id,
    },
    {
      name: 'Dr. Lisa Chen', specialization: 'Orthopedic Surgeon', phone: '555-0103',
      email: 'lchen@hms.local', qualification: 'MD, MS Ortho', consultationFee: 180,
      availableDays: 'Tue,Thu,Sat', availableTime: '08:00-14:00',
      status: 'active', departmentId: orthopedics.id,
    },
    {
      name: 'Dr. John Miller', specialization: 'General Physician', phone: '555-0104',
      email: 'jmiller@hms.local', qualification: 'MBBS', consultationFee: 80,
      availableDays: 'Mon,Tue,Wed,Thu,Fri,Sat', availableTime: '09:00-18:00',
      status: 'active', departmentId: general.id,
    },
  ]);

  const [p1, p2, p3, p4, p5] = await Patient.bulkCreate([
    {
      mrn: 'MRN00000001', name: 'John Doe', dob: '1985-04-12', gender: 'male',
      bloodGroup: 'O+', phone: '555-1001', email: 'john.doe@example.com',
      address: '123 Main St, Springfield', emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '555-1002', allergies: 'Penicillin', status: 'outpatient',
    },
    {
      mrn: 'MRN00000002', name: 'Maria Garcia', dob: '1990-08-23', gender: 'female',
      bloodGroup: 'A+', phone: '555-1003', email: 'maria.garcia@example.com',
      address: '456 Oak Ave, Springfield', emergencyContactName: 'Carlos Garcia',
      emergencyContactPhone: '555-1004', allergies: 'None known', status: 'outpatient',
    },
    {
      mrn: 'MRN00000003', name: 'Ethan Williams', dob: '2015-01-30', gender: 'male',
      bloodGroup: 'B+', phone: '555-1005', email: 'parent.williams@example.com',
      address: '789 Pine Rd, Springfield', emergencyContactName: 'Sara Williams',
      emergencyContactPhone: '555-1006', allergies: 'None known', status: 'outpatient',
    },
    {
      mrn: 'MRN00000004', name: 'Grace Kim', dob: '1978-11-05', gender: 'female',
      bloodGroup: 'AB+', phone: '555-1007', email: 'grace.kim@example.com',
      address: '22 Birch Ln, Springfield', emergencyContactName: 'Daniel Kim',
      emergencyContactPhone: '555-1008', allergies: 'Sulfa drugs', status: 'admitted',
    },
    {
      mrn: 'MRN00000005', name: 'Robert Brown', dob: '1965-06-18', gender: 'male',
      bloodGroup: 'O-', phone: '555-1009', email: 'robert.brown@example.com',
      address: '9 Cedar Ct, Springfield', emergencyContactName: 'Nancy Brown',
      emergencyContactPhone: '555-1010', allergies: 'None known', status: 'outpatient',
    },
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const [appt1, appt2, appt3, appt4] = await Appointment.bulkCreate([
    { patientId: p1.id, doctorId: drSarah.id, date: today, time: '09:30', reason: 'Chest pain follow-up', status: 'scheduled' },
    { patientId: p2.id, doctorId: drJohn.id, date: today, time: '11:00', reason: 'Annual checkup', status: 'scheduled' },
    { patientId: p3.id, doctorId: drAmit.id, date: tomorrow, time: '10:00', reason: 'Vaccination', status: 'scheduled' },
    { patientId: p4.id, doctorId: drLisa.id, date: yesterday, time: '14:00', reason: 'Knee pain', status: 'completed' },
  ]);

  const record1 = await MedicalRecord.create({
    patientId: p4.id, doctorId: drLisa.id, appointmentId: appt4.id, date: yesterday,
    diagnosis: 'Mild osteoarthritis of the right knee',
    treatment: 'Prescribed anti-inflammatory medication and physical therapy',
    prescription: 'Ibuprofen 400mg twice daily for 7 days',
    notes: 'Follow up in 3 weeks if symptoms persist.',
    vitals: 'BP:128/82, Temp:98.4F, Pulse:76',
  });

  await PrescriptionItem.bulkCreate([
    {
      medicalRecordId: record1.id, medicineName: 'Ibuprofen 400mg', dosage: '400mg',
      frequency: 'Twice daily', duration: '7 days', quantity: 14,
      instructions: 'Take after meals', dispensed: false,
    },
  ]);

  await LabOrder.bulkCreate([
    {
      patientId: p4.id, doctorId: drLisa.id, testName: 'X-Ray (Right Knee)',
      status: 'completed', priority: 'routine', orderedDate: yesterday, resultDate: yesterday,
      result: 'Mild joint space narrowing consistent with early osteoarthritis. No fracture.',
      referenceRange: 'N/A', notes: 'Correlate clinically.',
    },
    {
      patientId: p1.id, doctorId: drSarah.id, testName: 'Lipid Panel',
      status: 'ordered', priority: 'routine', orderedDate: today,
    },
    {
      patientId: p2.id, doctorId: drJohn.id, testName: 'Complete Blood Count (CBC)',
      status: 'in_progress', priority: 'urgent', orderedDate: today,
    },
  ]);

  await Admission.bulkCreate([
    {
      patientId: p4.id, doctorId: drLisa.id, ward: 'Orthopedic Ward', bedNumber: 'B-12',
      reason: 'Post-op monitoring after knee arthroscopy', admissionDate: yesterday, status: 'admitted',
    },
  ]);

  await Invoice.create({
    invoiceNumber: 'INV00000001',
    patientId: p4.id,
    appointmentId: appt4.id,
    date: yesterday,
    subtotal: 180,
    discount: 0,
    tax: 0,
    total: 180,
    amountPaid: 180,
    status: 'paid',
    paymentMethod: 'card',
  }, { include: [] });

  const invoice1 = await Invoice.findOne({ where: { invoiceNumber: 'INV00000001' } });
  await InvoiceItem.bulkCreate([
    { invoiceId: invoice1.id, description: 'Orthopedic consultation', category: 'consultation', quantity: 1, unitPrice: 180, amount: 180 },
  ]);

  const invoice2 = await Invoice.create({
    invoiceNumber: 'INV00000002',
    patientId: p1.id,
    date: today,
    subtotal: 150,
    discount: 10,
    tax: 0,
    total: 140,
    amountPaid: 0,
    status: 'unpaid',
  });
  await InvoiceItem.bulkCreate([
    { invoiceId: invoice2.id, description: 'Cardiology consultation', category: 'consultation', quantity: 1, unitPrice: 150, amount: 150 },
  ]);

  const [med1, med2, med3, med4] = await Medicine.bulkCreate([
    { name: 'Paracetamol 500mg', category: 'Analgesic', manufacturer: 'GenPharma', unit: 'tablet', unitPrice: 0.10, quantityInStock: 500, reorderLevel: 100, expiryDate: '2027-06-30' },
    { name: 'Amoxicillin 250mg', category: 'Antibiotic', manufacturer: 'MediCorp', unit: 'capsule', unitPrice: 0.25, quantityInStock: 80, reorderLevel: 100, expiryDate: '2026-12-31' },
    { name: 'Ibuprofen 400mg', category: 'Anti-inflammatory', manufacturer: 'GenPharma', unit: 'tablet', unitPrice: 0.15, quantityInStock: 300, reorderLevel: 50, expiryDate: '2027-03-15' },
    { name: 'Cetirizine 10mg', category: 'Antihistamine', manufacturer: 'AllerCare', unit: 'tablet', unitPrice: 0.08, quantityInStock: 40, reorderLevel: 60, expiryDate: '2026-10-01' },
  ]);

  await StockTransaction.bulkCreate([
    { medicineId: med1.id, type: 'in', quantity: 500, reason: 'Initial stock', date: today },
    { medicineId: med2.id, type: 'in', quantity: 100, reason: 'Initial stock', date: today },
    { medicineId: med2.id, type: 'out', quantity: 20, reason: 'Dispensed', date: today },
    { medicineId: med3.id, type: 'in', quantity: 300, reason: 'Initial stock', date: today },
    { medicineId: med4.id, type: 'in', quantity: 60, reason: 'Initial stock', date: today },
    { medicineId: med4.id, type: 'out', quantity: 20, reason: 'Dispensed', date: today },
  ]);

  // Backfill a couple weeks of appointments + invoices so the dashboard
  // trend charts have something meaningful to plot right out of the box.
  // Built as arrays and bulk-inserted (3 round trips total) rather than
  // creating each row one at a time -- ~230 sequential awaited queries
  // against a remote DB took long enough to blow past Vercel's function
  // timeout when this ran as the one-time /api/setup/seed request.
  const doctors = [drSarah, drAmit, drLisa, drJohn];
  const patients = [p1, p2, p3, p4, p5];
  let invoiceCounter = 3;
  const backfillAppointments = [];
  const backfillInvoices = [];
  const backfillInvoiceMeta = []; // parallel to backfillInvoices: { doctor }
  for (let i = 13; i >= 2; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const numEvents = 1 + ((i * 7) % 3); // deterministic pseudo-variety, 1-3 per day
    for (let j = 0; j < numEvents; j++) {
      const doctor = doctors[(i + j) % doctors.length];
      const patient = patients[(i + j * 2) % patients.length];
      const hour = 9 + ((i + j) % 7);
      backfillAppointments.push({
        patientId: patient.id,
        doctorId: doctor.id,
        date: day,
        time: `${String(hour).padStart(2, '0')}:00`,
        reason: 'Routine visit',
        status: 'completed',
      });

      const fee = doctor.consultationFee || 100;
      invoiceCounter += 1;
      backfillInvoices.push({
        invoiceNumber: `INV${String(invoiceCounter).padStart(8, '0')}`,
        patientId: patient.id,
        date: day,
        subtotal: fee,
        discount: 0,
        tax: 0,
        total: fee,
        amountPaid: fee,
        status: 'paid',
        paymentMethod: 'cash',
      });
      backfillInvoiceMeta.push({ doctor });
    }
  }
  await Appointment.bulkCreate(backfillAppointments);
  const createdInvoices = await Invoice.bulkCreate(backfillInvoices, { returning: true });
  await InvoiceItem.bulkCreate(createdInvoices.map((inv, idx) => {
    const { doctor } = backfillInvoiceMeta[idx];
    const fee = doctor.consultationFee || 100;
    return {
      invoiceId: inv.id, description: `${doctor.specialization || 'General'} consultation`,
      category: 'consultation', quantity: 1, unitPrice: fee, amount: fee,
    };
  }));

  await AuditLog.bulkCreate([
    { userName: 'Alex Admin', userRole: 'admin', action: 'create', entityType: 'Patient', entityId: p1.id, summary: `Registered patient ${p1.name} (${p1.mrn})` },
    { userName: 'Riya Receptionist', userRole: 'receptionist', action: 'create', entityType: 'Appointment', entityId: appt1.id, summary: 'Booked appointment for patient #1 with doctor #1' },
    { userName: 'Dr. Sarah Johnson', userRole: 'doctor', action: 'create', entityType: 'MedicalRecord', entityId: record1.id, summary: 'Added medical record for patient #4' },
    { userName: 'Pat Pharmacist', userRole: 'pharmacist', action: 'update', entityType: 'Medicine', entityId: med2.id, summary: 'Stock removed from Amoxicillin 250mg: 20 (Dispensed)' },
  ]);

  console.log('\nSeed complete! Login credentials (all passwords: password123):');
  console.log('  Admin:        admin / password123');
  console.log('  Doctor:       sjohnson / password123');
  console.log('  Receptionist: reception / password123');
  console.log('  Pharmacist:   pharmacist / password123');
}

module.exports = seed;

// Only auto-run (and close the connection afterwards) when invoked directly
// as a CLI script — routes/setupRoutes.js imports and calls seed() itself
// and needs to keep the connection open for the rest of the app.
if (require.main === module) {
  seed()
    .then(() => sequelize.close())
    .catch(async (err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
