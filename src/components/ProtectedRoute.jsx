import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from './Loader.jsx';
import Button from './Button.jsx';

export default function ProtectedRoute({ allowUnboarded = false }) {
  const { session, profile, profileStatus, loading, refreshProfile, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <Loader page />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;

  if (profileStatus === 'error') {
    return (
      <div className="loader--page">
        <div className="stack" style={{ textAlign: 'center', maxWidth: 340, padding: 20 }}>
          <h2>We couldn’t load your profile</h2>
          <p className="muted">Check your connection and try again.</p>
          <Button variant="primary" onClick={refreshProfile}>Try again</Button>
          <Button variant="ghost" onClick={signOut}>Log out</Button>
        </div>
      </div>
    );
  }
  if (!profile) return <Loader page />;

  if (!profile.onboarded && !allowUnboarded) return <Navigate to="/welcome" replace />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loader page />;
  if (session && profile) return <Navigate to={profile.onboarded ? '/dashboard' : '/welcome'} replace />;
  return <Outlet />;
}