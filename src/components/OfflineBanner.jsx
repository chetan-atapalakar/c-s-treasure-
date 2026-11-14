import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  if (online) return null;
  return (
    <div role="status" style={{ position: 'fixed', zIndex: 100, left: 0, right: 0, top: 0, padding: 'calc(8px + var(--safe-top)) 16px 8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#fff', background: 'var(--red)' }}>
      You’re offline. Changes can’t be saved until you reconnect.
    </div>
  );
}