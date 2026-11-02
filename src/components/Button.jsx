import Icon from './Icon.jsx';

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  block = false,
  icon,
  iconOnly = false,
  type = 'button',
  className = '',
  children,
  disabled,
  ...rest
}) {
  const cls = [
    'btn',
    variant !== 'secondary' && `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    block && 'btn--block',
    iconOnly && 'btn--icon',
    loading && 'is-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={20} /> : null}
      {children}
    </button>
  );
}