import { Outlet } from 'react-router-dom';
import '../styles/auth.css';

export default function AuthLayout() {
  return (
    <div className="auth-bg">
      <div className="auth-light auth-light--a" aria-hidden="true" />
      <div className="auth-light auth-light--b" aria-hidden="true" />
      <div className="auth-light auth-light--c" aria-hidden="true" />
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`auth-shape auth-shape--${n}`} aria-hidden="true" />
      ))}
      <main className="auth-center">
        <div className="auth-brand">
          <img className="auth-logo" src="/logo.svg" alt="" />
          <h1>CüS Treasure</h1>
          <p className="auth-tagline">BUILD WEALTH. TRACK PROGRESS. OWN TOMORROW.</p>
        </div>
        <Outlet />
        <p className="auth-credit">DESIGNED BY CHETAN ATAPALAKAR</p>
      </main>
    </div>
  );
}