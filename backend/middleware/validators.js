const { body, query, param } = require('express-validator');
const { DAY_NAMES: WEEKDAY_NAMES } = require('../utils/scheduling');

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
    // Optional — only meaningful when role === 'doctor'. userController.create
    // uses these to also create (or, via doctorId, link) a Doctor profile in
    // the same request, so a new doctor account is immediately bookable
    // rather than just able to log in with no clinical profile.
    body('doctorId').optional({ values: 'falsy' }).isInt().withMessage('A valid doctorId is required to link an existing doctor profile'),
    body('specialization').optional({ values: 'falsy' }).trim().isString(),
    body('qualification').optional({ values: 'falsy' }).trim().isString(),
    body('departmentId').optional({ values: 'falsy' }).isInt().withMessage('A valid departmentId is required'),
    body('consultationFee').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Consultation fee must be a positive number'),
    body('phone').optional({ values: 'falsy' }).trim().isString(),
    body('availableTime').optional({ values: 'falsy' }).matches(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage('availableTime must be in "HH:MM-HH:MM" format, e.g. "09:00-17:00"'),
    body('availableDays').optional({ values: 'falsy' }).custom((value) => validAvailableDays(value)),
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
  setPortalPin: [
    body('pin').matches(/^\d{4,6}$/).withMessage('PIN must be 4-6 digits'),
    body('portalEmail').optional({ values: 'falsy' }).isEmail().withMessage('Invalid portal email address'),
  ],
};

const TIME_RANGE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

function validAvailableDays(value) {
  const days = String(value).split(',').map((d) => d.trim());
  if (!days.length || !days.every((d) => WEEKDAY_NAMES.includes(d))) {
    throw new Error(`availableDays must be a comma-separated list of ${WEEKDAY_NAMES.join(', ')}`);
  }
  return true;
}

const doctorAvailabilityRules = [
  body('availableTime').optional({ values: 'falsy' }).matches(TIME_RANGE)
    .withMessage('availableTime must be in "HH:MM-HH:MM" format, e.g. "09:00-17:00"'),
  body('availableDays').optional({ values: 'falsy' }).custom(validAvailableDays),
];

const doctorValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Doctor name is required'),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email address'),
    body('consultationFee').optional().isFloat({ min: 0 }).withMessage('Consultation fee must be a positive number'),
    ...doctorAvailabilityRules,
  ],
  update: [
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email address'),
    body('consultationFee').optional().isFloat({ min: 0 }).withMessage('Consultation fee must be a positive number'),
    ...doctorAvailabilityRules,
  ],
};

const appointmentValidators = {
  // date/time are only required for a 'scheduled' (default) appointment —
  // a 'walk-in' front-desk check-in has the server assign today's date, the
  // actual check-in time, and a queue tokenNumber instead (see
  // controllers/appointmentController.js#create).
  create: [
    body('patientId').isInt().withMessage('A valid patientId is required'),
    body('doctorId').isInt().withMessage('A valid doctorId is required'),
    body('visitType').optional().isIn(['scheduled', 'walk-in']).withMessage('visitType must be "scheduled" or "walk-in"'),
    body('date').if(body('visitType').not().equals('walk-in')).isISO8601().withMessage('A valid date (YYYY-MM-DD) is required'),
    body('time').if(body('visitType').not().equals('walk-in')).matches(/^\d{2}:\d{2}$/).withMessage('Time must be in HH:MM format'),
    body('isVideoConsult').optional().isBoolean().withMessage('isVideoConsult must be true or false'),
  ],
  availableSlots: [
    query('date').isISO8601().withMessage('A valid date query param is required'),
  ],
};

const patientPortalValidators = {
  login: [
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('pin').matches(/^\d{4,6}$/).withMessage('PIN must be 4-6 digits'),
  ],
  bookAppointment: [
    body('doctorId').isInt().withMessage('A valid doctorId is required'),
    body('date').isISO8601().withMessage('A valid date (YYYY-MM-DD) is required'),
    body('time').matches(/^\d{2}:\d{2}$/).withMessage('Time must be in HH:MM format'),
    body('isVideoConsult').optional().isBoolean().withMessage('isVideoConsult must be true or false'),
  ],
};

