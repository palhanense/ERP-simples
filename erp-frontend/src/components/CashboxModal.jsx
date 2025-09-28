import { useEffect, useState } from "react";
import { useCashbox } from "../contexts/CashboxContext";
import { formatDateTime } from "../lib/dateFormat";

export default function CashboxModal({ onClose, onUpdated }) {
  const { current, loading, open, close, fetchReport } = useCashbox();
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [openFund, setOpenFund] = useState("0.00");
  const [closeAmount, setCloseAmount] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjType, setAdjType] = useState("sangria"); // 'sangria' or 'reforco'

  useEffect(() => {
    setReport(null);
    setOpenFund("0.00");
    setCloseAmount("");
    setAdjAmount("");
  }, [current]);

  const isOpen = !!(current && current.opened_at && !current.closed_at);

  // use shared formatter
  // formatDateTime imported above

  const loadReport = async () => {
    if (!current) return;
    setLoadingReport(true);
    try {
      const r = await fetchReport();
      setReport(r);
    } catch (err) {
      setReport({ error: err.message || String(err) });
    } finally {
      setLoadingReport(false);
    }
  };

  const handleOpen = async () => {
    setActionLoading(true);
    try {
      await open({ initial_amount: parseFloat(String(openFund).replace(',', '.')) || 0 });
      onUpdated?.();
    } catch (err) {
      alert(err?.message || 'Falha ao abrir caixa');
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
    if (!current) return alert('Nenhum caixa aberto');
    const counted = parseFloat(String(closeAmount).replace(',', '.'));
    if (isNaN(counted)) return alert('Informe o valor contado antes de confirmar o fechamento');
    setActionLoading(true);
    try {
      if (!report) await loadReport();
      const expected = Number((report && report.expected_cash) || 0);
      const diff = Number((counted - expected).toFixed(2));
      try {
        if (diff > 0) {
          await createFinancialEntry({ type: 'receita', category: 'Sobra de Caixa', amount: diff, cashbox_id: current.id });
        } else if (diff < 0) {
          await createFinancialEntry({ type: 'despesa', category: 'Falta de Caixa', amount: Math.abs(diff), cashbox_id: current.id });
        }
      } catch (err) {
        console.error('Falha ao registrar diferença automático:', err);
        alert('Falha ao registrar automaticamente sobra/falta: ' + (err.message || String(err)));
      }
      await close({ closed_amount: counted });
      onUpdated?.();
      onClose?.();
    } catch (err) {
      alert(err?.message || 'Falha ao fechar caixa');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdj = async () => {
    if (!current) return alert('Nenhum caixa aberto');
    const amount = parseFloat(String(adjAmount).replace(',', '.')) || 0;
    if (!amount || amount <= 0) return alert('Valor inválido');
    setActionLoading(true);
    try {
      if (adjType === 'sangria') {
        await createFinancialEntry({ type: 'despesa', category: 'Sangria', amount, cashbox_id: current.id });
      } else {
        await createFinancialEntry({ type: 'receita', category: 'Reforco', amount, cashbox_id: current.id });
      }
      setAdjAmount("");
      onUpdated?.();
    } catch (err) {
      alert(err?.message || 'Falha ao registrar ajuste');
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
            {!current && (
              <div className="col-span-2">
                <div className="text-sm text-neutral-500">Nenhum caixa aberto no momento. Use o botão abaixo para abrir o período de movimentação.</div>
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
                  <button onClick={handleOpen} disabled={actionLoading || loading} className="rounded-full border px-3 py-1">Abrir</button>
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
                      <button onClick={async () => { await loadReport(); }} disabled={!current || loadingReport} className="rounded-full border px-3 py-1">Mostrar relatório</button>
                      <button onClick={confirmClose} disabled={actionLoading || !current} className="rounded-full border px-3 py-1">Confirmar fechar</button>
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
