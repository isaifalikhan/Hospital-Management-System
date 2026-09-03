import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PatientPortalProvider } from './context/PatientPortalContext';
import ProtectedRoute from './components/ProtectedRoute';
import PatientPortalGuard from './components/PatientPortalGuard';
import Layout from './components/Layout';

import Login from './pages/Login';
import PatientPortalLogin from './pages/PatientPortalLogin';
import PatientPortal from './pages/PatientPortal';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Doctors from './pages/Doctors';
import Departments from './pages/Departments';
import Appointments from './pages/Appointments';
import Billing from './pages/Billing';
import Pharmacy from './pages/Pharmacy';
import StaffUsers from './pages/StaffUsers';
import LabOrders from './pages/LabOrders';
import Admissions from './pages/Admissions';
import AuditLog from './pages/AuditLog';
import Backup from './pages/Backup';
import Attendance from './pages/Attendance';
import Roster from './pages/Roster';
import Insights from './pages/Insights';
import PublicBooking from './pages/PublicBooking';
import CheckIn from './pages/CheckIn';
import Queue from './pages/Queue';
import QueueDisplay from './pages/QueueDisplay';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PatientPortalProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/book" element={<PublicBooking />} />
          {/* No-login waiting-room queue board, meant for a lobby TV/kiosk —
              see backend/controllers/publicController.js#queue for why it's safe
              to leave unauthenticated (no patient names). */}
          <Route path="/queue-display" element={<QueueDisplay />} />

          {/* Patient self-service portal — entirely separate auth guard from
              the staff routes below (see PatientPortalContext / PatientPortalGuard). */}
          <Route path="/portal/login" element={<PatientPortalLogin />} />
          <Route
            path="/portal"
            element={
              <PatientPortalGuard>
                <PatientPortal />
              </PatientPortalGuard>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />

            <Route
              path="/patients"
              element={
                <ProtectedRoute roles={['admin', 'doctor', 'receptionist']}>
                  <Patients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/:id"
              element={
                <ProtectedRoute roles={['admin', 'doctor', 'receptionist']}>
                  <PatientDetail />
                </ProtectedRoute>
              }
            />

            <Route path="/doctors" element={<Doctors />} />

            <Route path="/attendance" element={<Attendance />} />

            <Route path="/roster" element={<Roster />} />

            <Route
              path="/departments"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Departments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/appointments"
              element={
                <ProtectedRoute roles={['admin', 'doctor', 'receptionist']}>
                  <Appointments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/checkin"
              element={
                <ProtectedRoute roles={['admin', 'receptionist']}>
                  <CheckIn />
                </ProtectedRoute>
              }
            />

            <Route
              path="/queue"
              element={
                <ProtectedRoute roles={['admin', 'doctor', 'receptionist']}>
                  <Queue />
                </ProtectedRoute>
              }
            />

            <Route
              path="/lab-orders"
              element={
                <ProtectedRoute roles={['admin', 'doctor']}>
                  <LabOrders />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admissions"
              element={
                <ProtectedRoute roles={['admin', 'doctor', 'receptionist']}>
                  <Admissions />
                </ProtectedRoute>
              }
            />

            <Route
              path="/audit-log"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AuditLog />
                </ProtectedRoute>
              }
            />

            <Route
              path="/billing"
              element={
                <ProtectedRoute roles={['admin', 'receptionist']}>
                  <Billing />
                </ProtectedRoute>
              }
            />

            <Route
              path="/pharmacy"
              element={
                <ProtectedRoute roles={['admin', 'pharmacist']}>
                  <Pharmacy />
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute roles={['admin']}>
                  <StaffUsers />
                </ProtectedRoute>
              }
            />

            <Route
              path="/backup"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Backup />
                </ProtectedRoute>
              }
            />

            <Route
              path="/insights"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Insights />
                </ProtectedRoute>
              }
            />
          </Route>
          </Routes>
        </PatientPortalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
