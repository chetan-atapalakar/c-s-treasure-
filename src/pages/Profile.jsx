import { useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Field from '../components/Field.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getCounts } from '../services/account.js';
import { CURRENCIES, formatDate, initials } from '../utils/format.js';
import '../styles/pages.css';
import '../styles/settings.css';

export default function Profile() {
  const { profile, user, updateProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(profile?.full_name || '');
  const [currency, setCurrency] = useState(profile?.currency || 'INR');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let active = true;
    getCounts()
      .then((c) => active && setCounts(c))
      .catch(() => active && setCounts({ accounts: null, transactions: null, goals: null }));
    return () => {
      active = false;
    };
  }, []);

  const dirty = name.trim() !== (profile?.full_name || '') || currency !== profile?.currency;

  async function submit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Enter your name.');
      return;
    }
    if (trimmed.length > 80) {
      setError('Keep your name under 80 characters.');
      return;
    }
    setError('');
    setSaving(true);
    const { error: err } = await updateProfile({ full_name: trimmed, currency });
    setSaving(false);
    if (err) toast.error('Could not save your profile. Please try again.');
    else toast.success('Profile updated.');
  }

  const show = (n) => (n === null || n === undefined ? '—' : n);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page__title">Profile</h1>
      </div>
      <div className="settings-stack">
        <Card className="settings-card">
          <div className="profile-head">
            <span className="avatar avatar--lg" aria-hidden="true">{initials(profile?.full_name, user?.email)}</span>
            <div>
              <h2>{profile?.full_name || 'Your account'}</h2>
              <p className="muted">{user?.email}</p>
              {user?.created_at && <p className="muted" style={{ fontSize: '0.82rem' }}>Member since {formatDate(user.created_at)}</p>}
            </div>
          </div>
          <form className="form-grid" onSubmit={submit} noValidate>
            <Field label="Full name" icon="user" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} error={error} />
            <Field label="Email" icon="mail" value={user?.email || ''} readOnly hint="Your sign-in email can’t be changed here." />
            <Field
              as="select"
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              hint="Only the display changes. Existing amounts are not converted."
            >
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </Field>
            <div className="btn-row">
              <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>Save changes</Button>
            </div>
          </form>
        </Card>

        <div className="grid-cards">
          <Card accent="orange" className="stat">
            <span className="stat__label">ACCOUNTS</span>
            <span className="stat__value num">{show(counts?.accounts)}</span>
          </Card>
          <Card accent="purple" className="stat">
            <span className="stat__label">TRANSACTIONS</span>
            <span className="stat__value num">{show(counts?.transactions)}</span>
          </Card>
          <Card accent="green" className="stat">
            <span className="stat__label">SAVINGS GOALS</span>
            <span className="stat__value num">{show(counts?.goals)}</span>
          </Card>
        </div>
      </div>
    </div>
  );
}