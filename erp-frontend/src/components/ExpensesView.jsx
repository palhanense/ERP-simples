import { useEffect, useState } from "react";
import { fetchExpenses, createExpense, updateExpense, deleteExpense, fetchCategories, createCategory } from "../lib/api";
import ExpenseModal from "./ExpenseModal";
import CashboxModal from "./CashboxModal";

export default function ExpensesView({ entries = [], loading = false, onDelete = () => {}, onUpdate = () => {} }) {
  const [items, setItems] = useState(entries || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // cashbox selection removed from this view — all caixa operations happen via the CashboxModal
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [cashboxModalOpen, setCashboxModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => setItems(entries), [entries]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // creation flow removed — users will use an administrator flow or the existing creation elsewhere

  // Opening/closing cashbox handled by the CashboxModal now

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleCreateCategory = async (payload) => {
    const created = await createCategory(payload);
    setCategories((c) => [created, ...c]);
    return created;
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        const updated = await updateExpense(editing.id, payload);
        setItems((cur) => cur.map((it) => (it.id === updated.id ? updated : it)));
        onUpdate(updated);
      } else {
        const created = await createExpense(payload);
        setItems((cur) => [created, ...cur]);
        onUpdate(created);
      }
      setModalOpen(false);
    } catch (err) {
      setError(err.message || "Erro");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditing({
      id: item.id,
      name: item.name,
      amount: (item.amount || 0).toFixed(2),
      category: item.category,
      date: item.date ? item.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: item.notes || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Confirma exclusão?')) return;
    try {
      await deleteExpense(id);
      setItems((cur) => cur.filter((it) => it.id !== id));
      onDelete(id);
    } catch (err) {
      alert(err.message || 'Falha ao excluir');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Despesas</h2>
        <div className="flex items-center gap-3">
          {/* Caixa selection removed from this header; use the Caixa modal to operate cashboxes */}
          <div className="flex items-center gap-2">
            <button onClick={() => setCashboxModalOpen(true)} className="rounded-full border border-outline px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-text-light dark:text-text-dark hover:bg-white/5">Caixa</button>
            <button onClick={openCreate} className="rounded-full border border-outline px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-text-light dark:text-text-dark hover:bg-white/5">Lançar Despesa</button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full table-auto text-sm">
            <thead className="bg-neutral-50 text-neutral-400 dark:bg-white/5 dark:text-neutral-400">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-right px-4 py-3">Valor</th>
                <th className="text-left px-4 py-3">Categoria</th>
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-center px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-white/5">
                  <td className="px-4 py-3">{it.name}</td>
                  <td className="px-4 py-3 text-right">R$ {Number(it.amount).toFixed(2)}</td>
                  <td className="px-4 py-3">{it.category}</td>
                  <td className="px-4 py-3">{it.date ? new Date(it.date).toLocaleDateString() : ''}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleEdit(it)} className="mr-2 text-sm text-neutral-300 hover:text-text-light dark:hover:text-text-dark">Editar</button>
                    <button onClick={() => handleDelete(it.id)} className="text-sm text-red-400 hover:text-red-300">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <ExpenseModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          loading={saving}
          error={error}
          initial={editing}
          categories={categories}
          onCreateCategory={handleCreateCategory}
        />
      )}

      {/* Cashbox creation removed from this view — kept the open/close modal on the 'Caixa' button */}

      {cashboxModalOpen && (
        <CashboxModal
          onClose={() => setCashboxModalOpen(false)}
          onUpdated={() => { /* refresh hooks if needed */ }}
        />
      )}
    </div>
  );
}
