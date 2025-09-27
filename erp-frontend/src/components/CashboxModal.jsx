import { useEffect, useState } from "react";
import { fetchCashboxes, fetchCashboxReport, openCashbox, closeCashbox, createFinancialEntry } from "../lib/api";
import { formatDateTime } from "../lib/dateFormat";

export default function CashboxModal({ cashbox, onClose, onUpdated }) {
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [openFund, setOpenFund] = useState("0.00");
  const [closeAmount, setCloseAmount] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjType, setAdjType] = useState("sangria"); // 'sangria' or 'reforco'
  const [cashboxes, setCashboxes] = useState([]);
  const [selectedCashbox, setSelectedCashbox] = useState(cashbox || null);

  useEffect(() => {
    setReport(null);
    setOpenFund("0.00");
    setCloseAmount("");
    setAdjAmount("");
    // if parent passed a cashbox, use it; otherwise we'll fetch list
    setSelectedCashbox(cashbox || null);
    if (!cashbox) {
      // load list of cashboxes for selection inside the modal
      fetchCashboxes().then((list) => setCashboxes(list || [])).catch(() => setCashboxes([]));
    }
  }, [cashbox]);

  const current = selectedCashbox || cashbox;
  const isOpen = !!(current && current.opened_at && !current.closed_at);

  // use shared formatter
  // formatDateTime imported above

  const loadReport = async () => {
    const cb = selectedCashbox || cashbox;
    if (!cb) return;
    setLoadingReport(true);
    try {
      const r = await fetchCashboxReport(cb.id);
      setReport(r);
    } catch (err) {
      setReport({ error: err.message || String(err) });
    } finally {
      setLoadingReport(false);
    }
  };

  const handleOpen = async () => {
    const cb = selectedCashbox || cashbox;
    if (!cb) return alert('Selecione um caixa');
    setActionLoading(true);
    try {
      await openCashbox(cb.id);
      const fund = parseFloat(String(openFund).replace(',', '.')) || 0;
      if (fund > 0) {
        await createFinancialEntry({ type: "receita", category: "Fundo de Caixa", amount: fund, cashbox_id: cb.id });
      }
      // refresh the selectedCashbox data from server
      try {
        const list = await fetchCashboxes();
        const refreshed = (list || []).find((x) => x.id === cb.id) || null;
        setSelectedCashbox(refreshed || cb);
      } catch {}
      onUpdated?.();
    } catch (err) {
      alert(err.message || 'Falha ao abrir caixa');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    const cb = selectedCashbox || cashbox;
    if (!cb) return alert('Selecione um caixa');
    setLoadingReport(true);
    try {
      await loadReport();
    } catch (err) {
      // ignore
    } finally {
      setLoadingReport(false);
    }
  };

  const confirmClose = async () => {
    const cb = selectedCashbox || cashbox;
    if (!cb) return alert('Selecione um caixa');
    const counted = parseFloat(String(closeAmount).replace(',', '.'));
    if (isNaN(counted)) return alert('Informe o valor contado antes de confirmar o fechamento');
    setActionLoading(true);
    try {
      // ensure we have the latest report to compute expected cash
      if (!report) {
        await loadReport();
      }
      const expected = Number((report && report.expected_cash) || 0);
      const diff = Number((counted - expected).toFixed(2));

      // if there's a difference, register it as Sobra (receita) or Falta (despesa)
      try {
        if (diff > 0) {
          await createFinancialEntry({ type: 'receita', category: 'Sobra de Caixa', amount: diff, cashbox_id: cb.id });
        } else if (diff < 0) {
          await createFinancialEntry({ type: 'despesa', category: 'Falta de Caixa', amount: Math.abs(diff), cashbox_id: cb.id });
        }
      } catch (err) {
        // non-fatal: continue to attempt closing but notify user
        console.error('Falha ao registrar diferença automático:', err);
        alert('Falha ao registrar automaticamente sobra/falta: ' + (err.message || String(err)));
      }

      await closeCashbox(cb.id, { closed_amount: counted });
      onUpdated?.();
      onClose?.();
    } catch (err) {
      alert(err.message || 'Falha ao fechar caixa');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdj = async () => {
    const cb = selectedCashbox || cashbox;
    if (!cb) return alert('Selecione um caixa');
    const amount = parseFloat(String(adjAmount).replace(',', '.')) || 0;
    if (!amount || amount <= 0) return alert('Valor inválido');
    setActionLoading(true);
    try {
      if (adjType === 'sangria') {
        await createFinancialEntry({ type: 'despesa', category: 'Sangria', amount, cashbox_id: cb.id });
      } else {
        await createFinancialEntry({ type: 'receita', category: 'Reforco', amount, cashbox_id: cb.id });
      }
      setAdjAmount("");
      // refresh data
  try { const list = await fetchCashboxes(); const refreshed = (list || []).find((x) => x.id === cb.id) || null; setSelectedCashbox(refreshed || cb); } catch {}
      onUpdated?.();
    } catch (err) {
      alert(err.message || 'Falha ao registrar ajuste');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Caixa{(selectedCashbox || cashbox) ? `: ${(selectedCashbox || cashbox).name}` : ''}</h3>
            <button onClick={onClose} className="text-sm text-neutral-500">Fechar</button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {!selectedCashbox && !cashbox && (
              <div className="col-span-2">
                <div className="space-y-2">
                  {(cashboxes || []).map((c) => (
                    <div key={c.id} className="flex items-center justify-between border p-2 rounded">
                      <div>
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-sm text-neutral-500">Fundo: R$ {Number(c.initial_amount||0).toFixed(2)}</div>
                      </div>
                      <div>
                        <button onClick={async () => { setSelectedCashbox(c); try { const list = await fetchCashboxes(); const refreshed = (list || []).find((x) => x.id === c.id) || null; setSelectedCashbox(refreshed || c); } catch {} }} className="rounded-full border px-3 py-1">Selecionar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          <div>
            <p>Status: {isOpen ? 'Aberto' : 'Fechado'}</p>
            {isOpen && (
              <p>Fundo inicial: R$ {Number(current?.initial_amount || 0).toFixed(2)}</p>
            )}
            {isOpen ? (
              <p>Aberto em: {formatDateTime(current?.opened_at)}</p>
            ) : (
              <p>Fechado em: {formatDateTime(current?.closed_at)}</p>
            )}
            {!isOpen && current?.closed_amount != null && (
              <p>Valor fechado: R$ {Number(current.closed_amount).toFixed(2)}</p>
            )}
          </div>

          <div>
            {!isOpen && (
              <div className="space-y-2">
                <label className="block text-sm">Valor de fundo</label>
                <input value={openFund} onChange={(e) => setOpenFund(e.target.value)} className="w-full rounded px-3 py-2 border" />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleOpen} disabled={actionLoading} className="rounded-full border px-3 py-1">Abrir</button>
                </div>
              </div>
            )}

            {isOpen && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm">Sangria / Reforço</label>
                </div>
                <div className="flex gap-2">
                  <select value={adjType} onChange={(e) => setAdjType(e.target.value)} className="rounded px-2 py-1 border">
                    <option value="sangria">Sangria (retirada)</option>
                    <option value="reforco">Reforço (adicionar)</option>
                  </select>
                  <input value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} placeholder="0.00" className="rounded px-3 py-2 border" />
                  <button onClick={handleAdj} disabled={actionLoading} className="rounded-full border px-3 py-1">Registrar</button>
                </div>

                <div className="mt-4">
                  <label className="block text-sm">Fechar caixa</label>
                  <div className="flex gap-2 mt-2">
                    <input value={closeAmount} onChange={(e) => setCloseAmount(e.target.value)} placeholder="Valor contado" className="rounded px-3 py-2 border" />
                    <button onClick={async () => { await handleClose(); }} className="rounded-full border px-3 py-1">Mostrar relatório</button>
                    <button onClick={confirmClose} disabled={actionLoading} className="rounded-full border px-3 py-1">Confirmar fechar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-semibold">Relatório</h4>
          {loadingReport && <p>Carregando...</p>}
          {report?.error && <p className="text-red-500">{report.error}</p>}
          {report && !report.error && (
            <div className="mt-2">
              <p><strong>Totais por meio de pagamento</strong></p>
              <ul>
                {(report.payments || []).map((p) => (
                  <li key={p.method}>{p.method}: R$ {Number(p.amount).toFixed(2)}</li>
                ))}
              </ul>

              <p className="mt-2"><strong>Ajustes & Entradas/Lançamentos</strong></p>
              <ul>
                {(report.entries || []).map((e, idx) => (
                  <li key={idx}>{e.type} / {e.category}: R$ {Number(e.amount).toFixed(2)}</li>
                ))}
              </ul>

              <p className="mt-2"><strong>Total em dinheiro esperado:</strong> R$ {Number(report.expected_cash || 0).toFixed(2)}</p>

              <div className="mt-2 border-t pt-2">
                <p><strong>Conferência</strong></p>
                <p>Valor esperado: R$ {Number(report.expected_cash || 0).toFixed(2)}</p>
                <p>Valor contado (digite no campo acima): R$ {closeAmount || '-'}</p>
                {closeAmount !== '' && !isNaN(parseFloat(String(closeAmount).replace(',', '.'))) && (() => {
                  const counted = parseFloat(String(closeAmount).replace(',', '.')) || 0;
                  const expected = Number(report.expected_cash || 0);
                  const diff = Number((counted - expected).toFixed(2));
                  return (
                    <div>
                      <p>Diferença: R$ {diff.toFixed(2)} {diff > 0 ? '(Sobra)' : diff < 0 ? '(Falta)' : '(OK)'}</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
