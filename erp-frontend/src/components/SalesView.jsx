import { clsx } from "clsx";
import { useEffect, useState } from "react";
import Calendar from "./Calendar";
// ...existing code...

// small date picker helper using native inputs for consistency with design
function PeriodPicker({ fromDate, toDate, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={fromDate || ""}
        onChange={(e) => onChange(e.target.value, toDate)}
        className="rounded-xl border border-neutral-300 px-3 py-1 text-sm"
      />
      <span className="text-sm text-neutral-400">—</span>
      <input
        type="date"
        value={toDate || ""}
        onChange={(e) => onChange(fromDate, e.target.value)}
        className="rounded-xl border border-neutral-300 px-3 py-1 text-sm"
      />
    </div>
  );
}

function SummaryChip({ label, value }) {
  return (
    <div className="rounded-2xl border border-outline px-4 py-2 text-xs uppercase tracking-[0.25em] text-neutral-500 dark:border-white/20 dark:text-neutral-300">
      <span className="block text-[0.55rem] text-neutral-400 dark:text-neutral-500">{label}</span>
      <span className="mt-1 block text-sm font-semibold text-text-light dark:text-text-dark">
        {Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </span>
    </div>
  );
}

export default function SalesView({ sales, onCancel, loading }) {
  const fiadoTotal = sales.reduce((acc, sale) => acc + Number(sale.total_fiado || 0), 0);
  const totalAmount = sales.reduce((acc, sale) => acc + Number(sale.total_amount || 0), 0);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtered, setFiltered] = useState(sales);
  // ...existing code...

  useEffect(() => {
    // ensure toDate is not earlier than fromDate
    if (fromDate && toDate && toDate < fromDate) {
      setToDate(fromDate);
      return;
    }
    const f = sales.filter((s) => {
      if (!fromDate && !toDate) return true;
      const created = new Date(s.created_at).toISOString().slice(0, 10);
      if (fromDate && created < fromDate) return false;
      if (toDate && created > toDate) return false;
      return true;
    });
    setFiltered(f);
  }, [sales, fromDate, toDate]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Vendas</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Controle de vendas com divisao de pagamentos e fiado.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SummaryChip label="Total" value={totalAmount} />
          <SummaryChip label="Fiado" value={fiadoTotal} />
        </div>
      </header>
      <div
        className={clsx(
          "rounded-3xl border border-outline/30 bg-white p-6 shadow-subtle dark:border-white/10 dark:bg-surface-dark/40",
          loading && "opacity-70"
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <div />
          <DateRange from={fromDate} to={toDate} onChange={(v) => { if (v.from) setFromDate(v.from); if (v.to) setToDate(v.to); }} />
        </div>
        <ul className="space-y-4">
          {filtered.map((sale) => (
            <li
              key={sale.id}
              className="flex flex-col gap-3 rounded-2xl border border-outline/20 bg-white/70 p-5 transition hover:-translate-y-0.5 hover:border-outline hover:bg-white dark:border-white/10 dark:bg-surface-dark/60 dark:hover:border-white/30"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
                    Venda {sale.id}
                  </p>
                  <h3 className="text-lg font-semibold">
                    {sale.customer?.name || "Cliente nao informado"}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.25em]">
                  {sale.payments?.map((payment) => (
                    <span
                      key={`${sale.id}-${payment.id}`}
                      className="rounded-full border border-outline px-3 py-1 text-neutral-500 dark:border-white/20 dark:text-neutral-300"
                    >
                      {payment.method}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm text-neutral-500 dark:text-neutral-400">
                <span>
                  Total: {Number(sale.total_amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
                <span>
                  Fiado: {Number(sale.total_fiado || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
                <span>Status: {sale.status}</span>
                <span>
                  Criado: {new Date(sale.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="flex gap-2">
                {sale.status !== "cancelled" && (
                  <button
                    onClick={() => onCancel(sale.id)}
                    className="self-start rounded-full border border-outline px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500 transition hover:border-outline/80 dark:border-white/10 dark:text-neutral-300 dark:hover:border-white/30"
                  >
                    Cancelar venda
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {sales.length === 0 && !loading && (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            Nenhuma venda registrada ate o momento.
          </p>
        )}
      </div>
    </section>
  );
}

// Payment modal top-level rendering
// The modal is managed inside this component via local state (paymentSale)
// and will call the API via PaymentModal which in turn calls App through callbacks.




