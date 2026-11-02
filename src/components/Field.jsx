import { useId, useState } from 'react';
import Icon from './Icon.jsx';
import { passwordScore } from '../utils/validators.js';
import '../styles/forms.css';

export default function Field({ label, error, hint, icon, adornment, as: Tag = 'input', className = '', id, children, ...rest }) {
  const auto = useId();
  const fid = id || auto;
  const errId = `${fid}-err`;
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <label className="field__label" htmlFor={fid}>
          {label}
        </label>
      )}
      <div className="field__wrap">
        {icon && (
          <span className="field__icon">
            <Icon name={icon} size={18} />
          </span>
        )}
        <Tag
          id={fid}
          className={`field__input ${icon ? 'field__input--icon' : ''} ${adornment ? 'field__input--adorn' : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          {...rest}
        >
          {children}
        </Tag>
        {adornment && <span className="field__adorn">{adornment}</span>}
      </div>
      {error && (
        <p className="field__error" id={errId} role="alert">
          {error}
        </p>
      )}
      {!error && hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

export function PasswordField({ label = 'Password', ...rest }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      label={label}
      icon="lock"
      type={visible ? 'text' : 'password'}
      adornment={
        <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>
          <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
        </button>
      }
      {...rest}
    />
  );
}

const LEVELS = [
  { label: 'Enter a password', c: 'var(--text-2)' },
  { label: 'Weak', c: 'var(--red)' },
  { label: 'Fair', c: 'var(--orange)' },
  { label: 'Good', c: 'var(--purple)' },
  { label: 'Strong', c: 'var(--green)' },
];

export function PasswordStrength({ value }) {
  const score = passwordScore(value);
  const level = LEVELS[score];
  return (
    <div className="strength" aria-live="polite">
      <div className="strength__bars" style={{ '--c': level.c }}>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`strength__bar ${i <= score ? 'on' : ''}`} />
        ))}
      </div>
      <span className="strength__label">{level.label} · at least 8 characters with a letter and a number</span>
    </div>
  );
}