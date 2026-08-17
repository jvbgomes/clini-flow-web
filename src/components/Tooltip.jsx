import './Tooltip.css';

export default function Tooltip({ text, maxLength = 45 }) {
  if (!text) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  if (text.length <= maxLength) return <span>{text}</span>;
  return (
    <span className="tooltip-wrap">
      <span className="tooltip-trigger">{text.slice(0, maxLength)}…</span>
      <span className="tooltip-box">{text}</span>
    </span>
  );
}
