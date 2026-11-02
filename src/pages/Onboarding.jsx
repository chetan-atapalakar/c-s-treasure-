import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Field from '../components/Field.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { supabase } from '../services/supabase.js';
import { CURRENCIES } from '../utils/format.js';

export default function Onboarding() {
  const { profile, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.full_name || '');
  const [currency, setCurrency] = useState(profile?.currency || 'INR');
  const [cash, setCash] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (profile?.onboarded && step < 2) return <Navigate to="/dashboard" replace />;

  async function saveProfile(e) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setErrors({ name: 'Enter your name.' });
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await updateProfile({ full_name: name.trim(), currency, theme });
    setSaving(false);
    if (error) {
      toast.error('Could not save your profile. Please try again.');
      return;
    }
    setStep(1);
  }

  async function saveCash(e) {
    e.preventDefault();
    const raw = cash.trim();
    const amount = raw === '' ? 0 : Number(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      setErrors({ cash: 'Enter 0 or a positive amount.' });
      return;
    }
    setErrors({});
    setSaving(true);
    if (amount > 0) {
      const { data: acc, error: findErr } = await supabase.from('accounts').select('id').eq('type', 'cash').order('created_at').limit(1).maybeSingle();
      if (findErr || !acc) {
        setSaving(false);
        toast.error('Could not find your cash wallet. Please try again.');
        return;
      }
      const { error } = await supabase.from('accounts').update({ opening_balance: amount }).eq('id', acc.id);
      if (error) {
        setSaving(false);
        toast.error('Could not save your opening balance. Please try again.');
        return;
      }
    }
    setSaving(false);
    setStep(2);
  }

  async function finish() {
    setSaving(true);
    const { error } = await updateProfile({ onboarded: true });
    setSaving(false);
    if (error) {
      toast.error('Something went wrong. Please try again.');
      return;
    }
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className="auth-card">
      <div className="steps" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>

      {step === 0 && (
        <form className="auth-form" onSubmit={saveProfile} noValidate>
          <div>
            <h2>Set up your profile</h2>
            <p className="muted">Tell us a little about how you’d like Treasure to look.</p>
          </div>
          <Field label="Your name" icon="user" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <Field as="select" label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </Field>
          <div className="field">
            <span className="field__label">Theme</span>
            <div className="theme-pick">
              <Button aria-pressed={theme === 'dark'} icon="moon" onClick={() => setTheme('dark')}>Dark</Button>
              <Button aria-pressed={theme === 'light'} icon="sun" onClick={() => setTheme('light')}>Light</Button>
            </div>
          </div>
          <Button type="submit" variant="primary" size="lg" block loading={saving}>Continue</Button>
        </form>
      )}

      {step === 1 && (
        <form className="auth-form" onSubmit={saveCash} noValidate>
          <div>
            <h2>Cash in hand</h2>
            <p className="muted">How much cash do you have right now? You can skip this and add accounts later. All balances are entered by you, not connected to a bank.</p>
          </div>
          <Field label="Opening cash balance" icon="wallet" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={cash} onChange={(e) => setCash(e.target.value)} error={errors.cash} />
          <Button type="submit" variant="primary" size="lg" block loading={saving}>Continue</Button>
        </form>
      )}

      {step === 2 && (
        <div className="auth-form">
          <div>
            <h2>You’re all set{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}</h2>
            <p className="muted">Here’s what’s waiting for you.</p>
          </div>
          <ul className="welcome-list">
            <li style={{ '--c': 'var(--green)' }}><span className="ico"><Icon name="receipt" size={18} /></span>Log income and expenses in seconds</li>
            <li style={{ '--c': 'var(--orange)' }}><span className="ico"><Icon name="target" size={18} /></span>Set budgets and watch your limits</li>
            <li style={{ '--c': 'var(--red)' }}><span className="ico"><Icon name="piggy" size={18} /></span>Save toward the goals that matter</li>
            <li style={{ '--c': 'var(--purple)' }}><span className="ico"><Icon name="bulb" size={18} /></span>Get insights from your own data</li>
          </ul>
          <Button variant="primary" size="lg" block loading={saving} onClick={finish}>Enter Treasure</Button>
        </div>
      )}
    </div>
  );
}