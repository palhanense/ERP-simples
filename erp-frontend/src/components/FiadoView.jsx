import { useMemo, useState } from "react";
import Calendar from "./Calendar";
import CustomerPaymentModal from "./CustomerPaymentModal";
import DateRange from "./DateRange";
import { formatDate } from "../lib/dateFormat";

function formatCurrency(v) {
  return `R$ ${Number(v || 0).toFixed(2)}`;
}

export default function FiadoView({ sales = [], customers = [], onPaymentSaved }) {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const pad = (n) => n.toString().padStart(2, '0');
  const localYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const [from, setFrom] = useState(localYMD(firstDay));
  const [to, setTo] = useState(localYMD(today));
  const [sortBy, setSortBy] = useState({ key: "totalValue", dir: "desc" });
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const allFiadoTotal = useMemo(() => sales.reduce((acc, s) => acc + Number(s.total_fiado_pending ?? s.total_fiado ?? 0), 0), [sales]);

  const fromDate = new Date(from + 'T00:00:00');
  const toDate = new Date(to + 'T23:59:59');

  const salesInPeriod = useMemo(() => sales.filter(s => {
    const d = new Date(s.created_at || s.createdAt || s.date || 0);
    return d >= fromDate && d <= toDate;
  }), [sales, fromDate, toDate]);

  const periodFiadoTotal = useMemo(() => salesInPeriod.reduce((acc, s) => acc + Number(s.total_fiado_pending ?? s.total_fiado ?? 0), 0), [salesInPeriod]);

  // aggregate by customer (period and total)
  const customerAggregates = useMemo(() => {
    const map = new Map();
    // helper to ensure entry exists
    const ensure = (id, customer) => {
      const entry = map.get(id) || { id, customer, periodValue: 0, totalValue: 0, firstDate: null, lastDate: null };
      if (!map.get(id)) map.set(id, entry);
      return map.get(id);
    };

    // period sums
    salesInPeriod.forEach(s => {
      const c = s.customer || { id: null, name: 'Sem cliente' };
      const id = c.id || 'noclient-' + (c.name || 'anon');
      const entry = ensure(id, c);
      entry.periodValue += Number(s.total_fiado_pending ?? s.total_fiado ?? 0);
      const d = new Date(s.created_at || s.createdAt || s.date || 0);
      if (!entry.firstDate || d < entry.firstDate) entry.firstDate = d;
      if (!entry.lastDate || d > entry.lastDate) entry.lastDate = d;
    });

    // total sums across all sales
    sales.forEach(s => {
      const c = s.customer || { id: null, name: 'Sem cliente' };
      const id = c.id || 'noclient-' + (c.name || 'anon');
      const entry = ensure(id, c);
      entry.totalValue += Number(s.total_fiado_pending ?? s.total_fiado ?? 0);
    });

    return Array.from(map.values());
  }, [salesInPeriod, sales]);

  const withPercent = useMemo(() => customerAggregates.map(c => ({
    ...c,
    // percent of the customer's total outstanding relative to all outstanding fiado
    percent: allFiadoTotal ? (Number(c.totalValue || 0) / Number(allFiadoTotal || 1)) * 100 : 0
  })), [customerAggregates, allFiadoTotal]);

  const sorted = useMemo(() => {
    const arr = [...withPercent];
      arr.sort((a, b) => {
      const dir = sortBy.dir === 'asc' ? 1 : -1;
      if (sortBy.key === 'customer') return dir * a.customer.name.localeCompare(b.customer.name || '');
      if (sortBy.key === 'totalValue') return dir * (Number(a.totalValue || 0) - Number(b.totalValue || 0));
      if (sortBy.key === 'periodValue') return dir * (Number(a.periodValue || 0) - Number(b.periodValue || 0));
      if (sortBy.key === 'firstDate') return dir * ( (a.firstDate||0) - (b.firstDate||0) );
      if (sortBy.key === 'lastDate') return dir * ( (a.lastDate||0) - (b.lastDate||0) );
      if (sortBy.key === 'percent') return dir * (a.percent - b.percent);
      // default: compare by numeric totalValue (fall back to periodValue)
      const aVal = Number(a.totalValue ?? a.periodValue ?? 0);
      const bVal = Number(b.totalValue ?? b.periodValue ?? 0);
      return dir * (aVal - bVal);
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
          <label className="text-lg text-black dark:text-white font-semibold">Período</label>
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
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 flex items-baseline justify-between dark:border-white/10 dark:bg-surface-dark">
          <div className="text-lg text-black dark:text-white font-semibold">Total</div>
          <div className="text-2xl font-semibold">{formatCurrency(allFiadoTotal)}</div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 flex items-baseline justify-between dark:border-white/10 dark:bg-surface-dark">
          <div className="text-lg text-black dark:text-white font-semibold">Período</div>
          <div className="text-2xl font-semibold">{formatCurrency(periodFiadoTotal)}</div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-surface-dark">
        <table className="w-full table-auto text-sm">
          <thead className="bg-neutral-50 text-neutral-400 dark:bg-white/5 dark:text-neutral-400">
            <tr>
              <th onClick={() => toggleSort('customer')} className="cursor-pointer text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Contato</th>
               <th onClick={() => toggleSort('totalValue')} className="cursor-pointer text-right px-4 py-3">Total</th>
               <th onClick={() => toggleSort('periodValue')} className="cursor-pointer text-right px-4 py-3">Período</th>
              <th onClick={() => toggleSort('firstDate')} className="cursor-pointer text-center px-4 py-3">
                <div className="leading-tight">Compra<br/>antiga</div>
              </th>
              <th onClick={() => toggleSort('lastDate')} className="cursor-pointer text-center px-4 py-3">
                <div className="leading-tight">Compra<br/>rescente</div>
              </th>
              <th onClick={() => toggleSort('percent')} className="cursor-pointer text-center px-4 py-3">
                <div className="leading-tight">%<br/>do total</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="px-4 py-3">{c.customer?.name || 'Sem cliente'}</td>
                <td className="px-4 py-3">{c.customer?.phone || c.customer?.contact || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="text-sm">{formatCurrency(c.totalValue)}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="text-sm">{formatCurrency(c.periodValue)}</div>
                </td>
                <td className="px-4 py-3 text-center">{c.firstDate ? formatDate(c.firstDate) : ''}</td>
                <td className="px-4 py-3 text-center">{c.lastDate ? formatDate(c.lastDate) : ''}</td>
                <td className="px-4 py-3 text-center">{c.percent ? c.percent.toFixed(2) + '%' : '0.00%'}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-neutral-400">Nenhum registro encontrado no período selecionado</td>
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

