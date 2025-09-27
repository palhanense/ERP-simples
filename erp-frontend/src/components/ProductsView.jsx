import { clsx } from "clsx";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import Calendar from "./Calendar";
import { fetchProductsReport } from "../lib/api";
import { resolveMediaUrl } from "../lib/api";
import ProductCreateModal from "./ProductCreateModal";

export default function ProductsView({ products, loading, onCreate = () => {}, onEdit, onProductsChanged }) {
  const [editingProduct, setEditingProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  // default period: from first day of current month to today
  const formatPad = (n) => n.toString().padStart(2, "0");
  const todayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${formatPad(now.getMonth() + 1)}-${formatPad(now.getDate())}`;
  };
  const firstOfMonthString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${formatPad(now.getMonth() + 1)}-01`;
  };

  const [fromDate, setFromDate] = useState(() => firstOfMonthString());
  const [toDate, setToDate] = useState(() => todayString());
  const [filtered, setFiltered] = useState(products || []);
  const [serverTotals, setServerTotals] = useState({ total_products: 0, total_cost: 0, total_sale: 0 });
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    setShowModal(false);
  };

  // Função para atualizar produto localmente após edição/cadastro
  const handleProductSaved = (updatedProduct) => {
    if (onProductsChanged) {
      onProductsChanged(updatedProduct);
    }
    setEditingProduct(null);
    setShowModal(false);
  };

  // small date picker helper using native inputs (pattern used elsewhere)
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
  // Summary chip supports two formats: 'currency' (default) or 'number'
  function SummaryChip({ label, value, format = "currency" }) {
    let display;
    if (typeof value === "number") {
      display =
        format === "number"
          ? Number(value || 0).toLocaleString("pt-BR")
          : Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    } else {
      display = value;
    }
    return (
      <div className="rounded-2xl border border-outline px-4 py-2 text-xs uppercase tracking-[0.25em] text-neutral-500 dark:border-white/20 dark:text-neutral-300">
        <span className="block text-[0.55rem] text-neutral-400 dark:text-neutral-500">{label}</span>
        <span className="mt-1 block text-sm font-semibold text-text-light dark:text-text-dark">{display}</span>
      </div>
    );
  }

  // Deriva o estoque disponível a partir de campos possíveis (extra_attributes ou propriedades diretas)
  function resolveStockForTotals(product) {
    const candidates = [
      product.stock,
      product.stock_quantity,
      product.available_stock,
      product.inventory,
    ];
    if (product.extra_attributes) {
      const extra = product.extra_attributes;
      candidates.push(extra.stock, extra.estoque, extra.available_stock);
    }
    for (const value of candidates) {
      if (value === null || value === undefined) continue;
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) return numeric;
    }
    // se não houver informação de estoque, assumimos 0 para somatórios
    return 0;
  }

  useEffect(() => {
    // ensure toDate is not earlier than fromDate
    if (fromDate && toDate && toDate < fromDate) {
      setToDate(fromDate);
      return;
    }
    // fetch report from backend with filters
    (async () => {
      setLocalLoading(true);
      setError("");
      try {
        const report = await fetchProductsReport({ from_date: fromDate || undefined, to_date: toDate || undefined, limit: 500 });
        setFiltered(report.products || []);
        setServerTotals(report.totals || { total_products: 0, total_cost: 0, total_sale: 0 });
      } catch (err) {
        setError(err?.message || "Erro ao carregar relatorio de produtos");
      } finally {
        setLocalLoading(false);
      }
    })();
  }, [products, fromDate, toDate]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Produtos</h2>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-full border border-outline px-5 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:border-outline/80 dark:border-white/10 dark:hover:border-white/30"
          >
            <PlusIcon className="h-4 w-4" /> Cadastrar produto
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3">
            <SummaryChip label="Total produtos" value={serverTotals.total_products ?? filtered.length} format="number" />
            {/* totais retornados pelo servidor */}
            <SummaryChip label="Valor compra" value={serverTotals.total_cost ?? 0} />
            <SummaryChip label="Valor venda" value={serverTotals.total_sale ?? 0} />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <DateRange from={fromDate} to={toDate} onChange={(v) => { if (v.from) setFromDate(v.from); if (v.to) setToDate(v.to); }} />
          </div>
        </div>
      </header>
      <div
        className={clsx(
          "rounded-3xl border border-outline/30 bg-white p-6 shadow-subtle dark:border-white/10 dark:bg-surface-dark/40",
          loading && "opacity-70"
        )}
      >
  {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
  <table className="w-full table-fixed border-separate border-spacing-y-4">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.25em] text-neutral-400 dark:text-neutral-500">
              <th className="w-[10%]">Foto</th>
              <th className="w-[10%]">SKU</th>
              <th className="w-[20%]">Prod</th>
              <th className="w-[10%]">Cat</th>
              <th className="w-[8%]">Custo</th>
              <th className="w-[8%]">Venda</th>
              <th className="w-[8%]">Margem</th>
              <th className="w-[6%]">Vend.</th>
              <th className="w-[6%]">Estq</th>
              <th className="w-[6%]">Ú. V</th>
              <th className="w-[6%]">Ú. C</th>
              <th className="w-[6%]">Min</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filtered.map((product) => {
              const photo = product.photos?.[0] || "";
              const photoUrl = photo ? resolveMediaUrl(photo) : "";
              const placeholderInitial = product.name?.charAt(0)?.toUpperCase() || "P";
              // Exemplo: campos fictícios para estoque, última venda e compra
              const estoqueAtual = resolveStockForTotals(product) ?? "-";
              const ultimaVenda = product.last_sale_date ?? "-";
              const ultimaCompra = product.last_purchase_date ?? "-";

              return (
                <tr
                  key={product.id}
                  className="rounded-2xl border border-outline/20 bg-white/70 transition hover:-translate-y-0.5 hover:border-outline hover:bg-white dark:border-white/10 dark:bg-surface-dark/60 dark:hover:border-white/30 cursor-pointer"
                  onClick={() => handleEdit(product)}
                >
                  <td className="rounded-l-2xl px-4 py-4">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl border border-outline/20 bg-neutral-100 dark:border-white/10 dark:bg-white/5">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={`Foto de ${product.name}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-400 dark:text-neutral-500">
                          {placeholderInitial}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-neutral-500 dark:text-neutral-400">{product.sku}</td>
                  <td className="px-4 py-4 font-medium">{product.name}</td>
                  <td className="px-4 py-4 text-neutral-500 dark:text-neutral-400">{product.category}</td>
                  <td className="px-4 py-4">
                    {Number(product.cost_price || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="px-4 py-4">
                    {Number(product.sale_price || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="px-4 py-4">
                    {Number(product.margin || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="px-4 py-4">
                    {Number(product.total_sold || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="px-4 py-4">{estoqueAtual}</td>
                  <td className="px-4 py-4">{ultimaVenda}</td>
                  <td className="px-4 py-4">{ultimaCompra}</td>
                  <td className="rounded-r-2xl px-4 py-4">{product.min_stock}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && !localLoading && (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            Nenhum produto cadastrado ate o momento.
          </p>
        )}
        {(loading || localLoading) && (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">Carregando produtos...</p>
        )}
        {showModal && (
          <ProductCreateModal
            onClose={handleCloseModal}
            onSubmit={async (data) => {
              setModalLoading(true);
              setModalError("");
              try {
                // Se for edição, chama onEdit, senão onCreate
                const result = editingProduct ? await onEdit(editingProduct.id, data, data._imageFiles || []) : await onCreate(data, data._imageFiles || []);
                setModalLoading(false);
                return result;
              } catch (err) {
                setModalError(err?.message || "Erro ao salvar produto.");
                setModalLoading(false);
                throw err;
              }
            }}
            loading={modalLoading}
            error={modalError}
            initialData={editingProduct}
            onProductSaved={handleProductSaved}
          />
        )}
      </div>
    </section>
  );
}


