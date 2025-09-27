import { clsx } from "clsx";

export default function HighlightRow({ totals, loading }) {
  const items = [
    {
      label: "Produtos",
      value: totals.products,
      description: "Total de itens cadastrados",
    },
    {
      label: "Clientes",
      value: totals.customers,
      description: "Clientes disponiveis para vendas",
    },
    {
      label: "Vendas",
      value: totals.sales,
      description: "Historico registrado no periodo",
    },
    {
      label: "Fiado",
      value: totals.fiado.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      description: "Saldo pendente a receber",
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className={clsx(
            "rounded-3xl border border-outline/30 bg-white p-6 shadow-subtle transition dark:border-white/10 dark:bg-surface-dark/40",
            loading && "opacity-70"
          )}
        >
          <p className="text-xs uppercase tracking-[0.28em] text-neutral-400 dark:text-neutral-500">
            {item.label}
          </p>
          <p className="mt-4 text-2xl font-semibold">{item.value}</p>
          <p className="mt-3 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            {item.description}
          </p>
        </article>
      ))}
    </section>
  );
}
