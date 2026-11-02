import { useState } from 'react';
import { Link } from 'react-router-dom';
import Field from '../components/Field.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import { sendPasswordReset, friendlyAuthError } from '../services/auth.js';
import { isEmail } from '../utils/validators.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!isEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-card">
        <div className="auth-success">
          <span className="auth-success__icon"><Icon name="mail" size={30} /></span>
          <h2>Check your inbox</h2>
          <p className="muted">If an account exists for {email.trim()}, a reset link is on its way.</p>
          <Link to="/login" className="btn btn--lg btn--block">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div>
        <h2>Forgot password?</h2>
        <p className="muted">Enter your email and we’ll send you a reset link.</p>
      </div>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {formError && (
          <div className="auth-alert" role="alert">
            <Icon name="alert" size={18} />
            <span>{formError}</span>
          </div>
        )}
        <Field label="Email" icon="mail" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        <Button type="submit" variant="primary" size="lg" block loading={loading}>
          Send reset link
        </Button>
      </form>
      <p className="auth-switch">
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}