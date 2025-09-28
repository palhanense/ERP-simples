import React from 'react';

export default function ConfirmModal({ open, title = 'Confirmar', message = '', onConfirm = () => {}, onCancel = () => {}, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white px-6 py-5 shadow-xl dark:border-white/10 dark:bg-surface-dark">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-full border border-white/20 px-4 py-2 text-sm text-neutral-600">{cancelLabel}</button>
          <button onClick={onConfirm} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
