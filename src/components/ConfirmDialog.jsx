import { useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', danger = true, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? undefined : onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={go}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}