const aiValidators = {
  summary: [
    body('title').optional({ values: 'falsy' }).isString(),
    body('patientName').optional({ values: 'falsy' }).isString(),
    body('fields').isObject().withMessage('fields must be an object of label -> value'),
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
  discharge: [
    body('dischargeNotes').optional({ values: 'falsy' }).isString().withMessage('dischargeNotes must be text'),
    // Base64 PNG data URL produced by the signature pad canvas (see SignaturePad.jsx).
    body('signatureData').optional({ values: 'falsy' }).isString().withMessage('signatureData must be a base64 PNG string'),
  ],
};

const labOrderValidators = {
  create: [
    body('patientId').isInt().withMessage('A valid patientId is required'),
    body('testName').trim().notEmpty().withMessage('Test name is required'),
  ],
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const shiftValidators = {
  create: [
    body('userId').isInt().withMessage('A valid userId is required'),
    body('date').isISO8601().withMessage('A valid date (YYYY-MM-DD) is required'),
    body('startTime').matches(HHMM).withMessage('startTime must be in HH:MM format'),
    body('endTime').matches(HHMM).withMessage('endTime must be in HH:MM format'),
  ],
  update: [
    body('userId').optional().isInt().withMessage('A valid userId is required'),
    body('date').optional({ values: 'falsy' }).isISO8601().withMessage('A valid date (YYYY-MM-DD) is required'),
    body('startTime').optional({ values: 'falsy' }).matches(HHMM).withMessage('startTime must be in HH:MM format'),
    body('endTime').optional({ values: 'falsy' }).matches(HHMM).withMessage('endTime must be in HH:MM format'),
  ],
};

const medicalRecordValidators = {
  create: [
    body('patientId').isInt().withMessage('A valid patientId is required'),
    // Base64 PNG data URL produced by the signature pad canvas (see SignaturePad.jsx).
    body('signatureData').optional({ values: 'falsy' }).isString().withMessage('signatureData must be a base64 PNG string'),
  ],
};

const immunizationValidators = {
  create: [
    body('patientId').isInt().withMessage('A valid patientId is required'),
    body('vaccineName').trim().notEmpty().withMessage('Vaccine name is required'),
    body('dateGiven').isISO8601().withMessage('A valid date given (YYYY-MM-DD) is required'),
    body('doseNumber').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Dose number must be a positive integer'),
    body('nextDueDate').optional({ values: 'falsy' }).isISO8601().withMessage('nextDueDate must be a valid date (YYYY-MM-DD)'),
  ],
  update: [
    body('vaccineName').optional().trim().notEmpty().withMessage('Vaccine name cannot be empty'),
    body('dateGiven').optional().isISO8601().withMessage('A valid date given (YYYY-MM-DD) is required'),
    body('doseNumber').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Dose number must be a positive integer'),
    body('nextDueDate').optional({ values: 'falsy' }).isISO8601().withMessage('nextDueDate must be a valid date (YYYY-MM-DD)'),
  ],
};

const dashboardValidators = {
  ownerInsights: [
    query('startDate').optional({ values: 'falsy' }).isISO8601().withMessage('startDate must be a valid date (YYYY-MM-DD)'),
    query('endDate').optional({ values: 'falsy' }).isISO8601().withMessage('endDate must be a valid date (YYYY-MM-DD)'),
  ],
};

// Extra-strict validation for the one endpoint in the app with no auth at
// all (public, unauthenticated appointment booking) — see
// controllers/publicController.js and routes/publicRoutes.js.
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

const publicValidators = {
  book: [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }).withMessage('Name is too long'),
    body('phone').trim().notEmpty().withMessage('Phone number is required').matches(PHONE_RE).withMessage('Enter a valid phone number'),
    body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Invalid email address').isLength({ max: 254 }),
    body('doctorId').isInt().withMessage('A valid doctorId is required'),
    body('date').isISO8601().withMessage('A valid date (YYYY-MM-DD) is required')
      .custom((value) => {
        const today = new Date().toISOString().slice(0, 10);
        if (String(value).slice(0, 10) < today) throw new Error('Date cannot be in the past');
        return true;
      }),
    body('time').matches(/^\d{2}:\d{2}$/).withMessage('Time must be in HH:MM format'),
    body('reason').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Reason is too long'),
  ],
  queue: [
    query('date').optional({ values: 'falsy' }).isISO8601().withMessage('date must be a valid date (YYYY-MM-DD)'),
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
  shiftValidators,
  medicalRecordValidators,
  immunizationValidators,
  dashboardValidators,
  publicValidators,
  patientPortalValidators,
  aiValidators,
};
