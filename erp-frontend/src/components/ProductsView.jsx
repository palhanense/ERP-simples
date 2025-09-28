import { clsx } from "clsx";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useState, useEffect, useMemo } from "react";
import Calendar from "./Calendar";
import DateRange from "./DateRange";
import { fetchProductsReport } from "../lib/api";
import { resolveMediaUrl } from "../lib/api";
import ProductCreateModal from "./ProductCreateModal";
import { formatDate } from "../lib/dateFormat";

export default function ProductsView({ products, loading, onCreate = () => {}, onEdit, onProductsChanged }) {
  const [editingProduct, setEditingProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  // período padrão: do primeiro dia do mês atual até hoje
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
  const [serverTotals, setServerTotals] = useState(null);
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

  // pequeno seletor de período usando inputs nativos (padrão usado em outras telas)
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
  // O componente de resumo suporta dois formatos: 'currency' (padrão) ou 'number'
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
        <span className="block text-[0.6rem] text-neutral-600 dark:text-neutral-300 font-semibold">{label}</span>
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
    // garante que toDate não seja anterior a fromDate
    if (fromDate && toDate && toDate < fromDate) {
      setToDate(fromDate);
      return;
    }
    // busca relatório no backend com os filtros
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

  // calcula totais locais a partir dos produtos filtrados: quantidade, custo total (cost_price * estoque), venda total (sale_price * estoque)
  const localTotals = useMemo(() => {
    let totalProducts = (filtered || []).length;
    let totalCost = 0;
    let totalSale = 0;
    for (const p of (filtered || [])) {
      const stock = Number(resolveStockForTotals(p) || 0);
      const cost = Number(p.cost_price || p.cost || 0) || 0;
      const sale = Number(p.sale_price || p.price || 0) || 0;
      totalCost += stock * cost;
      totalSale += stock * sale;
    }
    return { total_products: totalProducts, total_cost: totalCost, total_sale: totalSale };
  }, [filtered]);

  const displayedTotals = {
    total_products:
      serverTotals && serverTotals.total_products != null ? serverTotals.total_products : localTotals.total_products,
    total_cost:
      serverTotals && serverTotals.total_cost != null ? serverTotals.total_cost : localTotals.total_cost,
    total_sale:
      serverTotals && serverTotals.total_sale != null ? serverTotals.total_sale : localTotals.total_sale,
  };

  // Garante valores numéricos seguros para exibição (evita misturar ?? e || dentro do JSX)
  const totalProductsNum = Number(
    displayedTotals.total_products != null ? displayedTotals.total_products : (filtered.length || 0)
  ) || 0;
  const totalCostNum = Number(
    displayedTotals.total_cost != null ? displayedTotals.total_cost : (localTotals.total_cost || 0)
  ) || 0;
  const totalSaleNum = Number(
    displayedTotals.total_sale != null ? displayedTotals.total_sale : (localTotals.total_sale || 0)
  ) || 0;

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
          {/* Mostrar totais sempre (antes eram ocultos em telas pequenas) */}
          <div className="flex items-center gap-3">
            <SummaryChip label="Ítens totais" value={totalProductsNum} format="number" />
            {/* totais retornados pelo servidor (ou calculados localmente) */}
            <SummaryChip label="Valor de custo" value={totalCostNum} />
            <SummaryChip label="Valor de venda" value={totalSaleNum} />
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
    <th className="w-[96px] text-center">Foto</th>
    <th className="w-[10%] border-l border-outline/20 text-center">SKU</th>
    <th className="w-[28%] border-l border-outline/20 text-center">Produto</th>
  <th className="w-[12%] border-l border-outline/20 text-center">catego</th>
  <th className="w-[10%] border-l border-outline/20 text-center">Preço<br/>venda</th>
  <th className="w-[10%] border-l border-outline/20 text-center">Preço<br/>custo</th>
  <th className="w-[8%] border-l border-outline/20 text-center">Margem</th>
  <th className="w-[8%] border-l border-outline/20 text-center">esto-<br/>que</th>
  <th className="w-[12%] border-l border-outline/20 text-center">ultima<br/>venda</th>
      </tr>
    </thead>
    <tbody className="text-sm">
      {filtered.map((product) => {
        const photo = product.photos?.[0] || "";
        const photoUrl = photo ? resolveMediaUrl(photo) : "";
        const placeholderInitial = product.name?.charAt(0)?.toUpperCase() || "P";
        // Prefer backend-provided stock when available, otherwise fallback to local heuristic
        const estoqueAtual = (product.stock !== undefined && product.stock !== null)
          ? product.stock
          : resolveStockForTotals(product) ?? "-";
        const ultimaVenda = product.last_sale_date ?? null;

        // format numbers without currency symbol but with two decimals
        const formattedSale = Number(product.sale_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formattedCost = Number(product.cost_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formattedMargin = (product.margin_percent !== undefined && product.margin_percent !== null)
          ? `${Number(product.margin_percent).toFixed(2)}%`
          : Number(product.margin || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        return (
          <tr key={product.id} onClick={() => handleEdit(product)} className="cursor-pointer">
            {/* Foto */}
            <td className="px-4 py-4 align-middle">
              <div className="h-20 w-20 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-white/5">
                {photoUrl ? (
                  <img src={photoUrl} alt={`Foto de ${product.name}`} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-400 dark:text-neutral-500">{placeholderInitial}</div>
                )}
              </div>
            </td>
            {/* SKU */}
            <td className="px-4 py-4 align-middle border-l border-outline/20 text-neutral-600">{product.sku}</td>
            {/* Produto */}
            <td className="px-4 py-4 align-middle border-l border-outline/20">
              <div
                className="text-sm font-medium text-text-light dark:text-text-dark"
                title={product.name}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {product.name}
              </div>
            </td>
            {/* Categoria */}
            <td className="px-4 py-4 align-middle border-l border-outline/20 text-neutral-500 text-sm">{product.category || '-'}</td>
            {/* Preço de venda */}
            <td className="px-4 py-4 align-middle border-l border-outline/20 text-right">{formattedSale}</td>
            {/* Preço de custo */}
            <td className="px-4 py-4 align-middle border-l border-outline/20 text-right">{formattedCost}</td>
            {/* Margem */}
            <td className="px-4 py-4 align-middle border-l border-outline/20 text-right">{formattedMargin}</td>
            {/* Estoque */}
            <td className="px-4 py-4 align-middle border-l border-outline/20 text-right">{estoqueAtual}</td>
            {/* Última venda */}
            <td className="px-4 py-4 align-middle border-l border-outline/20 text-right">{ultimaVenda ? formatDate(ultimaVenda) : '-'}</td>
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


