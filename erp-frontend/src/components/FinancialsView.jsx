import { useState } from "react";
import { PlusIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { clsx } from "clsx";

import { createFinancialEntry, updateFinancialEntry, deleteFinancialEntry } from "../lib/api";
import FinancialEntryModal from "./FinancialEntryModal";

export default function FinancialsView({ entries = [], loading = false, onCreate = () => {}, onDelete = () => {}, onUpdate = () => {} }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreateClick = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        const updated = await updateFinancialEntry(editing.id, payload);
        onUpdate(updated);
        setModalOpen(false);
        return;
      }
      const created = await createFinancialEntry(payload);
      onUpdate(created);
      setModalOpen(false);
    } catch (err) {
      setError(err.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setEditing(entry);
    setModalOpen(true);
  };

  const handleDelete = async (entry) => {
    if (!confirm("Confirma exclusão?")) return;
    try {
      await deleteFinancialEntry(entry.id);
      onDelete(entry.id);
    } catch (err) {
      setError(err.message || "Falha ao excluir");
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Financeiro</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Entradas e saídas financeiras.</p>
        </div>
        <div>
          <button onClick={handleCreateClick} className="inline-flex items-center gap-2 rounded-full border border-outline px-5 py-2 text-sm font-medium">
            <PlusIcon className="h-4 w-4" /> Nova entrada
          </button>
        </div>
      </header>

      <div className={clsx("rounded-3xl border border-outline/30 bg-white p-6 shadow-subtle dark:border-white/10 dark:bg-surface-dark/40", loading && "opacity-70")}>
        {entries.length === 0 && !loading ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhuma entrada registrada.</p>
        ) : (
          <table className="w-full table-fixed border-separate border-spacing-y-4 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.25em] text-neutral-400 dark:text-neutral-500">
                <th className="w-[16%]">Data</th>
                <th className="w-[12%]">Tipo</th>
                <th className="w-[20%]">Categoria</th>
                <th className="w-[28%]">Notas</th>
                <th className="w-[14%]">Valor</th>
                <th className="w-[10%]"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="rounded-2xl border border-outline/20 bg-white/70 transition hover:-translate-y-0.5 hover:border-outline hover:bg-white dark:border-white/10 dark:bg-surface-dark/60 dark:hover:border-white/30">
                  <td className="px-4 py-3">{new Date(entry.date).toLocaleString()}</td>
                  <td className="px-4 py-3">{entry.type}</td>
                  <td className="px-4 py-3">{entry.category}</td>
                  <td className="px-4 py-3">{entry.notes}</td>
                  <td className="px-4 py-3">{Number(entry.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(entry)} className="rounded-full p-2 hover:bg-white/5">
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(entry)} className="rounded-full p-2 hover:bg-white/5">
                        <TrashIcon className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>

      {modalOpen && (
        <FinancialEntryModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          initialData={editing}
          loading={saving}
          error={error}
        />
      )}
    </section>
  );
}
