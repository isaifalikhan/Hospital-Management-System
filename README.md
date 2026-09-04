# MediCare HMS — Hospital Management System

A full-stack hospital management system with patient records, appointment scheduling,
doctor/staff management, billing & invoicing, and pharmacy inventory tracking.

**Stack:** Node.js + Express + Sequelize (SQLite) on the backend, React + Vite + Tailwind CSS
on the frontend, with JWT authentication and role-based access control.

## Features

- **Authentication & Roles** — Admin, Doctor, Receptionist, and Pharmacist accounts, each
  seeing only the modules relevant to their role. Login is rate-limited and the server
  fails fast with a clear error if `JWT_SECRET` isn't configured. Any logged-in user can
  change their own password from the sidebar.
- **Staff Account Creation** — Admins create login accounts for every role from the Staff
  Users page. Creating a **doctor** account also creates (or links to an existing,
  login-less) clinical profile in the same step — specialization, department, consultation
  fee, availability — so the new doctor is immediately bookable everywhere doctors are
  selectable (Check-In, Appointments, public booking, the patient portal), not just able
  to log in.
- **Patient Management** — Register patients, search by name/MRN/phone, view full patient
  profiles including a unified visit timeline (appointments, records, lab orders,
  admissions, invoices), medical records, lab orders, admissions, and invoices. Export
  the patient list to CSV.
- **Appointment Scheduling** — Book appointments between patients and doctors in a list or
  weekly calendar view, with automatic double-booking prevention and a live available-slot
  picker driven by each doctor's configured availability. Export to CSV.
- **Doctor & Department Management** — Manage doctor profiles, specializations, consultation
  fees, availability, and organize doctors into departments.
- **Medical Records & Prescriptions** — Doctors log diagnoses, treatments, structured
  vitals (BP, temperature, pulse, weight), and structured line-item prescriptions tied to
  a patient visit; pharmacists dispense each prescription item, which deducts stock from
  inventory automatically. A Vitals Trend chart on the patient chart plots BP/temperature/
  pulse over every recorded visit.
- **Immunization Tracking** — Log vaccines given per patient (dose number, batch, who
  administered it, next-due date) from the patient chart, alongside the rest of their
  clinical history.
- **File & Image Attachments** — Attach files (lab reports, scans, photos) to a medical
  record, lab order, or admission, stored directly in the database — no external storage
  needed. Viewable and downloadable from wherever that record is shown.
- **Lab Orders** — Order lab tests for a patient, track status (ordered → in progress →
  completed), flag urgent priority, and record results — both from the patient chart and
  from a hospital-wide Lab Orders queue.
