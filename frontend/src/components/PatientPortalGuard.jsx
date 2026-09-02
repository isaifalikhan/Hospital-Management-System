import { Navigate } from 'react-router-dom';
import { usePatientPortal } from '../context/PatientPortalContext';

// Mirrors ProtectedRoute.jsx but reads from PatientPortalContext instead of
// the staff AuthContext, and redirects to the portal's own login screen —
// kept entirely separate from the staff auth guard.
export default function PatientPortalGuard({ children }) {
  const { patient, loading } = usePatientPortal();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!patient) {
    return <Navigate to="/portal/login" replace />;
  }

  return children;
}
