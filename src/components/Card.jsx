export default function Card({
  as: Tag = 'div',
  accent,
  glow = false,
  interactive = false,
  flat = false,
  className = '',
  children,
  ...rest
}) {
  const cls = ['card', glow && 'card--glow', interactive && 'card--interactive', flat && 'card--flat', className]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag className={cls} data-accent={accent} {...rest}>
      {children}
    </Tag>
  );
}