- **Admissions / Inpatient Ward** — Admit patients to a ward and bed, track active vs.
  discharged admissions hospital-wide, and discharge with notes (automatically updating the
  patient's status).
- **Billing & Invoicing** — Create itemized invoices (consultations, procedures, medicines,
  labs, etc.), apply discounts/tax, record partial or full payments, print or save an
  invoice as a PDF, and export invoices to CSV.
- **Pharmacy & Inventory** — Track medicine stock, unit prices, reorder levels, expiry dates,
  and log stock in/out transactions with automatic low-stock flags and reorder-quantity
  suggestions for anything at or below its reorder level.
- **Dashboard & Analytics** — At-a-glance stats plus a 14-day revenue trend chart, an
  appointments-booked trend chart, and an appointments-by-department breakdown, all
  built with Recharts.
- **Audit Log** — Every create/update/delete across the system is recorded with who did it
  and when; admins can filter and review it from a dedicated page.
- **Staff Attendance** — Any logged-in staff member can clock in/out for their shift from a
  dedicated Attendance page; admins get a hospital-wide attendance table filterable by staff
  member and date range, while everyone else only ever sees their own clock-in history.
- **Shift Roster** — Admins assign weekly shifts (date, start/end time, notes) to staff from a
  roster table with full CRUD; every staff member can view their own upcoming shifts from the
  same page.
- **Production Hardening** — `helmet` security headers, general + login-specific rate
  limiting, request validation on every write endpoint (`express-validator`), and
  fail-fast environment validation on startup.
- **Admin Data Backup** — Admins can download a full, on-demand backup of the system's data
  from a dedicated Data Backup page: a timestamped SQLite file snapshot on a local/LAN
  install, or a JSON export of every table when running against hosted Postgres. Restricted
  to the Admin role and recorded in the Audit Log.
- **E-Signature Capture** — A lightweight, dependency-free signature pad (plain HTML5
  canvas, no UI library) lets doctors sign off medical records and discharge summaries with
  mouse or touch. Signatures are stored as base64 PNGs and rendered on the printable medical
  record and discharge summary views alongside the rest of the print/PDF workflow.
- **Owner Insights** — Admin-only reporting page with revenue broken down by doctor and by
  department, doctor utilization (completed appointments vs. each doctor's configured
  available slots), and ward/bed occupancy, all over a selectable date range (defaults to
  the last 30 days). Export the same report to CSV.
- **Front Desk Check-In** — A dedicated Check-In page (admin/receptionist) for walk-in
  patients: search for an existing patient or register a new one on the spot, pick a
  doctor, and submit — no date/time picker. The server assigns today's date, the actual
  check-in time, and a per-doctor daily queue token number automatically (`Token #N`),
  shown prominently on confirmation and alongside the visit everywhere else in the app
  (Appointments list/calendar). Walk-ins queue by token rather than a booked time slot,
  so any number of them can share a doctor's day without colliding.
- **Live Queue Board** — A staff Queue page (`/queue`) to call the next walk-in token,
  mark one done, undo an accidental call, or mark a no-show, grouped by doctor. Pairs
  with an unauthenticated waiting-room display (`/queue-display`, meant for a lobby TV)
  that auto-refreshes and shows only "Now Serving #N" and the next few token numbers per
  doctor — deliberately no patient names, so it's safe on a public screen.
- **Public Online Booking** — A no-login booking page (`/book`, linked from the login
  screen) lets a walk-in web visitor pick a doctor and a genuinely open slot (reusing the
  same availability logic as the staff scheduler) and submit their own name, phone,
  optional email, and reason. Find-or-creates the patient by phone and books the
  appointment directly. It's the one endpoint in the app with no login required, so it's
  strictly rate-limited and every field is validated defensively.
- **Appointment Reminder Emails** — A background scheduler checks every ~15 minutes for
  scheduled appointments 24-26 hours out and emails the patient a reminder (via
  `backend/utils/emailService.js`, using `nodemailer`). With no SMTP configured, reminders
  are simply logged to the console instead of sent, so the feature works out of the box.
  On Vercel, the `setInterval` scheduler can't survive between stateless function
  invocations — set `CRON_SECRET` and Vercel's own cron (already configured in
  `vercel.json`) will hit `GET /api/cron/reminders` on the same schedule instead.
- **UPI QR Payment Nudge** — When the hospital configures `UPI_ID`, the invoice detail/print
  view renders a scan-to-pay UPI QR code for the outstanding balance. Front desk still
  records the actual payment manually — this is a convenience nudge, not a live payment
  gateway integration.
