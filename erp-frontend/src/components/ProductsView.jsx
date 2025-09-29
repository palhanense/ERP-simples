import { clsx } from "clsx";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useState, useEffect, useMemo } from "react";
// Calendar/DateRange removed from ProductsView: using native PeriodPicker inputs instead
import { fetchProductsReport, fetchCategories } from "../lib/api";
import { resolveMediaUrl } from "../lib/api";
import ProductCreateModal from "./ProductCreateModal";
import { formatDate } from "../lib/dateFormat";

export default function ProductsView({ products, loading, onCreate = () => {}, onEdit, onProductsChanged }) {
  const [editingProduct, setEditingProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  // período de filtros removido da tela Produtos (nenhum calendário ou inputs de período nesta view)
  const [skuFilter, setSkuFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState([]);
  const [nameFilter, setNameFilter] = useState("");
  const [filtered, setFiltered] = useState(products || []);
  const [serverTotals, setServerTotals] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEdit = (product) => {
    try {
      console.debug('ProductsView: handleEdit called for product', product?.id);
    } catch (e) {}
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    try { console.debug('ProductsView: handleCloseModal called'); } catch (e) {}
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

  // Period picker removed from this view
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
    // load categories for the select dropdown
    (async () => {
      try {
        const cats = await fetchCategories();
        if (cats && cats.length) {
          setCategories(cats || []);
        } else {
          // derive categories from provided products prop as a fallback
          try {
            const uniq = Array.from(new Set((products || []).map((p) => (p.category || '').trim()).filter(Boolean))).map((name) => ({ id: name, name }));
            setCategories(uniq);
          } catch (e) {
            setCategories([]);
          }
        }
      } catch (e) {
        // ignore - categories are optional
      }
    })();

    // busca relatório no backend com os filtros (sem filtro por período nesta view)
    (async () => {
      setLocalLoading(true);
      setError("");
      try {
        const report = await fetchProductsReport({
          sku: skuFilter || undefined,
          name: nameFilter || undefined,
          category: categoryFilter || undefined,
          limit: 500,
        });
        setFiltered(report.products || []);
        setServerTotals(report.totals || { total_products: 0, total_cost: 0, total_sale: 0 });
      } catch (err) {
        setError(err?.message || "Erro ao carregar relatorio de produtos");
      } finally {
        setLocalLoading(false);
      }
    })();
  }, [products, skuFilter, nameFilter, categoryFilter]);

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
          <div className="flex items-center gap-3">
            <SummaryChip label="Ítens totais" value={totalProductsNum} format="number" />
            <SummaryChip label="Valor de custo" value={totalCostNum} />
            <SummaryChip label="Valor de venda" value={totalSaleNum} />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition hover:-translate-y-0.5 bg-black text-white border border-transparent hover:bg-black/90 dark:bg-white dark:text-black dark:border-white/10 dark:hover:border-white/30"
            >
              <PlusIcon className="h-4 w-4" /> Cadastrar produto
            </button>
          </div>
        </div>
      </header>

      {/* filtros alinhados: inputs serão exibidos numa segunda linha de cabeçalho dentro da tabela */}
      
      <div
        className={clsx(
          "rounded-3xl border border-outline/30 bg-white p-6 shadow-subtle dark:border-white/10 dark:bg-surface-dark/40",
          loading && "opacity-70"
        )}
      >
        <div className="-mx-6 overflow-x-auto px-6">
  {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
  <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-y-2">
    <colgroup>
      <col style={{ width: '72px' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '34%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '12%' }} />
    </colgroup>
    <thead>
    <tr className="text-left text-xs uppercase tracking-[0.25em] text-neutral-400 dark:text-neutral-500">
  <th className="w-[72px] align-middle text-center">Foto</th>
      <th className="w-[10%] border-l border-outline/20 text-center">SKU</th>
    <th className="w-[34%] border-l border-outline/20 text-left">Produto</th>
  <th className="w-[12%] border-l border-outline/20 text-center"><div className="leading-tight text-center">cate<br/>goria</div></th>
  <th className="w-[8%] border-l border-outline/20 text-center"><div className="leading-tight text-center">Preço<br/>venda</div></th>
  <th className="w-[8%] border-l border-outline/20 text-center"><div className="leading-tight text-center">Preço<br/>custo</div></th>
  <th className="w-[6%] border-l border-outline/20 text-center"><div className="leading-tight text-center">Mar<br/>gem</div></th>
  <th className="w-[6%] border-l border-outline/20 text-center"><div className="leading-tight text-center">esto<br/>que</div></th>
  <th className="w-[12%] border-l border-outline/20 text-center"><div className="leading-tight text-center">Última<br/>venda</div></th>
      </tr>
      <tr className="text-sm">
        <th />
        <th className="border-l border-outline/20 px-2 py-2 text-center">
          <input
            type="text"
            placeholder="Filtrar SKU"
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-2 py-1 text-sm font-normal"
            onClick={(e) => e.stopPropagation()}
          />
        </th>
        <th className="border-l border-outline/20 px-3 py-2">
          <input
            type="text"
            placeholder="Filtrar produto"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-2 py-1 text-sm font-normal"
            onClick={(e) => e.stopPropagation()}
          />
        </th>
        <th className="border-l border-outline/20 px-2 py-2 text-center">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-2 py-1 text-sm bg-white font-normal"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </th>
        <th className="border-l border-outline/20" />
        <th className="border-l border-outline/20" />
        <th className="border-l border-outline/20" />
        <th className="border-l border-outline/20" />
        <th className="border-l border-outline/20" />
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
          <tr key={product.id} onClick={() => handleEdit(product)} className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
            {/* Foto */}
            <td className="px-3 py-2 align-middle flex items-center justify-center">
              <div className="h-14 w-14 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-white/5">
                {photoUrl ? (
                  <img src={photoUrl} alt={`Foto de ${product.name}`} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-400 dark:text-neutral-500">{placeholderInitial}</div>
                )}
              </div>
            </td>
            {/* SKU */}
            <td className="px-2 py-2 align-middle border-l border-outline/20 text-neutral-600 text-sm text-center">{product.sku}</td>
            {/* Produto */}
            <td className="px-3 py-2 align-middle border-l border-outline/20">
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
            <td className="px-2 py-2 align-middle border-l border-outline/20 text-neutral-500 text-sm text-center">{product.category || '-'}</td>
            {/* Preço de venda */}
            <td className="px-2 py-2 align-middle border-l border-outline/20 text-center font-medium">{formattedSale}</td>
            {/* Preço de custo */}
            <td className="px-2 py-2 align-middle border-l border-outline/20 text-center text-neutral-500">{formattedCost}</td>
            {/* Margem */}
            <td className="px-2 py-2 align-middle border-l border-outline/20 text-center text-neutral-500">{formattedMargin}</td>
            {/* Estoque */}
            <td className="px-2 py-2 align-middle border-l border-outline/20 text-center text-neutral-500">{estoqueAtual}</td>
            {/* Última venda */}
            <td className="px-3 py-2 align-middle border-l border-outline/20 text-center">{ultimaVenda ? formatDate(ultimaVenda) : '-'}</td>
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
          <>
            {(() => { try { console.debug('ProductsView: rendering ProductCreateModal, showModal=', showModal, 'editingProductId=', editingProduct?.id); } catch (e) {} return null; })()}
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
          </>
        )}
      </div>
      </div>
    </section>
  );
}


