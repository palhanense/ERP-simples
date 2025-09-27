import { useEffect, useRef, useState } from "react";
import Calendar from "./Calendar";
import { combineDateWithNow, combineDateWithTime } from "../lib/dateFormat";
import { digitsFromString, formatFromDigits, numberFromDigits, digitsFromValue, defaultLocale, defaultCurrency } from "../lib/format";

const emptyForm = {
  name: "",
  amount: "0",
  category: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

export default function ExpenseModal({ onClose, onSubmit, loading = false, error = "", initial = null, categories = [], onCreateCategory }) {
  const [form, setForm] = useState(initial ? { ...initial } : emptyForm);
  const [amountDigits, setAmountDigits] = useState(digitsFromValue(initial?.amount ?? "0"));
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setForm(initial ? { ...initial } : emptyForm);
    setTimeout(() => inputRef.current?.focus?.(), 50);
  }, [initial]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleChange = (field, value) => setForm((c) => ({ ...c, [field]: value }));

  const handleAmountInput = (e) => {
    const d = digitsFromString(e.target.value);
    setAmountDigits(d);
    handleChange('amount', formatFromDigits(d, defaultLocale, defaultCurrency));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // validations
  const name = (form.name || "").trim();
  const amountNum = numberFromDigits(amountDigits);
    if (name.length < 3 || name.length > 80) return alert("Nome deve ter entre 3 e 80 caracteres");
    if (!(amountNum > 0)) return alert("Valor deve ser maior que 0");
    if (!form.date) return alert("Data inválida");
    // combine the selected date (YYYY-MM-DD) with existing time if editing, otherwise use current time
    const isoDate = initial?.date ? combineDateWithTime(form.date, initial.date) : combineDateWithNow(form.date);
    onSubmit({
      name,
      amount: Number(amountNum.toFixed(2)),
      category: form.category,
      date: isoDate,
      notes: form.notes,
      type: "despesa",
    });
  };

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) return;
    setCreatingCategory(true);
    try {
      await onCreateCategory({ name: newCategory.trim() });
      setForm((c) => ({ ...c, category: newCategory.trim() }));
      setNewCategory("");
    } catch (err) {
      // show error as alert fallback
      alert(err?.message || "Falha ao criar categoria");
    } finally {
      setCreatingCategory(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
  <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white px-6 py-6 shadow-xl dark:border-white/10 dark:bg-surface-dark">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{initial ? "Editar despesa" : "Lançar Despesa"}</h3>
          <button aria-label="Fechar" onClick={onClose} className="rounded-full border border-white/20 p-2 text-neutral-300 dark:text-neutral-400 transition hover:border-white/40">X</button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="space-y-2 text-sm text-neutral-300">
            Nome*
            <input ref={inputRef} type="text" value={form.name} onChange={(e) => handleChange("name", e.target.value)} className="w-full rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-white/60 focus:outline-none" required />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-neutral-300">
              Valor*
              <input type="text" inputMode="numeric" value={(form.amount || "0").toString()} onChange={handleAmountInput} className="w-full rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-white/60 focus:outline-none" />
            </label>

            <label className="space-y-2 text-sm text-neutral-300">
              Data*
              <Calendar value={form.date} onChange={(v) => handleChange("date", v)} className="w-full rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-white/60 focus:outline-none" required />
            </label>
          </div>

          <label className="space-y-2 text-sm text-neutral-300">
            Categoria*
            <div className="flex gap-2">
              <select value={form.category} onChange={(e) => handleChange("category", e.target.value)} className="flex-1 rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-white/60 focus:outline-none">
                <option value="">Selecione...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => setCreatingCategory((v) => !v)} className="rounded-full border border-white/20 px-3 py-2 text-sm text-neutral-300">Nova</button>
            </div>
            {creatingCategory && (
              <div className="mt-2 flex gap-2">
                <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex-1 rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-white/60 focus:outline-none" placeholder="Nome da categoria" />
                <button type="button" onClick={handleCreateCategory} disabled={creatingCategory} className="rounded-full border border-white px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-black transition hover:-translate-y-0.5 hover:bg-white/90">Criar</button>
              </div>
            )}
          </label>

          <label className="space-y-2 text-sm text-neutral-300">
            Observações
            <textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} className="w-full rounded-2xl border border-white/20 bg-transparent px-4 py-2 text-sm text-text-light dark:text-text-dark focus:border-white/60 focus:outline-none" rows={3} />
          </label>

          {error && <p className="rounded-2xl border border-red-400/40 bg-red-900/20 px-3 py-2 text-sm text-red-200">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-full border border-white/20 px-4 py-2 text-sm uppercase tracking-[0.25em] text-neutral-300 transition hover:border-white/40">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-full border border-white px-5 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-black transition hover:-translate-y-0.5 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
