import { createContext, useContext, useEffect, useState } from 'react';
import { fetchCashboxes, createCashbox, openCashbox as apiOpen, closeCashbox as apiClose, createFinancialEntry, fetchCashboxReport } from '../lib/api';

const CashboxContext = createContext(null);

export function CashboxProvider({ children }) {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await fetchCashboxes();
      const items = list || [];
      // prefer an open cashbox (opened_at && !closed_at)
      const openCb = items.find((c) => c.opened_at && !c.closed_at) || null;
      setCurrent(openCb);
    } catch (err) {
      setCurrent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const open = async ({ name = `Caixa ${new Date().toLocaleString()}`, initial_amount = 0 } = {}) => {
    setLoading(true);
    try {
      // create a cashbox record then open it
      const cb = await createCashbox({ name, initial_amount });
      await apiOpen(cb.id);
      if (Number(initial_amount) && Number(initial_amount) > 0) {
        await createFinancialEntry({ type: 'receita', category: 'Fundo de Caixa', amount: Number(initial_amount), cashbox_id: cb.id });
      }
      await refresh();
      return true;
    } finally {
      setLoading(false);
    }
  };

  const close = async ({ closed_amount = 0 } = {}) => {
    if (!current) throw new Error('No open cashbox');
    setLoading(true);
    try {
      await apiClose(current.id, { closed_amount });
      await refresh();
      return true;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    current,
    loading,
    refresh,
    open,
    close,
    fetchReport: async () => {
      if (!current) return null;
      try {
        return await fetchCashboxReport(current.id);
      } catch (err) { return { error: err?.message || String(err) }; }
    }
  };

  return <CashboxContext.Provider value={value}>{children}</CashboxContext.Provider>;
}

export function useCashbox() {
  const ctx = useContext(CashboxContext);
  if (!ctx) throw new Error('useCashbox must be used within CashboxProvider');
  return ctx;
}

export default CashboxContext;
