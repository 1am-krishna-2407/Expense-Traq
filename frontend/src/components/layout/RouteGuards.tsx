import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogoMark } from '../ui/Brand';
import { Spinner } from '../ui/Spinner';

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas" aria-busy="true">
      <LogoMark size={44} />
      <Spinner size={22} className="text-primary" />
    </div>
  );
}

/**
 * Waits for the silent refresh-on-load; without a session it redirects to /login and
 * remembers where the user was going (Plan §13).
 */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Login/Register: signed-in users go straight to the dashboard. */
export function PublicOnlyRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
