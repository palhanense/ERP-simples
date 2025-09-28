
import { useEffect, useMemo, useState, useRef } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";

import CustomerCreateModal from "./CustomerCreateModal";
import { digitsFromValue, digitsFromString, formatFromDigits, numberFromDigits, defaultLocale, defaultCurrency } from "../lib/format";
import { createCustomer, createSale, resolveMediaUrl, fetchCustomer } from "../lib/api";

const paymentMethods = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "cartao", label: "Cartao" },
  { value: "fiado", label: "Fiado" },
];

const stepLabels = ["Cliente", "Produtos", "Pagamento"];

function getAvailableStock(product) {
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
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }
  return Number.POSITIVE_INFINITY;
}

// Normalização de moeda: 123 -> 1,23
function normalizeCurrencyInput(value) {
  value = String(value).replace(/\D/g, "");
  if (!value) return "0.00";
  let intValue = parseInt(value, 10);
  let formatted = (intValue / 100).toFixed(2);
  return formatted;
}

function formatCurrencyInput(value) {
  if (!value) return "0,00";
  let num = Number(String(value).replace(/\./g, '').replace(/,/g, '.'));
  if (isNaN(num)) num = 0;
  return num.toFixed(2).replace('.', ',');
}

function parseAmount(value) {
  if (value === null || value === undefined) {
    return Number.NaN;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return Number.NaN;
    }
    // Normaliza para duas casas decimais
    const normalized = normalizeCurrencyInput(trimmed);
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : Number.NaN;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

function toFiniteAmount(value, fallback = 0) {
  const numeric = parseAmount(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatCurrency(value) {
  return toFiniteAmount(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function computeItemTotals(item) {
  const quantity = Number(item.quantity || 0);
  const unitPrice = toFiniteAmount(item.unitPrice);
  let discountValue = 0;
  let base = unitPrice * quantity;

  if (item.discountEnabled) {
    const raw = parseAmount(item.discountValue);
    if (Number.isFinite(raw)) {
      if (item.discountMode === "percent") {
        const percent = Math.min(Math.max(raw, 0), 100);
        // desconto por unidade
        const unitDiscount = (percent / 100) * unitPrice;
        discountValue = unitDiscount * quantity;
      } else if (item.discountMode === "value") {
        // desconto total no item, limitado ao total
        discountValue = Math.min(Math.max(raw, 0), base);
      }
    }
  }

  const subtotal = Math.max(base - discountValue, 0);
  return { base, discountValue, subtotal };
}

function allocateOverallDiscount(items, discountValue) {
  const normalizedDiscount = toFiniteAmount(discountValue, 0);
  if (!items.length || normalizedDiscount <= 0) {
    return items;
  }

  let remaining = normalizedDiscount;
  const result = items.map((item) => ({ ...item }));

  for (const item of result) {
    const { subtotal } = computeItemTotals(item);
    if (subtotal <= 0) continue;
    const applied = Math.min(subtotal, remaining);
    const newSubtotal = subtotal - applied;
    const newUnit = newSubtotal / Number(item.quantity || 1);
    item.effectiveUnitPrice = Number.isFinite(newUnit) ? newUnit : 0;
    remaining -= applied;
    if (remaining <= 0) break;
  }

  if (remaining > 0 && result.length) {
    const first = result[0];
    const { subtotal } = computeItemTotals(first);
    const newSubtotal = Math.max(subtotal - remaining, 0);
    const newUnit = newSubtotal / Number(first.quantity || 1);
    first.effectiveUnitPrice = Number.isFinite(newUnit) ? newUnit : 0;
  }

  return result.map((item) => {
    if (item.effectiveUnitPrice !== undefined) {
      return item;
    }
    const { subtotal } = computeItemTotals(item);
    const unit = subtotal / Number(item.quantity || 1);
    return {
      ...item,
      effectiveUnitPrice: Number.isFinite(unit) ? unit : 0,
    };
  });
}
export default function SaleWizard({
  customers,
  products,
  onClose,
  onSaleCreated,
}) {
  // Campo débito do cliente (fiado)
  const [customerDebit, setCustomerDebit] = useState(null);
  const lastCustomerIdRef = useRef(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  useEffect(() => {
    async function fetchDebit() {
      if (selectedCustomer && selectedCustomer.id && lastCustomerIdRef.current !== selectedCustomer.id) {
        lastCustomerIdRef.current = selectedCustomer.id;
        try {
          const data = await fetchCustomer(selectedCustomer.id);
          setCustomerDebit(data.balance_due ?? null);
        } catch (err) {
          setCustomerDebit(null);
        }
      } else if (!selectedCustomer) {
        setCustomerDebit(null);
        lastCustomerIdRef.current = null;
      }
    }
    fetchDebit();
  }, [selectedCustomer]);
  const [step, setStep] = useState(0);
  const [localCustomers, setLocalCustomers] = useState(customers);
  useEffect(() => {
    setLocalCustomers(customers);
  }, [customers]);
  const [customerSearch, setCustomerSearch] = useState("");
  // removed duplicate selectedCustomer declaration
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const [items, setItems] = useState([]);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const [overallDiscountEnabled, setOverallDiscountEnabled] = useState(false);
  const [overallDiscountMode, setOverallDiscountMode] = useState("percent");
  const [overallDiscountValue, setOverallDiscountValue] = useState("");
  const [overallDiscountDigits, setOverallDiscountDigits] = useState(digitsFromValue(""));

  // default: no payment selected
  const [payments, setPayments] = useState(
    paymentMethods.map((method) => ({
      method: method.value,
      label: method.label,
      enabled: false,
      amount: "",
      _digits: digitsFromValue("")
    }))
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [quickCustomerLoading, setQuickCustomerLoading] = useState(false);
  const [quickCustomerError, setQuickCustomerError] = useState("");
  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return localCustomers.slice(0, 8);
    return localCustomers.filter((customer) => {
      const name = customer.name?.toLowerCase() || "";
      const phone = customer.phone?.toLowerCase() || "";
      return name.includes(term) || phone.includes(term);
    });
  }, [customerSearch, localCustomers]);

  const itemsWithTotals = useMemo(() => {
    return items.map((item) => {
      const totals = computeItemTotals(item);
      return { ...item, totals };
    });
  }, [items]);


  const saleSummary = useMemo(() => {
    const subtotal = itemsWithTotals.reduce(
      (acc, item) => acc + item.totals.base,
      0
    );
    const itemDiscount = itemsWithTotals.reduce(
      (acc, item) => acc + item.totals.discountValue,
      0
    );
    const afterItems = subtotal - itemDiscount;

    let overallValue = 0;
    if (overallDiscountEnabled) {
      const numeric = parseAmount(overallDiscountValue);
      if (Number.isFinite(numeric)) {
        if (overallDiscountMode === "percent") {
          const percent = Math.min(Math.max(numeric, 0), 100);
          overallValue = (percent / 100) * afterItems;
        } else {
          overallValue = Math.min(Math.max(numeric, 0), afterItems);
        }
      }
    }

    // Corrigir: garantir que o desconto geral nunca ultrapasse o total após descontos de itens
    overallValue = Math.min(overallValue, afterItems);
    const total = Math.max(afterItems - overallValue, 0);

    return {
      subtotal,
      itemDiscount,
      overallDiscount: overallValue,
      total,
    };
  }, [itemsWithTotals, overallDiscountEnabled, overallDiscountMode, overallDiscountValue]);

  const paymentsState = useMemo(() => {
    const enabledPayments = payments
      .filter((payment) => payment.enabled)
      .map((payment) => {
        const parsedAmount = Number.isFinite(payment._digits !== undefined ? numberFromDigits(payment._digits) : parseAmount(payment.amount)) ? (payment._digits !== undefined ? numberFromDigits(payment._digits) : parseAmount(payment.amount)) : Number.NaN;
        return { ...payment, parsedAmount };
      });
    const totalPayments = enabledPayments.reduce(
      (acc, payment) =>
        acc + (Number.isFinite(payment.parsedAmount) ? payment.parsedAmount : 0),
      0
    );
    const diff = saleSummary.total - totalPayments;
    return {
      enabledPayments,
      totalPayments,
      diff,
    };
  }, [payments, saleSummary.total]);

  const canAdvanceFromCustomer = Boolean(selectedCustomer);
  const hasItems = items.length > 0;
  const canAdvanceFromProducts = hasItems && items.every((item) => {
    const quantity = Number(item.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) return false;
    const stock = item.maxQuantity;
    if (Number.isFinite(stock) && quantity > stock) return false;
    if (item.discountEnabled) {
      const raw = parseAmount(item.discountValue);
      if (!Number.isFinite(raw) || raw < 0) {
        return false;
      }
      if (item.discountMode === "percent") {
        if (raw > 100) return false;
      } else if (item.discountMode === "value") {
        const subtotal = toFiniteAmount(item.unitPrice) * quantity;
        if (raw > subtotal) return false;
      }
    }
    return true;
  });

  const paymentsValid = useMemo(() => {
    if (!paymentsState.enabledPayments.length) return false;
    if (
      paymentsState.enabledPayments.some(
        (payment) => !Number.isFinite(payment.parsedAmount) || payment.parsedAmount <= 0
      )
    ) {
      return false;
    }
    return Math.abs(paymentsState.diff) <= 0.05;
  }, [paymentsState]);

  const stepIsValid = step === 0
    ? canAdvanceFromCustomer
    : step === 1
      ? canAdvanceFromProducts
      : paymentsValid;

  const goToStep = (target) => {
    setError("");
    setStep(target);
  };

  const handleAddProduct = (product, quantity) => {
    const maxQuantity = getAvailableStock(product);
    if (Number.isFinite(maxQuantity) && quantity > maxQuantity) {
      setError(`Quantidade excede o estoque para ${product.name}`);
      return;
    }

    setItems((current) => {
      const existingIndex = current.findIndex((item) => item.productId === product.id);
      if (existingIndex >= 0) {
        const updated = [...current];
        const existing = updated[existingIndex];
        const newQuantity = existing.quantity + quantity;
        if (Number.isFinite(existing.maxQuantity) && newQuantity > existing.maxQuantity) {
          return current;
        }
        updated[existingIndex] = {
          ...existing,
          quantity: newQuantity,
        };
        return updated;
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: toFiniteAmount(product.sale_price),
          quantity,
          maxQuantity,
          discountEnabled: false,
          discountMode: "percent",
          discountValue: "",
        },
      ];
    });
  };

  const handleOverallDiscountDigitsChange = (digits) => {
    setOverallDiscountDigits(digits);
    try {
      setOverallDiscountValue(formatFromDigits(digits));
    } catch (e) {
      // fallback: clear
      setOverallDiscountValue("");
    }
  };

  const handleOverallDiscountModeChange = (mode) => {
    setOverallDiscountMode(mode);
    // reset current value when switching modes to avoid confusion
    setOverallDiscountValue("");
    setOverallDiscountDigits(digitsFromValue(""));
  };

  const handleFinalizeSale = async () => {
    setSubmitting(true);
    setError("");

    try {
      const itemsAdjusted = allocateOverallDiscount(itemsWithTotals, saleSummary.overallDiscount).map((item) => ({
        product_id: item.productId,
        quantity: Number(item.quantity),
        unit_price: toFiniteAmount(item.effectiveUnitPrice ?? item.unitPrice),
      }));

      const payload = {
        customer_id: selectedCustomer ? selectedCustomer.id : null,
        items: itemsAdjusted,
        payments: paymentsState.enabledPayments.map((payment) => ({
          method: payment.method,
          // parsedAmount is numeric (from _digits) when available
          amount: Number.isFinite(payment.parsedAmount) ? Number(payment.parsedAmount.toFixed(2)) : 0,
          notes: null,
        })),
        notes: undefined,
      };

      const sale = await createSale(payload);
      setSuccess(sale);
      onSaleCreated?.(sale);
    } catch (err) {
      setError(err.message || "Falha ao concluir venda");
      setStep(1);
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const resetWizard = () => {
    setStep(0);
    setSelectedCustomer(null);
    setItems([]);
    setOverallDiscountEnabled(false);
    setOverallDiscountValue("");
    setOverallDiscountDigits(digitsFromValue(''));
    setPayments(
      paymentMethods.map((method, index) => ({
        method: method.value,
        label: method.label,
        enabled: index === 0,
        amount: "",
        _digits: digitsFromValue('')
      }))
    );
    setSuccess(null);
    setError("");
  };

  const handleQuickCustomerCreate = async (values) => {
    setQuickCustomerLoading(true);
    setQuickCustomerError("");
    setError("");
    try {
  const payload = { ...values };
  if (payload.phone) payload.phone = String(payload.phone).replace(/\D/g, '');
  const created = await createCustomer(payload);
      setLocalCustomers((current) => [created, ...current]);
      setSelectedCustomer(created);
      setCustomerModalOpen(false);
    } catch (err) {
      const message = err.message || "Falha ao criar cliente";
      setQuickCustomerError(message);
      setError(message);
    } finally {
      setQuickCustomerLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-outline/40 bg-white text-text-light shadow-2xl transition-colors dark:border-white/10 dark:bg-surface-dark dark:text-text-dark">
        <header className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 px-8 py-3">
          <div />
          <button
            onClick={onClose}
            className="rounded-full border border-neutral-300 p-2 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-800 dark:border-white/20 dark:text-white/60 dark:hover:border-white/40 dark:hover:text-white"
            aria-label="Fechar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-neutral-200 dark:border-white/10 px-8 py-3">
          <nav className="flex items-center gap-4">
            {stepLabels.map((label, index) => (
              <div key={label} className="flex items-center gap-2 text-sm uppercase tracking-[0.25em]">
                <span
                  className={clsx(
                    "flex h-6 w-6 items-center justify-center rounded-full border",
                    index === step
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                      : index < step
                        ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-300 dark:bg-emerald-300 dark:text-black"
                        : "border-neutral-300 text-neutral-400 dark:border-white/20 dark:text-neutral-400 dark:text-white/50"
                  )}
                >
                  {index < step ? <CheckIcon className="h-4 w-4" /> : index + 1}
                </span>
                <span className={index === step ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-white/60"}>{label}</span>
                {index < stepLabels.length - 1 && (
                  <span className="text-neutral-300 dark:text-white/20">/</span>
                )}
              </div>
            ))}
          </nav>
        </div>

        <main className="flex-1 overflow-auto px-8 py-6">
          {/* Campo Débito atual para pagamento fiado */}
          {step === 2 && payments.some((p) => p.method === "fiado" && p.enabled) && selectedCustomer && (
            <div className="mb-4 flex items-center gap-4 p-4 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200">
              <span className="font-semibold uppercase tracking-widest text-xs">Débito atual:</span>
              <span className="text-lg font-bold">{customerDebit === null ? "..." : `R$ ${Number(customerDebit).toFixed(2)}`}</span>
            </div>
          )}
          {success ? (
            <SuccessState sale={success} onReset={resetWizard} onClose={onClose} />
          ) : step === 0 ? (
            <CustomerStep
              customers={filteredCustomers}
              search={customerSearch}
              onSearchChange={setCustomerSearch}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              onCreateCustomer={() => setCustomerModalOpen(true)}
            />
          ) : step === 1 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <button
                    onClick={() => setProductModalOpen(true)}
                    className="rounded-full border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                  >
                    Adicionar produto
                  </button>
                </div>
                <div>
                  <SummaryTile compact label="Total" value={itemsWithTotals.reduce((acc, it) => acc + (it.totals?.subtotal || 0), 0)} emphasis />
                </div>
              </div>

              <ProductStep
                items={items}
                setItems={setItems}
                products={products}
                onOpenProductModal={() => setProductModalOpen(true)}
                showSummary={false}
                showHeader={false}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PaymentStep
                  selectedCustomer={selectedCustomer}
                  items={itemsWithTotals}
                  saleSummary={saleSummary}
                  payments={payments}
                  setPayments={setPayments}
                  overallDiscountEnabled={overallDiscountEnabled}
                  overallDiscountMode={overallDiscountMode}
                  overallDiscountValue={overallDiscountValue}
                  setOverallDiscountEnabled={setOverallDiscountEnabled}
                  setOverallDiscountMode={setOverallDiscountMode}
                  setOverallDiscountValue={setOverallDiscountValue}
                  paymentsState={paymentsState}
                  showSummary={false}
                />
              </div>
              <aside className="lg:col-span-1">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <SummaryTile label="Subtotal" value={saleSummary.subtotal} compact />
                    <SummaryTile label="Desc." value={saleSummary.itemDiscount} compact />
                  </div>
                  <SummaryTile label="Total" value={saleSummary.total} emphasis />
                  <div className="mt-2 rounded-lg border border-neutral-200/60 bg-neutral-50 p-3 dark:border-white/10 dark:bg-surface-dark">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Desconto geral</div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={overallDiscountEnabled}
                          onChange={(e) => setOverallDiscountEnabled(e.target.checked)}
                        />
                        <span className="text-xs text-neutral-500">Ativar</span>
                      </label>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <select
                        value={overallDiscountMode}
                        onChange={(e) => handleOverallDiscountModeChange(e.target.value)}
                        className="rounded border px-2 py-1 text-sm"
                      >
                        <option value="percent">%</option>
                        <option value="value">R$</option>
                      </select>

                      {overallDiscountMode === "percent" ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="flex-1 rounded border px-2 py-1 text-sm"
                          placeholder="0"
                          value={overallDiscountValue}
                          onChange={(e) => setOverallDiscountValue(e.target.value)}
                          disabled={!overallDiscountEnabled}
                        />
                      ) : (
                        <input
                          type="text"
                          className="flex-1 rounded border px-2 py-1 text-sm"
                          placeholder="R$ 0,00"
                          value={formatFromDigits(overallDiscountDigits)}
                          onChange={(e) => handleOverallDiscountDigitsChange(digitsFromString(e.target.value))}
                          disabled={!overallDiscountEnabled}
                        />
                      )}
                    </div>

                    <div className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                      {overallDiscountEnabled ? (
                        overallDiscountMode === "percent" ? (
                          <div>Aplicado: {overallDiscountValue}% — {formatCurrency(saleSummary.overallDiscount)}</div>
                        ) : (
                          <div>Aplicado: {formatCurrency(saleSummary.overallDiscount)}</div>
                        )
                      ) : (
                        <div className="text-xs text-neutral-500">Desconto geral não aplicado</div>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </main>

        {error && !success && (
          <div className="mx-8 mb-3 rounded-2xl border border-red-400/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {!success && (
          <footer className="flex items-center justify-between border-t border-neutral-200 dark:border-white/10 px-8 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => (step === 0 ? onClose() : goToStep(step - 1))}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-2 text-sm uppercase tracking-[0.25em] text-neutral-600 transition hover:border-neutral-500 dark:border-white/20 dark:text-neutral-300 dark:hover:border-white/40"
              >
                {step === 0 ? "Fechar" : <><ArrowLeftIcon className="h-4 w-4" /> Voltar</>}
              </button>
              {step === 2 && (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-4 py-2 text-xs uppercase tracking-[0.25em] text-neutral-400 opacity-60 dark:border-white/10 dark:bg-white/10 dark:text-neutral-500"
                >
                  Salvar rascunho
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === 2 ? (
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={!stepIsValid || submitting}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-900 bg-neutral-900 px-6 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/90"
                >
                  {submitting ? "Processando..." : "Finalizar venda"}
                </button>
              ) : (
                <button
                  onClick={() => goToStep(step + 1)}
                  disabled={!stepIsValid}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-900 bg-neutral-900 px-6 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/90"
                >
                  Proximo <ArrowRightIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </footer>
        )}

        {customerModalOpen && (
          <CustomerCreateModal
            onClose={() => {
              setCustomerModalOpen(false);
              setQuickCustomerError("");
            }}
            onSubmit={handleQuickCustomerCreate}
            loading={quickCustomerLoading}
            error={quickCustomerError}
          />
        )}

        {productModalOpen && (
          <ProductPickerModal
            products={products}
            search={productSearch}
            onSearchChange={setProductSearch}
            onClose={() => setProductModalOpen(false)}
            onAdd={handleAddProduct}
          />
        )}

        {confirmOpen && (
          <ConfirmModal
            onConfirm={handleFinalizeSale}
            onCancel={() => setConfirmOpen(false)}
            submitting={submitting}
            saleSummary={saleSummary}
            customer={selectedCustomer}
            items={itemsWithTotals}
            payments={paymentsState.enabledPayments}
          />
        )}
      </div>
    </div>
  );
}
function CustomerStep({
  customers,
  search,
  onSearchChange,
  selectedCustomer,
  onSelectCustomer,
  onCreateCustomer,
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Selecione o cliente</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Busque por nome ou telefone para localizar rapidamente.</p>
        </div>
        <button
          onClick={onCreateCustomer}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 text-sm uppercase tracking-[0.25em] text-neutral-600 transition hover:border-neutral-500 dark:border-white/20 dark:text-neutral-300 dark:hover:border-white/40"
        >
          <PlusIcon className="h-4 w-4" /> Novo cliente
        </button>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Buscar cliente..."
        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-white/20 dark:bg-transparent dark:text-white dark:focus:border-white/60"
      />

      <div className="grid gap-3 md:grid-cols-2">
        {customers.map((customer) => {
          const isSelected = selectedCustomer?.id === customer.id;
          return (
            <button
              key={customer.id}
              onClick={() => onSelectCustomer(customer)}
              className={clsx(
                "flex flex-col items-start gap-2 rounded-3xl border px-5 py-4 text-left transition",
                isSelected
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white/10 dark:text-white"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-white/20 dark:text-neutral-200 dark:hover:border-white/40"
              )}
            >
              <span className="text-base font-semibold">{customer.name}</span>
              <span className="text-xs uppercase tracking-[0.25em] text-neutral-400">
                Telefone: {customer.phone || "-"}
              </span>
              <span className="text-xs text-neutral-500">Email: {customer.email || "-"}</span>
            </button>
          );
        })}
        {customers.length === 0 && (
          <p className="rounded-3xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm text-neutral-500 dark:border-white/20 dark:bg-surface-dark/20 dark:text-neutral-400">
            Nenhum cliente encontrado para a busca.
          </p>
        )}
      </div>

      {selectedCustomer && (
        <div className="rounded-3xl border border-neutral-200 px-5 py-4 text-sm text-neutral-600 dark:border-white/20 dark:text-neutral-200">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Cliente selecionado</p>
          <p className="mt-2 text-lg font-semibold">{selectedCustomer.name}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <span>Telefone: {selectedCustomer.phone || "-"}</span>
            <span>Email: {selectedCustomer.email || "-"}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function ProductStep({ items, setItems, products, onOpenProductModal, showSummary = true, showHeader = true }) {
  const updateItem = (index, patch) => {
    setItems((current) =>
      current.map((item, idx) =>
        idx === index
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  };

  const removeItem = (index) => {
    setItems((current) => current.filter((_, idx) => idx !== index));
  };

  const extendedItems = items.map((item) => {
    const totals = computeItemTotals(item);
    return { ...item, totals };
  });

  const summary = extendedItems.reduce(
    (acc, item) => {
      acc.subtotal += item.totals.base;
      acc.discount += item.totals.discountValue;
      acc.total += item.totals.subtotal;
      return acc;
    },
    { subtotal: 0, discount: 0, total: 0 }
  );

  return (
    <section className="space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Produtos</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Escolha produtos e defina quantidades.</p>
          </div>
          <button
            onClick={onOpenProductModal}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            <PlusIcon className="h-4 w-4" /> Adicionar produto
          </button>
        </div>
      )}
      
      <div className="overflow-hidden rounded-3xl border border-white/20">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-neutral-100 text-xs uppercase tracking-[0.25em] text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Produto</th>
              <th className="px-4 py-3 text-left">Unit.</th>
              <th className="px-4 py-3 text-left">Estoque</th>
              <th className="px-4 py-3 text-left">Desc.</th>
              <th className="px-4 py-3 text-right">Subt.</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {extendedItems.map((item, index) => {
              const quantityError = Number.isFinite(item.maxQuantity)
                ? Number(item.quantity || 0) > item.maxQuantity
                : false;
              const discountValue = parseAmount(item.discountValue);
              const discountError = item.discountEnabled
                ? item.discountMode === "percent"
                  ? !Number.isFinite(discountValue) || discountValue < 0 || discountValue > 100
                  : !Number.isFinite(discountValue) || discountValue < 0 || discountValue > item.totals.base
                : false;

              return (
                <tr key={item.productId} className="bg-white text-neutral-700 dark:bg-surface-dark/30 dark:text-neutral-200">
                  <td className="px-4 py-3">{item.sku}</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-3">{Number.isFinite(item.maxQuantity) ? item.maxQuantity : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-neutral-400">
                        <input
                          type="checkbox"
                          checked={item.discountEnabled}
                          onChange={(event) =>
                            updateItem(index, {
                              discountEnabled: event.target.checked,
                              discountValue: event.target.checked ? item.discountValue : "",
                            })
                          }
                          className="h-4 w-4 rounded border-neutral-400 bg-white text-neutral-900 focus:ring-neutral-300 dark:border-white/30 dark:bg-transparent dark:text-white dark:focus:ring-white/40"
                        />
                        Aplicar desconto
                      </label>
                      {item.discountEnabled && (
                        <div className="flex items-center gap-2">
                          <select
                            value={item.discountMode}
                            onChange={(event) =>
                              updateItem(index, {
                                discountMode: event.target.value,
                              })
                            }
                            className="rounded-xl border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-white/20 dark:bg-transparent dark:text-white dark:focus:border-white/60"
                          >
                            <option value="percent">%</option>
                            <option value="value">R$</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            step={item.discountMode === "percent" ? "0.1" : "0.01"}
                            lang="pt-BR"
                            inputMode="decimal"
                            value={item.discountValue}
                            onChange={(event) =>
                              updateItem(index, {
                                discountValue: event.target.value,
                              })
                            }
                            className="w-28 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-white/20 dark:bg-transparent dark:text-white dark:focus:border-white/60"
                          />
                        </div>
                      )}
                      {discountError && (
                        <p className="text-xs text-red-300">Desconto invalido</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{formatCurrency(item.totals.subtotal)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeItem(index)}
                      className="rounded-full border border-neutral-300 p-2 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-800 dark:border-white/20 dark:text-white/60 dark:hover:border-white/40 dark:hover:text-white"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-neutral-500">
                  Nenhum produto adicionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showSummary && (
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryTile label="Subtotal" value={summary.subtotal} />
          <SummaryTile label="Desc." value={summary.discount} />
          <SummaryTile label="Total" value={summary.total} emphasis />
        </div>
      )}
    </section>
  );
}
function PaymentStep({
  selectedCustomer,
  items,
  saleSummary,
  payments,
  setPayments,
  overallDiscountEnabled,
  overallDiscountMode,
  overallDiscountValue,
  setOverallDiscountEnabled,
  setOverallDiscountMode,
  setOverallDiscountValue,
  paymentsState,
}) {
  const togglePayment = (method) => {
    setPayments((current) =>
      current.map((payment) =>
        payment.method === method
          ? { ...payment, enabled: !payment.enabled }
          : payment
      )
    );
  };

  const updatePaymentAmount = (method, value) => {
    setPayments((current) =>
      current.map((payment) =>
        payment.method === method ? { ...payment, amount: value } : payment
      )
    );
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-neutral-200 bg-neutral-50 px-6 py-3 text-sm text-neutral-600 dark:border-white/20 dark:bg-surface-dark/20 dark:text-neutral-200">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Resumo</p>
        <p className="mt-1 text-base font-semibold truncate max-w-xs">{selectedCustomer?.name || "Cliente nao selecionado"}</p>
      </div>

      {/* summary and discount moved to aside */}

      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-neutral-400">
          Pagamentos
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {payments.map((payment) => (
            <div
              key={payment.method}
              className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2 dark:border-white/20 dark:bg-surface-dark/20"
            >
              <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={payment.enabled}
                  onChange={() => togglePayment(payment.method)}
                  className="h-4 w-4 rounded border-neutral-400 bg-white text-neutral-900 focus:ring-neutral-300 dark:border-white/30 dark:bg-transparent dark:text-white dark:focus:ring-white/40"
                />
                <span className="text-sm">{payment.label}</span>
              </label>
              {payment.enabled && (
                <input
                  type="text"
                  inputMode="numeric"
                  value={payment.amount ? payment.amount : formatFromDigits(payment._digits, defaultLocale, defaultCurrency)}
                  onChange={(event) => {
                    const d = digitsFromString(event.target.value);
                    setPayments((cur) => cur.map((p) => p.method === payment.method ? { ...p, amount: formatFromDigits(d, defaultLocale, defaultCurrency), _digits: d } : p));
                  }}
                  placeholder="Valor"
                  className="ml-auto w-28 rounded-xl border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-white/20 dark:bg-transparent dark:text-white dark:focus:border-white/60"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] dark:border-white/20 dark:bg-surface-dark/20">
          <span>Total</span>
          <div className="flex items-baseline gap-4">
            <span className={Math.abs(paymentsState.diff) <= 0.05 ? "text-emerald-300" : "text-red-600"}>
              {formatCurrency(paymentsState.diff)}
            </span>
            <span className="text-sm text-neutral-400">Saldo</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryTile({ label, value, emphasis, compact = false }) {
  if (compact) {
    return (
      <div className={clsx("rounded-3xl border px-4 py-2 flex items-center justify-between", emphasis ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-neutral-50 text-neutral-700")}>
        <span className={clsx("text-xs uppercase tracking-[0.25em]", emphasis ? "text-white/70" : "text-neutral-500")}>{label}</span>
        <span className="text-sm font-semibold">{formatCurrency(value)}</span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "rounded-3xl border px-5 py-4",
        emphasis
          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
          : "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-white/20 dark:bg-surface-dark/40 dark:text-neutral-200"
      )}
    >
      <p className={clsx(
        "text-xs uppercase tracking-[0.25em]",
        emphasis ? "text-white/70 dark:text-black/70" : "text-neutral-500 dark:text-neutral-500"
      )}>{label}</p>
      <p className="mt-2 text-lg font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}
function ProductPickerModal({ products, search, onSearchChange, onClose, onAdd }) {
  const [quantities, setQuantities] = useState({});
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [selectedForQuantity, setSelectedForQuantity] = useState(null);
  const [quantityInput, setQuantityInput] = useState(1);
  const [previewUrl, setPreviewUrl] = useState(null);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products.slice(0, 30);
    return products.filter((product) => {
      const name = product.name?.toLowerCase() || "";
      const sku = product.sku?.toLowerCase() || "";
      return name.includes(term) || sku.includes(term);
    });
  }, [search, products]);

  const handleAdd = (product, qty) => {
    const quantity = Number(qty || quantities[product.id] || 1);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    onAdd(product, quantity);
  };

  const openQuantityModal = (product) => {
    setSelectedForQuantity(product);
    setQuantityInput(quantities[product.id] ?? 1);
    setQuantityModalOpen(true);
  };

  const confirmQuantity = () => {
    if (!selectedForQuantity) return;
    const q = Number(quantityInput || 1);
    const stock = getAvailableStock(selectedForQuantity);
    if (Number.isFinite(stock) && q > stock) {
      alert(`Quantidade excede estoque (max ${stock})`);
      return;
    }
    handleAdd(selectedForQuantity, q);
    setQuantityModalOpen(false);
    setSelectedForQuantity(null);
    // close the product picker modal and return to sales screen
    try {
      onClose();
    } catch (e) {
      // ignore if onClose not available
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-3xl border border-outline/40 bg-white px-6 py-6 shadow-xl dark:border-white/10 dark:bg-surface-dark">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Adicionar produtos</h3>
          <button
            onClick={onClose}
            className="rounded-full border border-neutral-300 p-2 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-800 dark:border-white/20 dark:text-white/60 dark:hover:border-white/40 dark:hover:text-white"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </header>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nome ou SKU"
          className="mb-4 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-white/20 dark:bg-transparent dark:text-white dark:focus:border-white/60"
        />
        <div className="flex-1 overflow-auto rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-neutral-200 text-sm text-neutral-700 dark:divide-white/10 dark:text-neutral-200">
            <thead className="bg-neutral-100 text-xs uppercase tracking-[0.25em] text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
              <tr>
                  <th className="px-4 py-3 text-left">Foto</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Produto</th>
                  <th className="px-4 py-3 text-left">Unit.</th>
                  <th className="px-4 py-3 text-left">Qtd</th>
                  <th className="px-4 py-3"></th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredProducts.map((product) => {
                    const stock = getAvailableStock(product);
                    return (
                  <tr key={product.id} className="bg-white dark:bg-surface-dark/30">
                    <td className="px-4 py-3">
                      {product.photos && product.photos.length ? (
                        <button onClick={() => setPreviewUrl(resolveMediaUrl(product.photos[0]))} className="rounded overflow-hidden focus:outline-none">
                          <img src={resolveMediaUrl(product.photos[0])} alt={product.name} className="h-10 w-10 rounded object-cover cursor-pointer" />
                        </button>
                      ) : (
                        <div className="h-10 w-10 rounded bg-neutral-100 dark:bg-white/5" />
                      )}
                    </td>
                    <td className="px-4 py-3">{product.sku}</td>
                    <td className="px-4 py-3">{product.name}</td>
                    <td className="px-4 py-3">{formatCurrency(product.sale_price)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        value={quantities[product.id] ?? 1}
                        onChange={(e) => setQuantities((cur) => ({ ...cur, [product.id]: e.target.valueAsNumber || 1 }))}
                        className="w-20 rounded-xl border border-neutral-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const q = quantities[product.id] ?? null;
                          if (q && Number.isFinite(q) && q > 0) {
                            handleAdd(product, q);
                          } else {
                            openQuantityModal(product);
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-outline px-3 py-1 text-xs uppercase tracking-[0.25em] text-text-light dark:text-text-dark transition hover:-translate-y-0.5 hover:bg-white/5 dark:hover:bg-white/5"
                      >
                        Adicionar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-neutral-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Quantity modal (small and consistent with app) */}
        {quantityModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-lg">
              <h4 className="text-lg font-semibold mb-2">Definir quantidade</h4>
              <p className="text-sm text-neutral-500 mb-3">Produto: {selectedForQuantity?.name}</p>
              <input
                type="number"
                min="1"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.valueAsNumber || 1)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 mb-3"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setQuantityModalOpen(false)} className="rounded-full border px-4 py-2">Cancelar</button>
                <button onClick={confirmQuantity} className="rounded-full bg-neutral-900 text-white px-4 py-2">Adicionar</button>
              </div>
            </div>
          </div>
        )}
        {/* Image preview modal */}
        {previewUrl && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="relative w-full max-w-3xl rounded-2xl bg-white p-4 shadow-xl">
              <button
                onClick={() => setPreviewUrl(null)}
                className="absolute right-3 top-3 rounded-full border border-neutral-300 p-2 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-800 dark:border-white/20 dark:text-white/60"
                aria-label="Fechar preview"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center justify-center">
                <img src={previewUrl} alt="Preview" className="max-h-[70vh] max-w-full object-contain" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmModal({ onConfirm, onCancel, submitting, saleSummary, customer, items, payments }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
      <div className="w-full max-w-lg rounded-3xl border border-outline/40 bg-white px-6 py-6 shadow-xl dark:border-white/10 dark:bg-surface-dark">
        <h3 className="text-lg font-semibold">Confirmar venda</h3>
        <p className="mt-1 text-sm text-neutral-400">Revise os dados antes de finalizar.</p>

        <div className="mt-4 space-y-3 text-sm text-neutral-200">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Cliente</p>
            <p>{customer?.name || "Cliente nao informado"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Itens</p>
            <ul className="mt-2 space-y-1">
              {items.map((item) => (
                <li key={item.productId} className="flex justify-between">
                  <span>
                    {item.name} x{item.quantity}
                  </span>
                  <span>{formatCurrency(item.totals.subtotal)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Pagamentos</p>
            <ul className="mt-2 space-y-1">
              {payments.map((payment) => (
                <li key={payment.method} className="flex justify-between">
                  <span>{payment.method}</span>
                  <span>{formatCurrency(payment.parsedAmount ?? payment.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] dark:border-white/20 dark:bg-surface-dark/20">
            <span>Total</span>
            <span>{formatCurrency(saleSummary.total)}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm uppercase tracking-[0.25em] text-neutral-600 transition hover:border-neutral-500 dark:border-white/20 dark:text-neutral-300 dark:hover:border-white/40"
          >
            Voltar
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-full border border-neutral-900 bg-neutral-900 px-5 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            {submitting ? "Confirmando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessState({ sale, onReset, onClose }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center text-neutral-600 dark:text-neutral-200">
      <div className="rounded-full border border-emerald-400/40 bg-emerald-400/20 p-6 text-emerald-200">
        <CheckIcon className="h-10 w-10" />
      </div>
      <div className="space-y-3">
        <h3 className="text-2xl font-semibold text-neutral-900 dark:text-white">Venda concluida</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Numero da venda: {sale.id}. Total recebido: {formatCurrency(sale.total_amount)}.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="rounded-full border border-neutral-300 px-5 py-2 text-sm uppercase tracking-[0.25em] text-neutral-600 transition hover:border-neutral-500 dark:border-white/20 dark:text-neutral-300 dark:hover:border-white/40"
        >
          Ver venda
        </button>
        <button
          onClick={onReset}
          className="rounded-full border border-neutral-900 bg-neutral-900 px-5 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          Nova venda
        </button>
      </div>
    </div>
  );
}






























































