import { useState } from "react";

export default function CashboxCreateModal({ onClose, onCreate, loading = false }) {
  const [name, setName] = useState("");
  const [initial, setInitial] = useState("0.00");

  const handleSubmit = (e) => {
    e.preventDefault();
    const initial_amount = parseFloat(String(initial).replace(',', '.')) || 0;
    onCreate({ name, initial_amount });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 className="text-lg font-semibold mb-4">Novo Caixa</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            Nome
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded px-3 py-2 border" />
          </label>
          <label className="block text-sm">
            Valor inicial
            <input value={initial} onChange={(e) => setInitial(e.target.value)} required inputMode="numeric" className="w-full rounded px-3 py-2 border" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full border px-4 py-2">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-full border bg-black text-white px-4 py-2">{loading ? 'Criando...' : 'Criar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
 