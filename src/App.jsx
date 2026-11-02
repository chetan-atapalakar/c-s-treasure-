import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import ProtectedRoute, { PublicOnlyRoute } from './components/ProtectedRoute.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Loader from './components/Loader.jsx';
import Card from './components/Card.jsx';
import Icon from './components/Icon.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Onboarding from './pages/Onboarding.jsx';
import { NAV_ITEMS } from './utils/navigation.js';

// Pages are discovered from src/pages/*.jsx, so adding a page file needs no change here.
const pageModules = import.meta.glob('./pages/*.jsx');

function NotBuilt({ name }) {
  return (
    <div className="page">
      <Card>
        <div className="empty">
          <span className="empty__icon"><Icon name="sparkle" size={30} /></span>
          <h2>{name}</h2>
          <p>This section hasn’t been added yet.</p>
        </div>
      </Card>
    </div>
  );
}

const PAGES = Object.fromEntries(
  NAV_ITEMS.map((item) => {
    const loader = pageModules[`./pages/${item.file}.jsx`];
    const Component = loader ? lazy(loader) : () => <NotBuilt name={item.label} />;
    return [item.path, Component];
  })
);

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<Loader page />}>
            <Routes>
              <Route element={<AuthLayout />}>
                <Route element={<PublicOnlyRoute />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                </Route>
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route element={<ProtectedRoute allowUnboarded />}>
                  <Route path="/welcome" element={<Onboarding />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  {NAV_ITEMS.map((item) => {
                    const Page = PAGES[item.path];
                    return <Route key={item.path} path={item.path} element={<Page />} />;
                  })}
                </Route>
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}