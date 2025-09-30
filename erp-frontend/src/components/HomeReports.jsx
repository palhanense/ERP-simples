import { useEffect, useMemo, useState } from "react";
import Calendar from "./Calendar";
import DateRange from "./DateRange";
import { fetchSales, fetchFinancialEntries, fetchProducts } from "../lib/api";
import SalesLineCanvas from "./SalesLineCanvas";

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
  const [products, setProducts] = useState([]);
  const [financialEntries, setFinancialEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [saleList, finList, productList] = await Promise.all([
        fetchSales(),
        fetchFinancialEntries(),
        fetchProducts(),
      ]);
      setSales(saleList || []);
      setFinancialEntries(finList || []);
      setProducts(productList || []);
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

  const salesByDay = useMemo(() => {
    const map = new Map();
    filteredSales.forEach(s => {
      const d = new Date(s.created_at || s.createdAt || s.date || 0);
      const key = d.toISOString().slice(0,10);
      const prev = map.get(key) || 0;
      map.set(key, prev + Number(s.total_amount || s.total || 0));
    });
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([date, total]) => ({ date, total }));
  }, [filteredSales]);

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
  const ticketMedioHoje = numVendasHoje ? (faturamentoHoje / numVendasHoje) : 0;

  const fiadoHoje = useMemo(() => (salesToday || []).reduce((acc, s) => acc + toNumber(s.total_fiado_pending ?? s.total_fiado ?? 0), 0), [salesToday]);

  const topItems = useMemo(() => {
    const map = new Map();
    const productNameById = new Map((products || []).map(p => [p.id, p.name]));
    (filteredSales || []).forEach(s => (s.items || []).forEach(it => {
      const name = it.product?.name || productNameById.get(it.product_id) || it.product_id || 'Item';
      const qty = toNumber(it.quantity || 0);
      map.set(name, (map.get(name) || 0) + qty);
    }));
    return Array.from(map.entries()).sort((a,b) => b[1]-a[1]).slice(0,10).map(([name, qty]) => ({ name, qty }));
  }, [filteredSales, products]);

  const topCategories = useMemo(() => {
    const catMap = new Map();
    (filteredSales || []).forEach(s => (s.items || []).forEach(it => {
      const cat = it.product?.category || 'Sem Categoria';
      const amount = toNumber(it.line_total) || (toNumber(it.unit_price) * toNumber(it.quantity));
      catMap.set(cat, (catMap.get(cat) || 0) + amount);
    }));
    return Array.from(catMap.entries()).sort((a,b) => b[1]-a[1]).slice(0,3).map(([name, total]) => ({ name, total }));
  }, [filteredSales]);

  const fiadoTotal = useMemo(() => (filteredSales || []).reduce((acc, s) => acc + toNumber(s.total_fiado_pending ?? s.total_fiado ?? 0), 0), [filteredSales]);

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

      {/* Hoje - single line summary */}
      <div className="mt-4 flex items-center justify-between rounded-md px-4 py-3 bg-neutral-900 dark:bg-white shadow-sm">
        <div className="flex items-center gap-6 w-full text-white dark:text-neutral-900 flex-wrap">
          <div className="flex flex-col mr-4">
            <span className="text-xs uppercase text-white/70 dark:text-neutral-500">Hoje</span>
          </div>

          <div className="flex-1 flex items-center gap-6 flex-wrap">
            <div className="flex flex-col">
              <span className="text-sm text-white/70 dark:text-neutral-500">Vendas (nº)</span>
              <span className="text-lg font-semibold text-white dark:text-neutral-900">{numVendasHoje}</span>
            </div>

            <div className="flex flex-col pl-6 border-l border-white/10 dark:border-black/10">
              <span className="text-sm text-white/70 dark:text-neutral-500">Vendas (R$)</span>
              <span className="text-lg font-semibold text-white dark:text-neutral-900">{formatCurrency(faturamentoHoje)}</span>
            </div>

            <div className="flex flex-col pl-6 border-l border-white/10 dark:border-black/10">
              <span className="text-sm text-white/70 dark:text-neutral-500">Ticket médio</span>
              <span className="text-lg font-semibold text-white dark:text-neutral-900">{formatCurrency(ticketMedioHoje)}</span>
            </div>

            <div className="flex flex-col pl-6 border-l border-white/10 dark:border-black/10">
              <span className="text-sm text-white/70 dark:text-neutral-500">Fiado</span>
              <span className="text-lg font-semibold text-white dark:text-neutral-900">{formatCurrency(fiadoHoje)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-surface-dark">
          <div className="text-sm text-neutral-400">Faturamento</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrency(faturamentoPeriodo)}</div>
          <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-white/10" />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-surface-dark">
          <div className="text-sm text-neutral-400">Fiado (acumulado)</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrency(fiadoTotal)}</div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-surface-dark">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-neutral-400">Vendas</div>
              <div className="mt-2">
                <span className="text-3xl font-extrabold leading-tight text-neutral-900 dark:text-neutral-100">{numVendasPeriodo}</span>
              </div>
            </div>

            <div className="ml-4 flex w-40 flex-col items-end">
              <div className="rounded-lg bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-700 dark:bg-white/5 dark:text-neutral-200">Ticket médio</div>
              <div className="mt-3 rounded-md bg-gradient-to-r from-white/50 to-transparent px-3 py-2 text-sm font-semibold text-neutral-900 dark:from-white/5 dark:text-neutral-100">
                {formatCurrency(ticketMedio)}
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-neutral-200" />
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
        <div className="space-y-4">
          <SalesLineCanvas data={salesByDay} height={140} />

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
    </div>
  );
}
