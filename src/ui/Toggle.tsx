type Props = { label: string; checked: boolean; onChange: (on: boolean) => void; compact?: boolean };

export function Toggle({ label, checked, onChange, compact }: Props) {
  return (
    <label className={`toggle ${compact ? 'toggle-compact' : ''}`}>
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="knob" />
      </button>
    </label>
  );
}
