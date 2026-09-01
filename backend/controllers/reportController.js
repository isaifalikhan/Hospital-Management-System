const { Patient, Appointment, Invoice, Doctor } = require('../models');
const { toCsv, sendCsv } = require('../utils/csv');

exports.exportPatients = async (req, res, next) => {
  try {
    const patients = await Patient.findAll({ order: [['createdAt', 'DESC']] });
    const csv = toCsv(patients, [
      { label: 'MRN', value: (p) => p.mrn },
      { label: 'Name', value: (p) => p.name },
      { label: 'DOB', value: (p) => p.dob },
      { label: 'Gender', value: (p) => p.gender },
      { label: 'Blood Group', value: (p) => p.bloodGroup },
      { label: 'Phone', value: (p) => p.phone },
      { label: 'Email', value: (p) => p.email },
      { label: 'Status', value: (p) => p.status },
      { label: 'Registered On', value: (p) => p.createdAt?.toISOString().slice(0, 10) },
    ]);
    sendCsv(res, `patients-${Date.now()}.csv`, csv);
  } catch (err) { next(err); }
};

exports.exportAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.findAll({
      include: [{ model: Patient, attributes: ['name', 'mrn'] }, { model: Doctor, attributes: ['name'] }],
      order: [['date', 'DESC']],
    });
    const csv = toCsv(appointments, [
      { label: 'Date', value: (a) => a.date },
      { label: 'Time', value: (a) => a.time },
      { label: 'Patient', value: (a) => a.Patient?.name },
      { label: 'MRN', value: (a) => a.Patient?.mrn },
      { label: 'Doctor', value: (a) => a.Doctor?.name },
      { label: 'Reason', value: (a) => a.reason },
      { label: 'Status', value: (a) => a.status },
    ]);
    sendCsv(res, `appointments-${Date.now()}.csv`, csv);
  } catch (err) { next(err); }
};

exports.exportInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.findAll({
      include: [{ model: Patient, attributes: ['name', 'mrn'] }],
      order: [['createdAt', 'DESC']],
    });
    const csv = toCsv(invoices, [
      { label: 'Invoice #', value: (i) => i.invoiceNumber },
      { label: 'Date', value: (i) => i.date },
      { label: 'Patient', value: (i) => i.Patient?.name },
      { label: 'MRN', value: (i) => i.Patient?.mrn },
      { label: 'Subtotal', value: (i) => i.subtotal },
      { label: 'Discount', value: (i) => i.discount },
      { label: 'Tax', value: (i) => i.tax },
      { label: 'Total', value: (i) => i.total },
      { label: 'Amount Paid', value: (i) => i.amountPaid },
      { label: 'Status', value: (i) => i.status },
    ]);
    sendCsv(res, `invoices-${Date.now()}.csv`, csv);
  } catch (err) { next(err); }
};
