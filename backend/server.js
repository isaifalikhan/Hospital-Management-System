require('dotenv').config();
const validateEnv = require('./config/validateEnv');
validateEnv();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./models');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const labOrderRoutes = require('./routes/labOrderRoutes');
const admissionRoutes = require('./routes/admissionRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const reportRoutes = require('./routes/reportRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const shiftRoutes = require('./routes/shiftRoutes');

const app = express();

app.use(helmet());
// Frontend and backend are same-origin in dev (Vite proxy) and in the
// documented Vercel deployment (rewrites /api to this server), so CORS is
// only actually needed for a separately-hosted frontend — restrict it
// instead of reflecting every origin for a PII/PHI-handling API.
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Generous general limiter, tighter one specifically on login to slow down
// credential-guessing without getting in the way of normal app usage.
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in a few minutes.' },
});
app.use('/api', generalLimiter);
app.use('/api/auth/login', loginLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/lab-orders', labOrderRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/shifts', shiftRoutes);

// Serves the built frontend (frontend/dist, from `pnpm -C frontend run build`)
// so the whole app can run as one process on one port for LAN/offline use —
// a no-op if nobody's built it yet, so the normal split dev workflow
// (Vite on :5173 + this server on :5000) is unaffected.
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // creates tables if they don't exist
    // Enforces "one active appointment per doctor/date/time" at the DB level
    // so two concurrent booking requests can't both pass the app-level clash
    // check and double-book the same slot. Cancelled appointments are
    // excluded so a freed-up slot can be rebooked.
    await sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS appointments_doctor_date_time_active
       ON appointments (doctorId, date, time)
       WHERE status <> 'cancelled'`
    );
    app.listen(PORT, () => {
      console.log(`HMS backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
