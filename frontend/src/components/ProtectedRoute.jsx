import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length && !roles.includes(user.role)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-slate-500">
        <p className="text-lg font-semibold text-slate-700">Access denied</p>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  return children;
}
