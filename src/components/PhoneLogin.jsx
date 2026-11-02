import { useState } from 'react';
import Field from './Field.jsx';
import Button from './Button.jsx';
import { useToast } from './Toast.jsx';
import { supabase } from '../services/supabase.js';
import { setRemember } from '../services/auth.js';
import '../styles/social.css';

const PHONE_RE = /^\+[1-9]\d{7,14}$/;

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

export default function PhoneLogin() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const cleanPhone = phone.replace(/[\s-]/g, '');

  async function sendCode(e) {
    e.preventDefault();
    if (!PHONE_RE.test(cleanPhone)) {
      setError('Enter your number with country code, like +919876543210.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ phone: cleanPhone });
    setLoading(false);
    if (err) {
      const m = (err.message || '').toLowerCase();
      setError(m.includes('rate') || m.includes('seconds') ? 'Please wait a minute before asking for another code.' : 'Could not send the code. Check the number and try again.');
      return;
    }
    setStep('code');
    toast.info('Code sent. Check your messages.');
  }

  async function verify(e) {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(code.trim())) {
      setError('Enter the code you received.');
      return;
    }
    setError('');
    setLoading(true);
    setRemember(true);
    const { error: err } = await supabase.auth.verifyOtp({ phone: cleanPhone, token: code.trim(), type: 'sms' });
    setLoading(false);
    if (err) setError('That code is wrong or has expired. Try again.');
  }

  if (!open) {
    return (
      <div className="social">
        <Button block size="lg" onClick={() => setOpen(true)}>
          <PhoneIcon />
          Continue with phone
        </Button>
      </div>
    );
  }

  return (
    <div className="social">
      {step === 'phone' ? (
        <form className="auth-form" onSubmit={sendCode} noValidate>
          <Field label="Phone number" type="tel" inputMode="tel" autoComplete="tel" placeholder="+919876543210" value={phone} onChange={(e) => setPhone(e.target.value)} error={error} hint="Include your country code, for example +91 for India." />
          <Button type="submit" variant="primary" block loading={loading}>Send code</Button>
          <Button variant="ghost" block onClick={() => { setOpen(false); setError(''); }}>Cancel</Button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={verify} noValidate>
          <Field label={`Code sent to ${cleanPhone}`} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} error={error} />
          <Button type="submit" variant="primary" block loading={loading}>Verify and continue</Button>
          <Button variant="ghost" block onClick={() => { setStep('phone'); setCode(''); setError(''); }}>Use a different number</Button>
        </form>
      )}
    </div>
  );
}