# MediCare HMS — Hospital Management System

A full-stack hospital management system with patient records, appointment scheduling,
doctor/staff management, billing & invoicing, and pharmacy inventory tracking.

**Stack:** Node.js + Express + Sequelize (SQLite) on the backend, React + Vite + Tailwind CSS
on the frontend, with JWT authentication and role-based access control.

## Features

- **Authentication & Roles** — Admin, Doctor, Receptionist, and Pharmacist accounts, each
  seeing only the modules relevant to their role.
- **Patient Management** — Register patients, search by name/MRN/phone, view full patient
  profiles including appointment history, medical records, and invoices.
- **Appointment Scheduling** — Book appointments between patients and doctors, filter by
  date/status, mark appointments completed or cancelled.
- **Doctor & Department Management** — Manage doctor profiles, specializations, consultation
  fees, availability, and organize doctors into departments.
- **Medical Records** — Doctors can log diagnoses, treatments, prescriptions, and vitals tied
  to a patient visit.
- **Billing & Invoicing** — Create itemized invoices (consultations, procedures, medicines,
  labs, etc.), apply discounts/tax, and record partial or full payments.
- **Pharmacy & Inventory** — Track medicine stock, unit prices, reorder levels, expiry dates,
  and log stock in/out transactions with automatic low-stock flags.
- **Dashboard** — At-a-glance stats: total patients, active doctors, today's appointments,
  outstanding revenue, monthly revenue, and low-stock alerts.

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

The login screen also has one-click buttons to fill in each demo account.

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
| Medical Records     | ✅    | ✅     | —             | —          |
| Doctors             | ✅    | View   | View          | View       |
| Departments         | ✅    | —      | —             | —          |
| Billing             | ✅    | —      | ✅            | —          |
| Pharmacy            | ✅    | —      | —             | ✅         |
| Staff Users         | ✅    | —      | —             | —          |

Access is enforced on both the frontend (navigation/routes) and backend (API middleware),
so directly calling the API with the wrong role will also be rejected with a 403.

## Deploying / going to production

This project is set up for local development out of the box. Before deploying it for real
use:

1. Set a strong, random `JWT_SECRET` in `backend/.env`.
2. Consider swapping SQLite for PostgreSQL/MySQL for concurrent multi-user production loads
   (Sequelize makes this a config change in `backend/config/db.js`, not a rewrite).
3. Build the frontend for production with `npm run build` in `frontend/` and serve the
   `dist/` folder from a static host or from the Express server itself.
4. Add HTTPS, rate limiting, and audit logging appropriate for handling real patient data
   (HIPAA or your local equivalent regulations may apply).

## API Overview

All endpoints are prefixed with `/api` and (except `/auth/login`) require a
`Authorization: Bearer <token>` header obtained from `/api/auth/login`.

- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password`
- `GET/POST/PUT/DELETE /api/patients`
- `GET/POST/PUT/DELETE /api/doctors`
- `GET/POST/PUT/DELETE /api/departments`
- `GET/POST/PUT/DELETE /api/appointments`
- `GET/POST/PUT/DELETE /api/medical-records`
- `GET/POST/PUT/DELETE /api/invoices`, `POST /api/invoices/:id/payments`
- `GET/POST/PUT/DELETE /api/medicines`, `POST /api/medicines/:id/stock`
- `GET/POST/PUT/DELETE /api/users` (admin only)
- `GET /api/dashboard/summary`
