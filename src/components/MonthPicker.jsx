import Button from './Button.jsx';
import { addMonths, monthLabel } from '../utils/dates.js';
import '../styles/planning.css';

export default function MonthPicker({ month, onChange, maxMonth }) {
  const atMax = maxMonth && month >= maxMonth;
  return (
    <div className="month-picker" role="group" aria-label="Choose month">
      <Button variant="ghost" iconOnly icon="chevronLeft" aria-label="Previous month" onClick={() => onChange(addMonths(month, -1))} />
      <span className="month-picker__label" aria-live="polite">{monthLabel(month)}</span>
      <Button variant="ghost" iconOnly icon="chevronRight" aria-label="Next month" disabled={atMax} onClick={() => onChange(addMonths(month, 1))} />
    </div>
  );
}