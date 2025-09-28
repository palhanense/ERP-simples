import Calendar from './Calendar';

export default function DateRange({ from, to, onChange, min, max, className = '' }) {
  const handleFrom = (val) => {
    const newFrom = val || '';
    const newTo = to || '';
    if (newTo && newFrom && newFrom > newTo) {
      onChange?.({ from: newFrom, to: newFrom });
    } else {
      onChange?.({ from: newFrom, to: newTo });
    }
  };

  const handleTo = (val) => {
    const newTo = val || '';
    const newFrom = from || '';
    if (newFrom && newTo && newFrom > newTo) {
      onChange?.({ from: newTo, to: newTo });
    } else {
      onChange?.({ from: newFrom, to: newTo });
    }
  };

  return (
    <div className={className}>
      <div className="inline-flex items-center gap-2 rounded-2xl border border-outline/30 bg-transparent px-1 py-0.5">
        <Calendar value={from} onChange={handleFrom} max={to || max} className="rounded-2xl border-none bg-transparent px-2 py-1 text-sm text-text-light dark:text-text-dark" />
        <span className="text-sm text-neutral-400">—</span>
        <Calendar value={to} onChange={handleTo} min={from || min} className="rounded-2xl border-none bg-transparent px-2 py-1 text-sm text-text-light dark:text-text-dark" />
      </div>
    </div>
  );
}
