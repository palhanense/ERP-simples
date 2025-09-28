import { useEffect, useMemo, useState } from "react";
import { ArrowPathIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { clsx } from "clsx";

import NavigationTabs from "./components/NavigationTabs";
import Login from "./components/Login";
import { useAuth } from './contexts/AuthContext';
import { CashboxProvider } from "./contexts/CashboxContext";
// HighlightRow removed (metrics moved to HomeReports/Fiado)
import ProductsView from "./components/ProductsView";
import CustomersView from "./components/CustomersView";
import SalesView from "./components/SalesView";
import CustomerCreateModal from "./components/CustomerCreateModal";
import ProductCreateModal from "./components/ProductCreateModal";
import SaleWizard from "./components/SaleWizard";
import ExpensesView from "./components/ExpensesView";
import HomeReports from "./components/HomeReports";
import FiadoView from "./components/FiadoView";

import { fetchProducts, fetchCustomers, fetchSales, fetchFinancialEntries, cancelSale, createCustomer, createProduct, updateProduct, uploadProductPhotos } from "./lib/api";
const navigation = [
  { id: "home", label: "Home" },
  { id: "products", label: "Produtos" },
  { id: "customers", label: "Clientes" },
  { id: "sales", label: "Vendas" },
    { id: "financials", label: "Financeiro" },
    { id: "fiado", label: "Fiado" },
];

function useThemePreference() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("erp-theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      window.localStorage.setItem("erp-theme", "dark");
    } else {
      root.classList.remove("dark");
      window.localStorage.setItem("erp-theme", "light");
    }
  }, [isDark]);

  return [isDark, setIsDark];
}

