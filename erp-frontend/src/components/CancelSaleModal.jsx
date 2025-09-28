import React from 'react';

export default function CancelSaleModal({ sale, onClose, onConfirm, loading = false }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white px-6 py-6 shadow-xl dark:border-white/10 dark:bg-surface-dark">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Confirmar cancelamento</h3>
          <button aria-label="Fechar" onClick={onClose} className="rounded-full border border-white/20 p-2 text-neutral-300 dark:text-neutral-400">Fechar</button>
        </header>

        <div className="space-y-4">
          <p className="text-sm text-neutral-600">Você tem certeza que deseja cancelar a venda <strong>#{sale?.id}</strong>?</p>
          <p className="text-sm text-neutral-500">Essa ação não pode ser desfeita. Se houver pagamentos associados, verifique antes de confirmar.</p>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-full border border-outline px-4 py-2 text-sm uppercase tracking-[0.25em] text-black dark:text-white">NÃO</button>
            <button onClick={() => onConfirm(sale)} disabled={loading} className="rounded-full border border-outline px-5 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-black dark:text-white">{loading ? 'CANCELANDO...' : 'SIM'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
