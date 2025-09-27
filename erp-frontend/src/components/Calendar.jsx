import React from 'react';

export default function Calendar({ value, onChange, min, max, className = '', label, required = false, id }) {
  const v = value || '';

  const handle = (e) => {
    const val = e.target.value || '';
    onChange?.(val);
  };

  return (
    <div className="inline-block">
      {label ? <label htmlFor={id} className="sr-only">{label}</label> : null}
      <input
        id={id}
        type="date"
        value={v}
        onChange={handle}
        min={min}
        max={max}
        required={required}
        className={className}
      />
    </div>
  );
}
