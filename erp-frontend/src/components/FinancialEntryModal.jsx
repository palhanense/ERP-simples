import { useState, useEffect } from "react";
import { digitsFromString, formatFromDigits, numberFromDigits, digitsFromValue, defaultLocale, defaultCurrency } from "../lib/format";
import Calendar from "./Calendar";
import { formatDate, combineDateWithNow, combineDateWithTime } from "../lib/dateFormat";

export default function FinancialEntryModal({ onClose, onSubmit, initialData = null, loading = false, error = "" }) {
  const [form, setForm] = useState({
    date: "",
    type: "receita",
    category: "",
    amount: "",
    notes: "",
  });
  const [amountDigits, setAmountDigits] = useState(digitsFromValue(initialData?.amount ?? ""));
  

  useEffect(() => {
    if (initialData) {
      const isoDateOnly = initialData.date ? new Date(initialData.date).toISOString().slice(0, 10) : "";
      setForm({
        date: isoDateOnly,
        type: initialData.type || "receita",
        category: initialData.category || "",
        amount: initialData.amount || "",
        notes: initialData.notes || "",
      });
    }
  }, [initialData]);

  const formatDateDisplay = (isoDateYmd) => formatDate(isoDateYmd);

  const handleChange = (field, value) => setForm((cur) => ({ ...cur, [field]: value }));

  const handleAmountInput = (e) => {
    const d = digitsFromString(e.target.value);
    setAmountDigits(d);
    handleChange('amount', formatFromDigits(d, defaultLocale, defaultCurrency));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // combine selected date (YYYY-MM-DD) with time from initialData if present, otherwise use now
    const isoDate = initialData?.date ? combineDateWithTime(form.date, initialData.date) : combineDateWithNow(form.date);
    const payload = {
      date: isoDate,
      type: form.type,
      category: form.category,
      amount: Number(numberFromDigits(amountDigits).toFixed(2)),
      notes: form.notes,
    };
    onSubmit(payload);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
  <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white px-6 py-6 shadow-xl dark:border-white/10 dark:bg-surface-dark">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{initialData ? 'Editar entrada' : 'Nova entrada'}</h3>
          <button onClick={onClose} className="rounded-full border border-white/20 p-2 text-neutral-300 dark:text-neutral-400">Fechar</button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="space-y-2 text-sm text-neutral-300">
            Data
            <Calendar value={form.date} onChange={(v) => handleChange('date', v)} className="w-full rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark" />
            {form.date ? <div className="mt-1 text-sm text-neutral-500">{formatDateDisplay(form.date)}</div> : null}
          </label>

          <label className="space-y-2 text-sm text-neutral-300">
            Tipo
            <select value={form.type} onChange={(e) => handleChange('type', e.target.value)} className="w-full rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark">
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-neutral-300">
            Categoria*
            <input type="text" value={form.category} onChange={(e) => handleChange('category', e.target.value)} required className="w-full rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark" />
          </label>

          <label className="space-y-2 text-sm text-neutral-300">
            Valor (R$)*
            <input type="text" inputMode="numeric" value={form.amount ? form.amount : formatFromDigits(amountDigits, defaultLocale, defaultCurrency)} onChange={handleAmountInput} required className="w-full rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark" />
          </label>

          {/* Caixa selection removed: cashbox-linked movements are handled via the dedicated Caixa modal */}

          <label className="space-y-2 text-sm text-neutral-300">
            Notas
            <input type="text" value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} className="w-full rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark" />
          </label>

          {error && <p className="rounded-2xl border border-red-400/40 bg-red-900/20 px-3 py-2 text-sm text-red-200">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-white/20 px-4 py-2 text-sm uppercase tracking-[0.25em] text-neutral-300">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-full border border-white px-5 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-black">{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
