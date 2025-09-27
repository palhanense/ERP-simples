import { clsx } from "clsx";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

export default function CustomersView({ customers, loading, onCreate }) {
  const [nameQuery, setNameQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");

  const filtered = useMemo(() => {
    const nq = (nameQuery || "").trim().toLowerCase();
    const pq = (phoneQuery || "").trim();
    if (!nq && !pq) return customers;
    return customers.filter((c) => {
      const nameMatch = nq ? (c.name || "").toLowerCase().includes(nq) : true;
      const phoneMatch = pq ? ((c.phone || "").toString().includes(pq)) : true;
      return nameMatch && phoneMatch;
    });
  }, [customers, nameQuery, phoneQuery]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Clientes</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Consulta rapida dos clientes cadastrados no ERP.
          </p>
        </div>
        {onCreate && (
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-full border border-outline px-5 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:border-outline/80 dark:border-white/10 dark:hover:border-white/30"
          >
            <PlusIcon className="h-4 w-4" /> Novo cliente
          </button>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
          <div className="w-full sm:w-1/2">
            <label className="block text-sm text-neutral-600">Filtrar por nome</label>
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Nome do cliente"
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div className="w-full sm:w-1/2">
            <label className="block text-sm text-neutral-600">Filtrar por telefone</label>
            <input
              type="text"
              value={phoneQuery}
              onChange={(e) => setPhoneQuery(e.target.value)}
              placeholder="Telefone"
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>
      </div>

      <div className={clsx("grid gap-4 md:grid-cols-3", loading && "opacity-70")}>
        {filtered.map((customer) => (
          <article
            key={customer.id}
            className="rounded-3xl border border-outline/30 bg-white p-6 shadow-subtle transition hover:-translate-y-0.5 hover:border-outline/60 dark:border-white/10 dark:bg-surface-dark/40"
          >
            <header className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{customer.name}</h3>
              <span className="rounded-full border border-emerald-400/60 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-500">
                Ativo
              </span>
            </header>
            <dl className="mt-5 space-y-3 text-sm text-neutral-500 dark:text-neutral-400">
              {/* Campo 'Documento' removido */}
              <div className="flex justify-between">
                <dt>Email</dt>
                <dd className="font-medium text-text-light dark:text-text-dark">
                  {customer.email || "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Telefone</dt>
                <dd className="font-medium text-text-light dark:text-text-dark">
                  {customer.phone || "-"}
                </dd>
              </div>
            </dl>
          </article>
        ))}
        {filtered.length === 0 && !loading && (
          <p className="rounded-3xl border border-outline/30 bg-white p-6 text-sm text-neutral-500 dark:border-white/10 dark:bg-surface-dark/40 dark:text-neutral-400">
            Nenhum cliente encontrado com esses filtros.
          </p>
        )}
      </div>
    </section>
  );
}
