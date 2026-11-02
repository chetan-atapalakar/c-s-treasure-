import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Field, { PasswordField, PasswordStrength } from '../components/Field.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import { signUp, setRemember, friendlyAuthError } from '../services/auth.js';
import { isEmail, isStrongEnough } from '../utils/validators.js';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (form.fullName.trim().length < 2) errs.fullName = 'Enter your full name.';
    if (!isEmail(form.email)) errs.email = 'Enter a valid email address.';
    if (!isStrongEnough(form.password)) errs.password = 'Use at least 8 characters with a letter and a number.';
    if (form.confirm !== form.password) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const data = await signUp(form);
      if (data.session) {
        setRemember(true);
        navigate('/welcome', { replace: true });
      } else {
        setVerifyEmail(true);
      }
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  if (verifyEmail) {
    return (
      <div className="auth-card">
        <div className="auth-success">
          <span className="auth-success__icon"><Icon name="mail" size={30} /></span>
          <h2>Verify your email</h2>
          <p className="muted">
            We sent a confirmation link to <strong>{form.email.trim()}</strong>. Open it, then log in to continue.
          </p>
          <Link to="/login" className="btn btn--primary btn--lg btn--block">Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div>
        <h2>Create your account</h2>
        <p className="muted">Start building wealth in minutes.</p>
      </div>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {formError && (
          <div className="auth-alert" role="alert">
            <Icon name="alert" size={18} />
            <span>{formError}</span>
          </div>
        )}
        <Field label="Full name" icon="user" autoComplete="name" placeholder="Your name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
        <Field label="Email" icon="mail" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} />
        <PasswordField autoComplete="new-password" placeholder="Create a password" value={form.password} onChange={set('password')} error={errors.password} />
        <PasswordStrength value={form.password} />
        <PasswordField label="Confirm password" autoComplete="new-password" placeholder="Repeat your password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        <Button type="submit" variant="primary" size="lg" block loading={loading}>
          Create account
        </Button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}