import { useEffect, useMemo, useState } from "react";
import Calendar from "./Calendar";
import DateRange from "./DateRange";
import { fetchSales, fetchFinancialEntries } from "../lib/api";

function toNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  return Number(String(v).replace(/\./g, '').replace(/,/g, '.')) || 0;
}

function formatCurrency(v) {
  const num = toNumber(v);
  return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

export default function HomeReports() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstDay.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [sales, setSales] = useState([]);
  const [financialEntries, setFinancialEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [saleList, finList] = await Promise.all([fetchSales(), fetchFinancialEntries()]);
      setSales(saleList);
      setFinancialEntries(finList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    // Aplica filtro automaticamente ao mudar datas
    load();
  }, [from, to]);

  const fromDate = new Date(from + 'T00:00:00');
  const toDate = new Date(to + 'T23:59:59');

  const filteredSales = useMemo(() => sales.filter(s => {
    const d = new Date(s.created_at || s.createdAt || s.date || 0);
    return d >= fromDate && d <= toDate;
  }), [sales, fromDate, toDate]);

  const dayStart = new Date(); dayStart.setHours(0,0,0,0);
  const dayEnd = new Date(); dayEnd.setHours(23,59,59,999);

  const salesToday = useMemo(() => sales.filter(s => {
    const d = new Date(s.created_at || s.createdAt || s.date || 0);
    return d >= dayStart && d <= dayEnd;
  }), [sales]);

  const faturamentoPeriodo = useMemo(() => filteredSales.reduce((acc, s) => acc + toNumber(s.total_amount), 0), [filteredSales]);
  const faturamentoHoje = useMemo(() => salesToday.reduce((acc, s) => acc + toNumber(s.total_amount), 0), [salesToday]);

  const numVendasPeriodo = filteredSales.length;
  const numVendasHoje = salesToday.length;

  const ticketMedio = numVendasPeriodo ? (faturamentoPeriodo / numVendasPeriodo) : 0;

  const topItems = useMemo(() => {
    const map = new Map();
    sales.forEach(s => (s.items || []).forEach(it => {
      const name = it.product?.name || it.product_id || 'Item';
      map.set(name, (map.get(name) || 0) + (it.quantity || 0));
    }));
    return Array.from(map.entries()).sort((a,b) => b[1]-a[1]).slice(0,10).map(([name, qty]) => ({ name, qty }));
  }, [sales]);

  const topCategories = useMemo(() => {
    const catMap = new Map();
    sales.forEach(s => (s.items || []).forEach(it => {
      const cat = it.product?.category || 'Sem Categoria';
      const amount = toNumber(it.line_total) || (toNumber(it.unit_price) * toNumber(it.quantity));
      catMap.set(cat, (catMap.get(cat) || 0) + amount);
    }));
    return Array.from(catMap.entries()).sort((a,b) => b[1]-a[1]).slice(0,3).map(([name, total]) => ({ name, total }));
  }, [sales]);

  const fiadoTotal = useMemo(() => sales.reduce((acc, s) => acc + toNumber(s.total_fiado_pending ?? s.total_fiado ?? 0), 0), [sales]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Relatórios</h2>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-neutral-400">Período</label>
          <div className="flex items-center">
            <DateRange from={from} to={to} onChange={(v) => { if (v.from) setFrom(v.from); if (v.to) setTo(v.to); }} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-surface-dark">
          <div className="text-sm text-neutral-400">Faturamento (Período)</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrency(faturamentoPeriodo)}</div>
          <div className="text-xs text-neutral-500 mt-1">Hoje: {formatCurrency(faturamentoHoje)}</div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-surface-dark">
          <div className="text-sm text-neutral-400">Fiado (acumulado)</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrency(fiadoTotal)}</div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-surface-dark">
          <div className="text-sm text-neutral-400">Número de vendas</div>
          <div className="mt-2 text-2xl font-semibold">{numVendasPeriodo}</div>
          <div className="text-xs text-neutral-500 mt-1">Hoje: {numVendasHoje}</div>
          <div className="text-sm text-neutral-400 mt-3">Ticket médio</div>
          <div className="mt-1 text-lg font-medium">{formatCurrency(ticketMedio)}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-surface-dark">
          <div className="text-sm text-neutral-400">10 itens mais vendidos</div>
          <ol className="mt-3 space-y-2 text-sm">
            {topItems.map((it, idx) => (
              <li key={idx} className="flex justify-between"><span>{it.name}</span><span className="text-neutral-400">{it.qty}</span></li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-surface-dark">
          <div className="text-sm text-neutral-400">3 categorias com maior faturamento</div>
          <ol className="mt-3 space-y-2 text-sm">
            {topCategories.map((c, idx) => (
              <li key={idx} className="flex justify-between"><span>{c.name}</span><span className="text-neutral-400">{formatCurrency(c.total)}</span></li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
