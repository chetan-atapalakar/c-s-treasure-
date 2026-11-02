export default function Loader({ page = false, label = 'Loading' }) {
  const mark = (
    <div className="loader" role="status" aria-label={label}>
      <span aria-hidden="true">“</span>
      <span aria-hidden="true">”</span>
    </div>
  );
  return page ? <div className="loader--page">{mark}</div> : mark;
}