export default function App() {
  const { user, loading } = useAuth();

  if (!loading && !user) {
    return <Login />;
  }
  // start on Home by default
  const [activeView, setActiveView] = useState("home");
  const [isDark, setIsDark] = useThemePreference();
  const [storeName] = useState(() => {
    if (typeof window === 'undefined') return '';
    // prefer client-specific name; allow empty fallback
    return window.localStorage.getItem('erp-client-name') || window.localStorage.getItem('erp-store-name') || '';
  });

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [financialEntries, setFinancialEntries] = useState([]);

  // local data loading state (rename to avoid colliding with auth `loading`)
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalLoading, setProductModalLoading] = useState(false);
  const [productModalError, setProductModalError] = useState("");

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerModalLoading, setCustomerModalLoading] = useState(false);
  const [customerModalError, setCustomerModalError] = useState("");

  const sellButtonClasses = clsx(
    "fixed bottom-6 right-6 z-40 inline-flex items-center justify-center rounded-full px-10 py-4 text-lg font-semibold uppercase tracking-[0.3em] transition-transform duration-200 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    isDark
      ? "bg-white text-black shadow-[0_20px_40px_rgba(255,255,255,0.15)] hover:-translate-y-1 hover:bg-white/90 focus-visible:outline-white"
      : "bg-black text-white shadow-[0_20px_40px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:bg-black/90 focus-visible:outline-black"
  );
  const loadData = async () => {
    setDataLoading(true);
    setError("");
    try {
        const [productList, customerList, saleList, finList] = await Promise.all([
          fetchProducts(),
          fetchCustomers(),
          fetchSales(),
          fetchFinancialEntries(),
        ]);
        setProducts(productList);
        setCustomers(customerList);
        setSales(saleList);
        setFinancialEntries(finList);
    } catch (err) {
      setError(err.message || "Falha ao carregar dados");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totals = useMemo(() => ({
    products: products.length,
    customers: customers.length,
    sales: sales.length,
    fiado: sales.reduce((acc, sale) => acc + Number(sale.total_fiado_pending ?? sale.total_fiado ?? 0), 0),
  }), [products, customers, sales]);

  const handleCreateProduct = async (values, imageFiles) => {
    setProductModalLoading(true);
    setProductModalError("");
    setError("");
    try {
      const payload = {
        name: values.name.trim(),
        supplier: values.supplier?.trim() ? values.supplier.trim() : null,
        sku: values.sku.trim(),
        category: values.category?.trim() || "",
        cost_price: Number(values.cost_price || 0),
        sale_price: Number(values.sale_price || 0),
        min_stock: Number(values.min_stock || 0),
        photos: [],
        extra_attributes: {},
      };
      const created = await createProduct(payload);
      // Return created product to modal, which will handle photo upload and then call onProductsChanged
      return created;
    } catch (err) {
      const message = err.message || "Falha ao criar produto";
      setProductModalError(message);
      setError(message);
    } finally {
      setProductModalLoading(false);
    }
  };

  const handleEditProduct = async (productId, values, imageFiles) => {
    setProductModalLoading(true);
    setProductModalError("");
    setError("");
    try {
      const payload = {
        name: values.name?.trim(),
        supplier: values.supplier?.trim() ? values.supplier.trim() : null,
        sku: values.sku?.trim(),
        category: values.category?.trim() || "",
        cost_price: Number(values.cost_price || 0),
        sale_price: Number(values.sale_price || 0),
        min_stock: Number(values.min_stock || 0),
        photos: values.photos || [],
        extra_attributes: values.extra_attributes || {},
      };
      const updated = await updateProduct(productId, payload);
      // Return updated product to modal, which will handle uploading new photos and call onProductsChanged
      return updated;
    } catch (err) {
      const message = err.message || "Falha ao atualizar produto";
      setProductModalError(message);
      setError(message);
      throw err;
    } finally {
      setProductModalLoading(false);
    }
  };

  const handleCreateCustomer = async (values) => {
    setCustomerModalLoading(true);
    setCustomerModalError("");
    setError("");
    try {
  // ensure phone is digits-only when sending to backend
  const payload = { ...values };
  if (payload.phone) payload.phone = String(payload.phone).replace(/\D/g, '');
  const created = await createCustomer(payload);
      setCustomers((current) => [created, ...current]);
      setCustomerModalOpen(false);
    } catch (err) {
      const message = err.message || "Falha ao criar cliente";
      if (err && err.status === 409) {
        setCustomerModalError('Cliente já cadastrado.');
        setError('Cliente já cadastrado.');
      } else {
        setCustomerModalError(message);
        setError(message);
      }
    } finally {
      setCustomerModalLoading(false);
    }
  };

  const handleSaleCreated = (sale) => {
    setSales((current) => [sale, ...current]);
    setWizardOpen(false);
  };

  const handleCancelSale = async (saleId) => {
    try {
      const sale = await cancelSale(saleId);
      setSales((current) => current.map((item) => (item.id === sale.id ? sale : item)));
    } catch (err) {
      setError(err.message || "Nao foi possivel cancelar a venda");
    }
  };

  return (
    <CashboxProvider>
    <div className="min-h-full bg-surface-light text-text-light transition-colors duration-300 ease-out dark:bg-surface-dark dark:text-text-dark">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6 lg:px-10 xl:px-16">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* left spacer / brand area (removed) */}
          </div>
          <div className="ml-6 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-neutral-400 dark:text-neutral-500">Nome do cliente</p>
                <h2 className="text-2xl font-extrabold text-text-light dark:text-text-dark">{storeName || '(Sem nome)'}</h2>
              </div>

              {/* single theme selector placed to the right of the client name, above the menu */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsDark((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-outline/30 bg-transparent px-3 py-2 text-sm font-medium text-text-light transition hover:border-outline hover:bg-white/10 dark:border-white/20 dark:text-text-dark dark:hover:bg-white/5"
                  aria-label="Alternar modo visual"
                >
                  {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                  <span className="hidden sm:inline">{isDark ? 'Noite' : 'Dia'}</span>
                </button>
              </div>
            </div>

            <NavigationTabs
              navigation={navigation}
              activeView={activeView}
              onChange={setActiveView}
            />
          </div>
        </header>

        {error && (
          <div className="mt-10 rounded-3xl border border-red-300 bg-red-50 px-6 py-4 text-sm text-red-600 dark:border-red-400/40 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <main className="mt-8 flex-1 space-y-8">
          {/* summary cards removed from all screens; HomeReports and Fiado provide reporting */}
          {activeView === "home" && (
            <HomeReports />
          )}
          {activeView === "products" && (
            <ProductsView
            products={products}
            loading={dataLoading}
            onCreate={() => {
              setProductModalError("");
              setProductModalOpen(true);
            }}
            onEdit={handleEditProduct}
             onProductsChanged={(updated) => {
               // ensure updated product is reflected
               setProducts((cur) => {
                 const exists = cur.find(p => p.id === updated.id);
                 if (exists) return cur.map(p => p.id === updated.id ? updated : p);
                 return [updated, ...cur];
               });
             }}
          />
          )}
          {activeView === "customers" && (
            <CustomersView
              customers={customers}
              loading={dataLoading}
              onCreate={() => setCustomerModalOpen(true)}
            />
          )}
          {activeView === "sales" && (
            <SalesView
              sales={sales}
              onCancel={handleCancelSale}
              loading={dataLoading}
            />
          )}
          {activeView === "financials" && (
            <ExpensesView
              entries={financialEntries.filter((e) => e.type === 'despesa')}
              loading={dataLoading}
              onDelete={(id) => setFinancialEntries((cur) => cur.filter((e) => e.id !== id))}
              onUpdate={(entry) => setFinancialEntries((cur) => cur.map((e) => (e.id === entry.id ? entry : e)))}
            />
          )}
          
          {activeView === "fiado" && (
            <FiadoView sales={sales} customers={customers} onPaymentSaved={() => loadData()} />
          )}
        </main>
      </div>

      <button
        type="button"
        className={sellButtonClasses}
        onClick={() => setWizardOpen(true)}
        disabled={wizardOpen}
        aria-label="Abrir fluxo de venda"
      >
        Vender
      </button>

      {wizardOpen && (
        <SaleWizard
          customers={customers}
          products={products}
          onClose={() => setWizardOpen(false)}
          onSaleCreated={handleSaleCreated}
        />
      )}

      {productModalOpen && (
        <ProductCreateModal
          onClose={() => {
            setProductModalOpen(false);
            setProductModalError("");
          }}
          onSubmit={handleCreateProduct}
          loading={productModalLoading}
          error={productModalError}
          onProductSaved={(created) => {
            // Insert created product at top of list
            setProducts((cur) => [created, ...cur]);
            setProductModalOpen(false);
            setProductModalError("");
          }}
        />
      )}

      {customerModalOpen && (
        <CustomerCreateModal
          onClose={() => {
            setCustomerModalOpen(false);
            setCustomerModalError("");
          }}
          onSubmit={handleCreateCustomer}
          loading={customerModalLoading}
          error={customerModalError}
        />
      )}
      
    </div>
    </CashboxProvider>
  );
}

function ModeBadge({ label }) {
  return (
    <span className="rounded-full border border-outline/30 px-4 py-1 text-xs uppercase tracking-[0.3em] text-neutral-500 dark:border-white/20 dark:text-neutral-400">
      {label}
    </span>
  );
}


















