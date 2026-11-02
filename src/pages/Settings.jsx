import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Field, { PasswordField, PasswordStrength } from '../components/Field.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../services/supabase.js';
import { friendlyAuthError, updatePassword } from '../services/auth.js';
import { deleteMyAccount, exportAllData } from '../services/account.js';
import { transactionsCsv } from '../utils/csv.js';
import { downloadFile } from '../utils/download.js';
import { toISODate } from '../utils/format.js';
import { isStrongEnough } from '../utils/validators.js';
import '../styles/pages.css';
import '../styles/settings.css';

function Toggle({ label, hint, checked, onChange, disabled }) {
  return (
    <label className="setting-row">
      <span>
        <strong>{label}</strong>
        {hint && <span className="muted">{hint}</span>}
      </span>
      <span className="check">
        <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
        <span className="check__box"><Icon name="check" size={14} stroke={3} /></span>
      </span>
    </label>
  );
}

export default function Settings() {
  const { profile, user, updateProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [saving, setSaving] = useState('');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwBusy, setPwBusy] = useState(false);
  const [exporting, setExporting] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function save(patch, okMessage) {
    setSaving(Object.keys(patch)[0]);
    const { error } = await updateProfile(patch);
    setSaving('');
    if (error) toast.error('Could not save that setting. Please try again.');
    else if (okMessage) toast.success(okMessage);
  }

  async function changePassword(e) {
    e.preventDefault();
    const errs = {};
    if (!pw.current) errs.current = 'Enter your current password.';
    if (!isStrongEnough(pw.next)) errs.next = 'Use at least 8 characters with a letter and a number.';
    else if (pw.next === pw.current) errs.next = 'Choose a password different from your current one.';
    if (pw.confirm !== pw.next) errs.confirm = 'Passwords do not match.';
    setPwErrors(errs);
    if (Object.keys(errs).length) return;

    setPwBusy(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: pw.current });
      if (verifyError) {
        setPwErrors({ current: 'Current password is incorrect.' });
        return;
      }
      await updatePassword(pw.next);
      toast.success('Password updated.');
      setPw({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setPwBusy(false);
    }
  }

  async function exportJson() {
    setExporting('json');
    try {
      const data = await exportAllData();
      downloadFile(`cus-treasure-export-${toISODate()}.json`, JSON.stringify(data, null, 2), 'application/json');
      toast.success('Your data was exported.');
    } catch (err) {
      toast.error(err.message || 'Export failed. Please try again.');
    } finally {
      setExporting('');
    }
  }

  async function exportCsv() {
    setExporting('csv');
    try {
      const data = await exportAllData();
      downloadFile(`cus-treasure-transactions-${toISODate()}.csv`, transactionsCsv(data), 'text/csv');
      toast.success('Transactions exported.');
    } catch (err) {
      toast.error(err.message || 'Export failed. Please try again.');
    } finally {
      setExporting('');
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteMyAccount();
      toast.success('Your account and data were deleted.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  }

  const setP = (key) => (e) => setPw((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page__title">Settings</h1>
      </div>

      <div className="settings-stack">
        <Card className="settings-card">
          <h2>Appearance</h2>
          <p className="muted">Choose how Treasure looks on this and your other devices.</p>
          <div className="theme-pick">
            <Button aria-pressed={profile?.theme === 'dark'} icon="moon" loading={saving === 'theme' && profile?.theme !== 'dark'} onClick={() => save({ theme: 'dark' })}>Dark</Button>
            <Button aria-pressed={profile?.theme === 'light'} icon="sun" loading={saving === 'theme' && profile?.theme !== 'light'} onClick={() => save({ theme: 'light' })}>Light</Button>
          </div>
        </Card>

        <Card className="settings-card">
          <h2>Notifications</h2>
          <p className="muted">Alerts appear in the bell menu in the top bar.</p>
          <Toggle
            label="Budget alerts"
            hint="Notify me when a category goes over its monthly budget."
            checked={Boolean(profile?.notify_budget)}
            disabled={saving === 'notify_budget'}
            onChange={(e) => save({ notify_budget: e.target.checked })}
          />
          <Toggle
            label="Goal alerts"
            hint="Notify me when a savings goal is reached."
            checked={Boolean(profile?.notify_goals)}
            disabled={saving === 'notify_goals'}
            onChange={(e) => save({ notify_goals: e.target.checked })}
          />
        </Card>

        <Card className="settings-card">
          <h2>Privacy</h2>
          <p className="muted">Control what’s visible on screen.</p>
          <Toggle
            label="Hide balances"
            hint="Mask money amounts with dots, handy in public places."
            checked={Boolean(profile?.hide_balances)}
            disabled={saving === 'hide_balances'}
            onChange={(e) => save({ hide_balances: e.target.checked })}
          />
        </Card>

        <Card className="settings-card">
          <h2>Password</h2>
          <p className="muted">Confirm your current password to set a new one.</p>
          <form className="form-grid" onSubmit={changePassword} noValidate>
            <PasswordField label="Current password" autoComplete="current-password" value={pw.current} onChange={setP('current')} error={pwErrors.current} />
            <PasswordField label="New password" autoComplete="new-password" value={pw.next} onChange={setP('next')} error={pwErrors.next} />
            <PasswordStrength value={pw.next} />
            <PasswordField label="Confirm new password" autoComplete="new-password" value={pw.confirm} onChange={setP('confirm')} error={pwErrors.confirm} />
            <div className="btn-row">
              <Button type="submit" variant="primary" loading={pwBusy}>Update password</Button>
            </div>
          </form>
        </Card>

        <Card className="settings-card">
          <h2>Your data</h2>
          <p className="muted">Download a copy of everything you’ve recorded. The JSON file contains all your data; the CSV file lists your transactions for spreadsheets.</p>
          <div className="btn-row">
            <Button icon="download" loading={exporting === 'json'} disabled={Boolean(exporting)} onClick={exportJson}>Export all (JSON)</Button>
            <Button icon="download" loading={exporting === 'csv'} disabled={Boolean(exporting)} onClick={exportCsv}>Transactions (CSV)</Button>
          </div>
        </Card>

        <Card className="settings-card danger-zone">
          <h2>Delete account</h2>
          <p className="muted">Permanently deletes your account and every account, transaction, budget, goal and setting. This can’t be undone, so export your data first if you want a copy.</p>
          <Button variant="danger" icon="trash" onClick={() => { setConfirmText(''); setDeleteOpen(true); }}>Delete my account</Button>
        </Card>
      </div>

      <Modal
        open={deleteOpen}
        title="Delete your account?"
        onClose={() => !deleting && setDeleteOpen(false)}
        footer={
          <>
            <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" loading={deleting} disabled={confirmText !== 'DELETE'} onClick={confirmDelete}>Delete forever</Button>
          </>
        }
      >
        <div className="stack">
          <p className="muted">All your financial data will be erased immediately. To confirm, type <strong>DELETE</strong> below.</p>
          <Field label="Confirmation" autoComplete="off" autoCapitalize="characters" placeholder="DELETE" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}