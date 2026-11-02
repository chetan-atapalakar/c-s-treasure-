import useCountUp from '../hooks/useCountUp.js';
import useMoney from '../hooks/useMoney.js';

export default function AnimatedNumber({ value, format, className = '', as: Tag = 'span' }) {
  const { fmt } = useMoney();
  const current = useCountUp(value);
  const render = format || fmt;
  return (
    <Tag className={className}>
      <span aria-hidden="true">{render(current)}</span>
      <span className="sr-only">{render(Number(value) || 0)}</span>
    </Tag>
  );
}