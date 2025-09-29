import { useEffect, useMemo, useState, useRef } from "react";
import { createCustomerPayment, searchCustomersLocal, fetchCustomer } from "../lib/api";
import { digitsFromString, formatFromDigits, numberFromDigits, digitsFromValue, defaultLocale, defaultCurrency } from "../lib/format";

export default function CustomerPaymentModal({ customers = [], onClose, onSaved }) {
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [amountDigits, setAmountDigits] = useState(digitsFromValue("") || "");
  const [method, setMethod] = useState("dinheiro");
  const [currentDebt, setCurrentDebt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const inputRef = useRef(null);

  const suggestions = useMemo(() => searchCustomersLocal(customers, query).slice(0, 8), [customers, query]);

  useEffect(() => {
    if (selectedCustomer) setQuery(selectedCustomer.name || "");
    // fetch current debt when selecting a customer
    (async () => {
      if (selectedCustomer && selectedCustomer.id) {
        try {
          const data = await fetchCustomer(selectedCustomer.id);
          setCurrentDebt(data.balance_due ?? 0);
        } catch (e) {
          setCurrentDebt(null);
        }
      } else {
        setCurrentDebt(null);
      }
    })();
  }, [selectedCustomer]);

  useEffect(() => {
    // reset suggestion index when suggestions change
    setSuggestionIndex(-1);
  }, [suggestions.length]);

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setQuery(c.name || "");
    setSuggestionIndex(-1);
  };

  const handleInputKeyDown = (e) => {
    if (!suggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestionIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestionIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (suggestionIndex >= 0 && suggestions[suggestionIndex]) {
        e.preventDefault();
        selectCustomer(suggestions[suggestionIndex]);
      }
    } else if (e.key === "Escape") {
      setSuggestionIndex(-1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedCustomer) {
      setError("Selecione um cliente");
      return;
    }
    const numericAmount = numberFromDigits(amountDigits);
    if (!numericAmount || numericAmount <= 0) {
      setError("Informe um valor maior que zero");
      return;
    }
    setLoading(true);
    try {
    const payload = { customer_id: selectedCustomer.id, amount: numericAmount, method };
      const res = await createCustomerPayment(payload);
      onSaved && onSaved(res);
      onClose && onClose();
    } catch (err) {
      setError(err.message || "Falha ao registrar pagamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg dark:bg-surface-dark">
        <h3 className="mb-4 text-lg font-semibold">Realizar Pagamento de Fiado</h3>

        <div className="mb-3">
          <label className="block text-sm text-neutral-600">Cliente</label>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedCustomer(null); setSuggestionIndex(-1); }}
            onKeyDown={handleInputKeyDown}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="Pesquisar cliente..."
          />
          {suggestions.length > 0 && ( !selectedCustomer || (selectedCustomer && (selectedCustomer.name || '') !== query) ) && (
            <ul className="mt-2 max-h-40 overflow-auto rounded-md border bg-white">
              {suggestions.map((c, idx) => (
                <li
                  key={c.id}
                  className={`px-3 py-2 cursor-pointer ${idx === suggestionIndex ? 'bg-neutral-100' : 'hover:bg-neutral-100'}`}
                  onMouseEnter={() => setSuggestionIndex(idx)}
                  onClick={() => selectCustomer(c)}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-neutral-500">{c.phone || c.email || "-"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mb-3">
          <label className="block text-sm text-neutral-600">Valor</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatFromDigits(amountDigits, defaultLocale, defaultCurrency)}
            onChange={(e) => { const d = digitsFromString(e.target.value); setAmountDigits(d); }}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm text-neutral-600">Método</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2">
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="cartao">Cartão</option>
          </select>
        </div>

        {selectedCustomer && (
          <div className="mb-3 rounded p-3 bg-yellow-50 border border-yellow-200">
            <div className="text-xs text-yellow-700 uppercase">Débito atual</div>
            <div className="mt-1 text-lg font-semibold">{currentDebt === null ? '...' : `R$ ${Number(currentDebt).toFixed(2)}`}</div>
          </div>
        )}

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border px-4 py-2">Fechar</button>
          <button type="submit" disabled={loading} className="rounded-full bg-black px-4 py-2 text-white disabled:opacity-60">{loading ? 'Registrando...' : 'Registrar'}</button>
        </div>
      </form>
    </div>
  );
}
