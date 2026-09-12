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
const { syncSchema, ensureSchema } = require('./utils/schema');

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
const labTestRoutes = require('./routes/labTestRoutes');
const immunizationRoutes = require('./routes/immunizationRoutes');
const admissionRoutes = require('./routes/admissionRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const reportRoutes = require('./routes/reportRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const backupRoutes = require('./routes/backupRoutes');
const publicRoutes = require('./routes/publicRoutes');
const { startReminderScheduler } = require('./utils/reminderScheduler');
const { startAlertScheduler } = require('./utils/alertDigest');
const patientPortalRoutes = require('./routes/patientPortalRoutes');
const aiRoutes = require('./routes/aiRoutes');
const cronRoutes = require('./routes/cronRoutes');
const setupRoutes = require('./routes/setupRoutes');

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
// Extra-strict limiter for the public, unauthenticated booking endpoint —
// this is the only write endpoint in the app with no JWT check at all, so it
// gets both this and the general limiter above stacked on top of it.
const publicBookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many booking attempts. Please try again later.' },
});
// A 4-6 digit portal PIN is a much smaller search space than a staff
// password, so its login gets an even tighter cap than loginLimiter.
const portalLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in a few minutes.' },
});
app.use('/api', generalLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/public/appointments', publicBookingLimiter);
app.use('/api/patient-portal/login', portalLoginLimiter);

// Vercel calls the exported app per request and never runs start(), so the
// schema work has no boot step to hang off. Do it on first use instead:
// memoised, so it costs one round of checks per cold start, not per request.
// Without this the deployed app can create tables but never alter them, and
// any column added after its database was created 500s with
// `column "<name>" does not exist`.
if (process.env.VERCEL) {
  app.use('/api', async (req, res, next) => {
    try {
      await ensureSchema();
      next();
    } catch (err) {
      next(err);
    }
  });
}

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
app.use('/api/lab-tests', labTestRoutes);
app.use('/api/immunizations', immunizationRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/admin', backupRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/patient-portal', patientPortalRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/setup', setupRoutes);

// Serves the built frontend (frontend/dist, from `npm run build` in frontend/)
// so the whole app can run as one process on one port for LAN/offline use —
// a no-op if nobody's built it yet, so the normal split dev workflow
// (Vite on :5173 + this server on :5000) is unaffected.
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  // Vite fingerprints every asset (index-CvDn2sHR.js), so those files can be
  // cached hard — a new build produces a new name. index.html must never be
  // cached: it's the only thing that maps to the current filenames, so a
  // stale copy pins the browser to a previous build's code.
  app.use(express.static(frontendDist, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (/[.-][A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|jpe?g|svg|webp)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    // Same no-cache rule as above: this path serves index.html for every
    // client-side route, so it must not pin the browser to an old build.
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await syncSchema();
    app.listen(PORT, () => {
      console.log(`HMS backend running on http://localhost:${PORT}`);
      startReminderScheduler();
      startAlertScheduler();
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// start() binds a port and treats any DB hiccup as fatal (process.exit) --
// both correct for the persistent LAN/local process this was written for,
// both wrong on Vercel: there's no port to bind (the exported app is called
// directly per-request), and exiting the process would kill every request
// the function happened to be handling, not just this one connection
// attempt. The schema there is brought up by the ensureSchema() middleware
// above instead — GET /api/setup/seed (routes/setupRoutes.js) is only for
// loading demo data, and force-reseeding through it destroys everything.
if (!process.env.VERCEL) {
  start();
}

module.exports = app;
