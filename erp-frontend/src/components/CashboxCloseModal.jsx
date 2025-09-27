import { useState } from "react"; 
export default function CashboxCloseModal({ onClose, onCloseSubmit, loading = false }) { 
  const [amount, setAmount] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const closed_amount = parseFloat(String(amount).replace(',', '.')) || 0;
    onCloseSubmit({ closed_amount });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 className="text-lg font-semibold mb-4">Fechar Caixa</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            Valor final
            <input value={amount} onChange={(e) => setAmount(e.target.value)} required inputMode="numeric" className="w-full rounded px-3 py-2 border" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full border px-4 py-2">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-full border bg-black text-white px-4 py-2">{loading ? 'Fechando...' : 'Fechar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
 