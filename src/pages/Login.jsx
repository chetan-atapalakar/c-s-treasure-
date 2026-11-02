import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Field, { PasswordField } from '../components/Field.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import PhoneLogin from '../components/PhoneLogin.jsx';
import { signIn, friendlyAuthError } from '../services/auth.js';
import { isEmail } from '../utils/validators.js';

export default function Login() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!isEmail(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Enter your password.';
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await signIn(form);
      navigate(state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div>
        <h2>Welcome back</h2>
        <p className="muted">Log in to continue to your treasury.</p>
      </div>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {formError && (
          <div className="auth-alert" role="alert">
            <Icon name="alert" size={18} />
            <span>{formError}</span>
          </div>
        )}
        <Field label="Email" icon="mail" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordField autoComplete="current-password" placeholder="Your password" value={form.password} onChange={set('password')} error={errors.password} />
        <div className="auth-row">
          <label className="check">
            <input type="checkbox" checked={form.remember} onChange={set('remember')} />
            <span className="check__box"><Icon name="check" size={14} stroke={3} /></span>
            Remember me
          </label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <Button type="submit" variant="primary" size="lg" block loading={loading}>
          Log in
        </Button>
      </form>
      <GoogleButton />
      <PhoneLogin />
      <p className="auth-switch">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}