- **Patient Self-Service Portal** — A separate, patient-facing login (phone number + a
  short PIN a receptionist/admin sets from the patient's profile) at `/portal/login`, kept
  entirely independent of staff auth (its own JWT role, its own browser session/storage).
  From `/portal` a patient can view their own upcoming/past appointments, book or cancel an
  appointment against a doctor's live availability, see patient-appropriate medical record
  summaries (diagnosis/treatment only — full clinical detail stays staff-only), and view
  their invoices. Every endpoint is scoped strictly to the logged-in patient's own records.
- **AI-Assisted Note Drafting** — A "Generate Summary" button on discharge notes
  (Admissions) and medical record notes (patient chart) drafts a paragraph from the
  diagnosis/treatment/vitals or ward/admission details already entered, which the
  doctor/receptionist can edit before saving — nothing is ever auto-saved. Works out of the
  box with a built-in template (no API key required); set `AI_API_KEY` to have an LLM draft
  it instead.
- **Telemedicine / Video Consultations** — Mark any appointment (staff-booked or
  patient-booked) as a video consult to generate a free Jitsi Meet link automatically (no
  account or API key needed); a "Join Video Call" button appears wherever that appointment
  is shown, including the patient portal.

## Project Structure

```
hospital-management-system/
├── backend/          Express REST API + SQLite database
│   ├── config/       Database configuration
│   ├── models/       Sequelize models & associations
│   ├── controllers/  Route handlers / business logic
│   ├── routes/       Express routers
│   ├── middleware/   JWT auth, role checks, error handling
│   └── utils/seed.js Sample data seeder
└── frontend/         React + Vite + Tailwind single-page app
    └── src/
        ├── api/       Axios API client
        ├── context/   Auth context/provider
        ├── components/Shared UI (layout, modal, badges, etc.)
        └── pages/     One file per screen
```

## Getting Started

You'll need **Node.js 18+** installed. Run the backend and frontend in two terminals.

### 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
npm run seed     # creates the SQLite DB and loads sample data
npm run dev       # starts the API on http://localhost:5000 (or `npm start` without auto-reload)
```

### 2. Frontend setup

```bash
cd frontend
npm install
npm run dev       # starts the app on http://localhost:5173
```

Open **http://localhost:5173** in your browser. The Vite dev server proxies `/api` requests
to the backend automatically (see `frontend/vite.config.js`), so no extra configuration is
needed in development.

### Demo login credentials

All seeded accounts use the password `password123`.

| Role         | Username      |
|--------------|---------------|
| Admin        | `admin`       |
| Doctor       | `sjohnson`    |
| Receptionist | `reception`   |
| Pharmacist   | `pharmacist`  |

The login screen also has one-click buttons to fill in each demo account — but only while
running the Vite dev server (`import.meta.env.DEV`). A production build (Vercel or any other
deploy) never renders that panel or ships the `password123` string in its JS bundle, since
handing out working admin/doctor/receptionist/pharmacist logins to anyone who finds the URL
is a real liability, not a demo convenience, once the app is live. **Hiding the button does
not revoke the accounts** — see the next section.

## Resetting sample data

Running `npm run seed` again from the `backend` folder will **wipe and recreate** the
database with fresh sample data (5 patients, 4 doctors, 4 departments, appointments,
a couple of invoices, and a small medicine inventory).

## Role permissions at a glance

| Module              | Admin | Doctor | Receptionist | Pharmacist |
|---------------------|:-----:|:------:|:-------------:|:----------:|
| Dashboard           | ✅    | ✅     | ✅            | ✅         |
| Patients            | ✅    | View   | ✅            | —          |
| Appointments        | ✅    | View   | ✅            | —          |
| Check-In (walk-in)  | ✅    | —      | ✅            | —          |
| Queue               | ✅    | ✅     | ✅            | —          |
| Lab Orders          | ✅    | ✅     | —             | —          |
| Admissions          | ✅    | ✅     | ✅            | —          |
| Medical Records     | ✅    | ✅     | —             | —          |
| Prescription Dispense | ✅  | —      | —             | ✅         |
| Doctors             | ✅    | View   | View          | View       |
| Departments         | ✅    | —      | —             | —          |
| Billing             | ✅    | —      | ✅            | —          |
| Pharmacy            | ✅    | —      | —             | ✅         |
| Staff Users         | ✅    | —      | —             | —          |
| Audit Log           | ✅    | —      | —             | —          |
| Data Backup         | ✅    | —      | —             | —          |
| Attendance          | ✅ (hospital-wide) | Own | Own      | Own        |
| Shift Roster        | ✅ (assign/edit)   | View own | View own | View own |
| Owner Insights      | ✅    | —      | —             | —          |

Access is enforced on both the frontend (navigation/routes) and backend (API middleware),
so directly calling the API with the wrong role will also be rejected with a 403.

## Deploying / going to production

This project is set up for local development out of the box. Before deploying it for real
use:

1. Set a strong, random `JWT_SECRET` in `backend/.env`.
2. **Change every demo account's password** (`admin`, `sjohnson`, `reception`, `pharmacist` —
   all `password123` out of the box) from Staff Users once you have your own admin login, or
   delete those accounts outright. The production build already hides the one-click login
   panel (see Demo login credentials above), but the accounts themselves still work with the
   password published in this README until you change them — that's a real login, not a UI
   convenience, and this repo being public means that password is public too.
3. Consider swapping SQLite for PostgreSQL/MySQL for concurrent multi-user production loads
   (Sequelize makes this a config change in `backend/config/db.js`, not a rewrite).
4. Build the frontend for production with `npm run build` in `frontend/` and serve the
   `dist/` folder from a static host or from the Express server itself.
5. Add HTTPS, rate limiting, and audit logging appropriate for handling real patient data
   (HIPAA or your local equivalent regulations may apply).
6. On Vercel specifically, set `CRON_SECRET` so `GET /api/cron/reminders` (already scheduled
   in `vercel.json`) can run appointment reminders — see Appointment Reminder Emails above.
   Vercel's free/Hobby tier historically limits how often a cron job actually fires (daily,
   not every 15 minutes); check your plan's current cron limits and adjust the schedule in
   `vercel.json` if needed.
7. First-time setup on a fresh hosted database (e.g. a new Vercel Postgres instance): set
   `SETUP_SECRET`, then hit `GET /api/setup/seed?secret=...` once to create the schema and
   demo accounts (refuses to run if any user already exists, unless `&force=true`). Remove
   `SETUP_SECRET` and delete `backend/routes/setupRoutes.js` once you're past the demo stage.
8. When you're ready to move a deployment from demo data to real use, run
   `node backend/utils/clearDemoData.js` (needs the same DB env vars as the server) — it
   deletes all clinical/business data (patients, appointments, records, invoices, medicines,
   etc.) but leaves the `users` table untouched, so existing logins keep working.

## API Overview

All endpoints are prefixed with `/api` and (except `/auth/login`) require a
`Authorization: Bearer <token>` header obtained from `/api/auth/login`.

- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password`
- `GET/POST/PUT/DELETE /api/patients`
- `GET/POST/PUT/DELETE /api/doctors`
- `GET/POST/PUT/DELETE /api/departments`
- `GET/POST/PUT/DELETE /api/appointments` — `POST` accepts `visitType: 'walk-in'` for a
  front-desk check-in (only `patientId`/`doctorId` required; server assigns date, time, and
  `tokenNumber`) instead of the default `'scheduled'` (requires `date`/`time`, no token)
- `GET/POST/PUT/DELETE /api/medical-records`, `POST /api/medical-records/prescription-items/:itemId/dispense`
- `GET /api/doctors/:id/available-slots?date=YYYY-MM-DD`
- `GET/POST/PUT/DELETE /api/lab-orders`
- `GET/POST/PUT/DELETE /api/immunizations`
- `GET /api/attachments?entityType=&entityId=`, `POST /api/attachments` (multipart upload),
  `GET /api/attachments/:id/file`, `DELETE /api/attachments/:id` — `entityType` is one of
  `MedicalRecord`, `LabOrder`, `Admission`
- `GET/POST/PUT/DELETE /api/admissions`, `POST /api/admissions/:id/discharge`
- `GET/POST/PUT/DELETE /api/invoices`, `POST /api/invoices/:id/payments`
- `GET/POST/PUT/DELETE /api/medicines`, `POST /api/medicines/:id/stock`
- `GET/POST/PUT/DELETE /api/users` (admin only) — `POST` with `role: 'doctor'` also creates
  or links a Doctor profile; pass `doctorId` to link an existing unlinked profile, or
  `specialization`/`departmentId`/`consultationFee`/`phone`/`availableDays`/`availableTime`
  to create a new one
- `GET /api/doctors?unlinked=true` — doctor profiles with no linked login yet
- `GET /api/dashboard/summary`, `GET /api/dashboard/analytics`
- `GET /api/audit-logs` (admin only)
- `GET /api/reports/patients.csv`, `/api/reports/appointments.csv`, `/api/reports/invoices.csv`
- `GET /api/admin/backup` (admin only) — downloads a SQLite file snapshot locally, or a JSON
  export of every table when running on Postgres
- `GET /api/attendance` (admin sees everyone, filterable by `userId`/`from`/`to`; other roles
  always see only their own records), `POST /api/attendance/clock-in`, `POST /api/attendance/clock-out`
- `GET/POST/PUT/DELETE /api/shifts` (create/update/delete admin only; `GET` scoped the same way
  as `/api/attendance` — admin sees the whole roster, everyone else only their own shifts)
- `GET /api/dashboard/owner-insights?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` (admin only;
  both params optional, defaults to the last 30 days)
- `GET /api/reports/owner-insights.csv?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` (admin only)
- `GET /api/public/doctors`, `GET /api/public/doctors/:id/available-slots?date=YYYY-MM-DD`,
  `POST /api/public/appointments` — no auth required (public booking; rate-limited)
- `GET /api/public/queue?date=YYYY-MM-DD` — no auth required; token numbers and doctor
  names only, never patient names (waiting-room display)
- `GET /api/cron/reminders` — no JWT; requires `Authorization: Bearer <CRON_SECRET>` instead.
  Runs the same reminder logic as the local scheduler; meant to be called by Vercel Cron, not
  the frontend. Returns 501 if `CRON_SECRET` isn't configured.
- `GET /api/setup/seed?secret=<SETUP_SECRET>` — one-time hosted-DB bootstrap, see Deploying
  above. Returns 501 if `SETUP_SECRET` isn't configured, 409 if the database isn't empty
  (unless `&force=true`).
- `PUT /api/patients/:id/portal-pin` (admin/receptionist — sets a patient's portal login PIN)
- `POST /api/ai/summary` (admin/doctor/receptionist — drafts a summary from structured
  fields; see AI-Assisted Note Drafting above)

### Patient portal (separate auth — phone + PIN, not a staff token)

All prefixed with `/api/patient-portal` and, except `/login`, require a
`Authorization: Bearer <token>` header from `POST /api/patient-portal/login` (a token with
staff credentials will not work here, and vice versa). Every response is scoped to the
logged-in patient's own data.

- `POST /api/patient-portal/login` — body `{ phone, pin }`
- `GET /api/patient-portal/me`
- `GET /api/patient-portal/doctors`, `GET /api/patient-portal/doctors/:doctorId/available-slots?date=YYYY-MM-DD`
- `GET /api/patient-portal/appointments`, `POST /api/patient-portal/appointments`,
  `POST /api/patient-portal/appointments/:id/cancel`
- `GET /api/patient-portal/medical-records` (diagnosis/treatment summaries only)
- `GET /api/patient-portal/invoices`

## Changelog

### v3 — Patient portal, AI-assisted notes, telemedicine

- A patient self-service portal (`/portal/login`, `/portal`) with its own phone+PIN login
  and JWT role (`patient`), fully separate from staff auth. Patients can view their own
  appointments, book/cancel against live doctor availability, see diagnosis/treatment-only
  medical record summaries, and view their invoices — every endpoint scoped to the logged-in
  patient's own id.
- `Patient.portalPin` (bcrypt-hashed, like staff passwords) and `Patient.portalEmail`,
  settable by an admin/receptionist from the patient profile screen.
- AI-assisted drafting for discharge notes and medical record notes: a "Generate Summary"
  button pre-fills an editable textarea from the diagnosis/treatment/vitals or admission
  details already on the form. Uses a built-in deterministic template by default (zero
  config); set `AI_API_KEY` to have it call an LLM instead. Never auto-saves — a human
  always reviews before submitting.
- `Appointment.isVideoConsult` + `videoLink`: marking an appointment (staff- or
  patient-booked) as a video consult generates a free Jitsi Meet room automatically; a
  "Join Video Call" button appears on the appointment wherever it's shown.

### v2 — Clinical depth, scheduling polish, analytics & hardening

- Structured prescription line items (medicine, dosage, frequency, duration, quantity)
  linked to medical records, with a dispense workflow that deducts inventory stock.
- Lab orders (ordered/in-progress/completed/cancelled, routine/urgent) with a hospital-wide
  queue page in addition to the per-patient view.
- Inpatient admissions (ward, bed, admit/discharge) with a hospital-wide ward overview page.
- A unified visit timeline on the patient detail page merging appointments, records, lab
  orders, admissions, and invoices into one chronological feed.
- Appointments calendar (weekly) view alongside the existing list view, plus a live
  available-slot picker when booking that respects each doctor's configured hours and
  existing bookings; double-booking is now rejected server-side with a 409.
- Dashboard analytics: revenue trend, appointments-booked trend, and appointments-by-
  department charts (Recharts), backed by a new `/api/dashboard/analytics` endpoint.
- CSV export for Patients, Appointments, and Invoices; invoice print/PDF via the browser's
  print dialog.
- A system-wide, admin-only Audit Log recording every create/update/delete with who did it.
- Production hardening: `helmet` security headers, general + login rate limiting,
  `express-validator` request validation on every write endpoint, and a fail-fast
  environment check on startup (missing `JWT_SECRET` now stops the server with a clear
  message instead of surfacing as a confusing 500 on login).
