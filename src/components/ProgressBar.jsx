import { useEffect, useState } from 'react';

export default function ProgressBar({ value = 0, color = 'var(--orange)', label = 'Progress' }) {
  const target = Math.max(0, Math.min(100, Number(value) || 0));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(target)}>
      <div className="progress__bar" style={{ width: `${width}%`, '--bar': color }} />
    </div>
  );
}