import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordField, PasswordStrength } from '../components/Field.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import Loader from '../components/Loader.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { updatePassword, friendlyAuthError } from '../services/auth.js';
import { isStrongEnough } from '../utils/validators.js';

export default function ResetPassword() {
  const { session, loading: authLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) return <Loader />;

  if (!session) {
    return (
      <div className="auth-card">
        <div className="auth-success">
          <span className="auth-success__icon" style={{ color: 'var(--red)' }}><Icon name="alert" size={30} /></span>
          <h2>Link expired</h2>
          <p className="muted">This reset link is invalid or has expired. Request a new one.</p>
          <Link to="/forgot-password" className="btn btn--primary btn--lg btn--block">Request new link</Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!isStrongEnough(form.password)) errs.password = 'Use at least 8 characters with a letter and a number.';
    if (form.confirm !== form.password) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await updatePassword(form.password);
      toast.success('Password updated.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div>
        <h2>Set a new password</h2>
        <p className="muted">Choose something strong you haven’t used before.</p>
      </div>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {formError && (
          <div className="auth-alert" role="alert">
            <Icon name="alert" size={18} />
            <span>{formError}</span>
          </div>
        )}
        <PasswordField label="New password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} error={errors.password} />
        <PasswordStrength value={form.password} />
        <PasswordField label="Confirm new password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} error={errors.confirm} />
        <Button type="submit" variant="primary" size="lg" block loading={loading}>
          Update password
        </Button>
      </form>
    </div>
  );
}