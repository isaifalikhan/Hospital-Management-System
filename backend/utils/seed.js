require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  sequelize, User, Department, Doctor, Patient, Appointment, MedicalRecord,
  Invoice, InvoiceItem, Medicine, StockTransaction,
} = require('../models');

async function seed() {
  await sequelize.sync({ force: true });
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

  console.log('\nSeed complete! Login credentials (all passwords: password123):');
  console.log('  Admin:        admin / password123');
  console.log('  Doctor:       sjohnson / password123');
  console.log('  Receptionist: reception / password123');
  console.log('  Pharmacist:   pharmacist / password123');

  await sequelize.close();
}

seed().catch(async (err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
