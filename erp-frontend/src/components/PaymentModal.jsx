import { useState } from "react";
import { createSalePayment } from "../lib/api";

export default function PaymentModal({ sale, onClose, onSaved }) {
  const [amount, setAmount] = useState( (sale && Number(sale.total_fiado_pending ?? sale.total_fiado ?? 0)) || 0 );
  const [method, setMethod] = useState("dinheiro");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const remaining = Number(sale?.total_fiado_pending ?? sale?.total_fiado ?? 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { amount: Number(amount), method, notes };
      const result = await createSalePayment(sale.id, payload);
      // result: { payment: { ... }, remaining_due }
      onSaved && onSaved(result);
      onClose && onClose();
    } catch (err) {
      setError(err.message || "Falha ao registrar pagamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-surface-dark">
        <h3 className="mb-4 text-lg font-semibold">Baixar Fiado - Venda {sale?.id}</h3>
        <div className="mb-3">
          <label className="block text-sm text-neutral-600">Valor</label>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        <div className="mb-3">
          <label className="block text-sm text-neutral-600">Método</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="cartao">Cartão</option>
            <option value="fiado">Fiado</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="block text-sm text-neutral-600">Notas (opcional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </div>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border px-4 py-2">Fechar</button>
          <button type="submit" disabled={loading} className="rounded-full bg-black px-4 py-2 text-white disabled:opacity-60">{loading ? 'Salvando...' : 'Confirmar'}</button>
        </div>
      </form>
    </div>
  );
}
