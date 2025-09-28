import React, { useRef } from 'react';
import { formatDate } from '../lib/dateFormat';

export default function Calendar({ value, onChange, min, max, className = '', required = false, id }) {
  const inputRef = useRef(null);
  const v = value || '';

  const handleNativeChange = (e) => {
    const val = e.target.value || null;
    onChange?.(val);
  };

  const handleVisibleClick = () => {
    if (inputRef.current?.showPicker) {
      inputRef.current.showPicker();
      return;
    }
    inputRef.current?.focus();
  };

  return (
    <div className="relative inline-block">
      <input
        id={id}
        ref={inputRef}
        type="date"
        value={v}
        onChange={handleNativeChange}
        min={min}
        max={max}
        required={required}
        className="absolute inset-0 opacity-0"
        aria-hidden="true"
      />

      <input
        type="text"
        role="button"
        readOnly
        onClick={handleVisibleClick}
        value={v ? formatDate(v) : ''}
        className={`${className} pr-8`}
        placeholder="dd/mm/aaaa"
      />

      <svg
        className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M7 11H9M15 11H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16 3v4M8 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
