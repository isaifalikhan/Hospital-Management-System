const { body, query, param } = require('express-validator');

const authValidators = {
  login: [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
};

const userValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['admin', 'doctor', 'receptionist', 'pharmacist']).withMessage('Invalid role'),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email address'),
  ],
  update: [
    body('role').optional().isIn(['admin', 'doctor', 'receptionist', 'pharmacist']).withMessage('Invalid role'),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email address'),
    body('password').optional({ values: 'falsy' }).isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
};

const patientValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Patient name is required'),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email address'),
    body('gender').optional({ values: 'falsy' }).isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
    body('dob').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date of birth'),
  ],
  update: [
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email address'),
    body('gender').optional({ values: 'falsy' }).isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
    body('dob').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date of birth'),
  ],
};

const doctorValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Doctor name is required'),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email address'),
    body('consultationFee').optional().isFloat({ min: 0 }).withMessage('Consultation fee must be a positive number'),
  ],
};

const appointmentValidators = {
  create: [
    body('patientId').isInt().withMessage('A valid patientId is required'),
    body('doctorId').isInt().withMessage('A valid doctorId is required'),
    body('date').isISO8601().withMessage('A valid date (YYYY-MM-DD) is required'),
    body('time').matches(/^\d{2}:\d{2}$/).withMessage('Time must be in HH:MM format'),
  ],
  availableSlots: [
    query('date').isISO8601().withMessage('A valid date query param is required'),
  ],
};

const invoiceValidators = {
  create: [
    body('patientId').isInt().withMessage('A valid patientId is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one invoice item is required'),
    body('items.*.description').trim().notEmpty().withMessage('Every item needs a description'),
    body('items.*.quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
    body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be 0 or more'),
  ],
  payment: [
    body('amount').isFloat({ gt: 0 }).withMessage('Payment amount must be greater than 0'),
  ],
};

const medicineValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Medicine name is required'),
    body('unitPrice').optional().isFloat({ min: 0 }).withMessage('Unit price must be 0 or more'),
    body('quantityInStock').optional().isInt({ min: 0 }).withMessage('Quantity must be 0 or more'),
  ],
  stock: [
    body('type').isIn(['in', 'out']).withMessage("type must be 'in' or 'out'"),
    body('quantity').isInt({ gt: 0 }).withMessage('Quantity must be a positive integer'),
  ],
};

const admissionValidators = {
  create: [
    body('patientId').isInt().withMessage('A valid patientId is required'),
    body('ward').trim().notEmpty().withMessage('Ward is required'),
    body('bedNumber').trim().notEmpty().withMessage('Bed number is required'),
  ],
};

const labOrderValidators = {
  create: [
    body('patientId').isInt().withMessage('A valid patientId is required'),
    body('testName').trim().notEmpty().withMessage('Test name is required'),
  ],
};

module.exports = {
  authValidators,
  userValidators,
  patientValidators,
  doctorValidators,
  appointmentValidators,
  invoiceValidators,
  medicineValidators,
  admissionValidators,
  labOrderValidators,
};
