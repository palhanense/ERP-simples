import { useMemo, useState } from "react";
import Calendar from "./Calendar";
import CustomerPaymentModal from "./CustomerPaymentModal";

function formatCurrency(v) {
  return `R$ ${Number(v || 0).toFixed(2)}`;
}

export default function FiadoView({ sales = [], customers = [], onPaymentSaved }) {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstDay.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [sortBy, setSortBy] = useState({ key: "value", dir: "desc" });
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const allFiadoTotal = useMemo(() => sales.reduce((acc, s) => acc + Number(s.total_fiado || 0), 0), [sales]);

  const fromDate = new Date(from + 'T00:00:00');
  const toDate = new Date(to + 'T23:59:59');

  const salesInPeriod = useMemo(() => sales.filter(s => {
    const d = new Date(s.created_at || s.createdAt || s.date || 0);
    return d >= fromDate && d <= toDate;
  }), [sales, fromDate, toDate]);

  const periodFiadoTotal = useMemo(() => salesInPeriod.reduce((acc, s) => acc + Number(s.total_fiado || 0), 0), [salesInPeriod]);

  // aggregate by customer (rename to avoid collision with customers prop)
  const customerAggregates = useMemo(() => {
    const map = new Map();
    salesInPeriod.forEach(s => {
      const c = s.customer || { id: null, name: 'Sem cliente' };
      const id = c.id || 'noclient-' + (c.name || 'anon');
      const entry = map.get(id) || { id, customer: c, value: 0, firstDate: null, lastDate: null };
      entry.value += Number(s.total_fiado || 0);
      const d = new Date(s.created_at || s.createdAt || s.date || 0);
      if (!entry.firstDate || d < entry.firstDate) entry.firstDate = d;
      if (!entry.lastDate || d > entry.lastDate) entry.lastDate = d;
      map.set(id, entry);
    });
    return Array.from(map.values());
  }, [salesInPeriod]);

  const withPercent = useMemo(() => customerAggregates.map(c => ({
    ...c,
    percent: allFiadoTotal ? (c.value / allFiadoTotal) * 100 : 0
  })), [customerAggregates, allFiadoTotal]);

  const sorted = useMemo(() => {
    const arr = [...withPercent];
    arr.sort((a, b) => {
      const dir = sortBy.dir === 'asc' ? 1 : -1;
      if (sortBy.key === 'customer') return dir * a.customer.name.localeCompare(b.customer.name || '');
      if (sortBy.key === 'firstDate') return dir * ( (a.firstDate||0) - (b.firstDate||0) );
      if (sortBy.key === 'lastDate') return dir * ( (a.lastDate||0) - (b.lastDate||0) );
      if (sortBy.key === 'percent') return dir * (a.percent - b.percent);
      return dir * (a.value - b.value);
    });
    return arr;
  }, [withPercent, sortBy]);

  const toggleSort = (key) => {
    setSortBy((s) => {
      if (s.key === key) return { key, dir: s.dir === 'asc' ? 'desc' : 'asc' };
      return { key, dir: 'desc' };
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fiado</h2>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-neutral-400">Período</label>
          <DateRange from={from} to={to} onChange={(v) => { if (v.from) setFrom(v.from); if (v.to) setTo(v.to); }} />
          <button
            onClick={() => setShowPaymentModal(true)}
            className="ml-4 rounded-full px-3 py-2 text-sm font-semibold transition-colors bg-black text-white dark:bg-white dark:text-black"
          >
            Realizar Pagamento
          </button>
        </div>
      </div>

  <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-surface-dark">
          <div className="text-sm text-neutral-400">Fiado (total geral)</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrency(allFiadoTotal)}</div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-surface-dark">
          <div className="text-sm text-neutral-400">Fiado (período)</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrency(periodFiadoTotal)}</div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-surface-dark">
        <table className="w-full table-auto text-sm">
          <thead className="bg-neutral-50 text-neutral-400 dark:bg-white/5 dark:text-neutral-400">
            <tr>
              <th onClick={() => toggleSort('customer')} className="cursor-pointer text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Contato</th>
              <th onClick={() => toggleSort('value')} className="cursor-pointer text-right px-4 py-3">Acumulado</th>
              <th onClick={() => toggleSort('firstDate')} className="cursor-pointer text-left px-4 py-3">Compra antiga</th>
              <th onClick={() => toggleSort('lastDate')} className="cursor-pointer text-left px-4 py-3">Compra rescente</th>
              <th onClick={() => toggleSort('percent')} className="cursor-pointer text-left px-4 py-3">% do total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="px-4 py-3">{c.customer?.name || 'Sem cliente'}</td>
                <td className="px-4 py-3">{c.customer?.phone || c.customer?.contact || '-'}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(c.value)}</td>
                <td className="px-4 py-3">{c.firstDate ? new Date(c.firstDate).toLocaleDateString() : ''}</td>
                <td className="px-4 py-3">{c.lastDate ? new Date(c.lastDate).toLocaleDateString() : ''}</td>
                <td className="px-4 py-3">{c.percent ? c.percent.toFixed(2) + '%' : '0.00%'}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-neutral-400">Nenhum registro encontrado no período selecionado</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showPaymentModal && (
        <CustomerPaymentModal
          customers={customers}
          onClose={() => setShowPaymentModal(false)}
          onSaved={(res) => {
            // call parent so it can refresh data
            onPaymentSaved && onPaymentSaved(res);
            setShowPaymentModal(false);
          }}
        />
      )}
    </div>
  );
}

