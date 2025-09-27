import { useState } from "react";

export default function CustomerCreateModal({ onClose, onSubmit, loading = false, error = "" }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const handleChange = (field, value) => {
    // For phone field, accept only digits and enforce max length 11, format as (xx)xxxxx-xxxx
    if (field === "phone") {
      const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
      let formatted = digits;
      if (digits.length > 0) {
        if (digits.length <= 2) {
          formatted = `(${digits}`;
        } else if (digits.length <= 7) {
          formatted = `(${digits.slice(0,2)})${digits.slice(2)}`;
        } else {
          formatted = `(${digits.slice(0,2)})${digits.slice(2,7)}-${digits.slice(7)}`;
        }
      }
      setForm((current) => ({ ...current, phone: formatted }));
      return;
    }
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      return;
    }
    // Validate phone digits count (allow empty or exactly 11 digits)
    const phoneDigits = String(form.phone || "").replace(/\D/g, "");
    if (phoneDigits && phoneDigits.length !== 11) {
      // show a simple client-side alert; you can replace with inline error UI
      alert('Telefone deve conter exatamente 11 numeros no formato (xx)xxxxx-xxxx');
      return;
    }
    onSubmit({ ...form, name: form.name.trim(), phone: phoneDigits ? phoneDigits : undefined });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
  <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white px-6 py-6 shadow-xl dark:border-white/10 dark:bg-surface-dark">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Novo cliente</h3>
          <button aria-label="Fechar"
            onClick={onClose}
            className="rounded-full border border-neutral-200 p-2 text-neutral-900/80 dark:text-text-dark/60 transition hover:border-neutral-400 hover:text-neutral-900 dark:hover:text-text-dark"
          >
            X
          </button>
        </header>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="space-y-2 text-sm text-neutral-900 dark:text-neutral-300">
            Nome*
            <input
              type="text"
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-transparent px-4 py-2 text-sm text-neutral-900 dark:text-text-dark focus:border-neutral-500 focus:outline-none"
              required
            />
          </label>
          <label className="space-y-2 text-sm text-neutral-900 dark:text-neutral-300">
            Telefone
            <input
              type="text"
              value={form.phone}
              onChange={(event) => handleChange("phone", event.target.value)}
              inputMode="numeric"
              className="w-full rounded-2xl border border-neutral-200 bg-transparent px-4 py-2 text-sm text-neutral-900 dark:text-text-dark focus:border-neutral-500 focus:outline-none"
            />
          </label>
          <label className="space-y-2 text-sm text-neutral-900 dark:text-neutral-300">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-transparent px-4 py-2 text-sm text-neutral-900 dark:text-text-dark focus:border-neutral-500 focus:outline-none"
            />
          </label>

          {error && (
            <p className="rounded-2xl border border-red-400/40 bg-red-900/20 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-200 px-4 py-2 text-sm uppercase tracking-[0.25em] text-neutral-900 transition hover:border-neutral-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-full border border-white px-5 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-black transition hover:-translate-y-0.5 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
