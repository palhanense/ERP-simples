import { useEffect, useMemo, useState } from 'react';
import DateRange from './DateRange';
import { fetchReportMeta, executeReport } from '../lib/api';
import ReportTable from './ReportTable';
import ReportChart from './ReportChart';
import Card from './ui/Card';
import Button from './ui/Button';
import Select from './ui/Select';
import FilterBuilder from './FilterBuilder';

const ENTITY_LABELS = [
  { id: 'cliente', label: 'Clientes' },
  { id: 'produto', label: 'Produtos' },
  { id: 'pedido', label: 'Pedidos de Venda' },
  { id: 'fornecedor', label: 'Fornecedores' },
  { id: 'contas', label: 'Contas a Pagar/Receber' },
];

function StepPills({ step, setStep }) {
  return (
    <div className="inline-flex items-center gap-2">
      {[1, 2, 3].map((s) => (
        <button key={s} onClick={() => setStep(s)} className={`px-3 py-1 rounded-full text-sm ${s === step ? 'bg-black text-white' : 'bg-surface-light text-neutral-700'}`}>
          {s === 1 ? '1. Entidade' : s === 2 ? '2. Campos & Filtros' : '3. Agrupar & Totalizar'}
        </button>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [step, setStep] = useState(1);
  const [entity, setEntity] = useState('pedido');
  const [meta, setMeta] = useState(null);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [filters, setFilters] = useState([]); // { field, op, value }
  const [groupBy, setGroupBy] = useState('');
  const [aggregate, setAggregate] = useState({ func: '', field: '' });
  const [range, setRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [chartHint, setChartHint] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchReportMeta(entity).then((m) => {
      if (!mounted) return;
      setMeta(m);
      setChartHint(m?.chartHints || null);
      const defaults = m?.default_columns || (m?.fields || []).map(f => (typeof f === 'string' ? f : f.name));
      setSelectedColumns(defaults.slice(0, 8));
      setFilters([]);
      setGroupBy('');
      setAggregate({ func: '', field: '' });
      setColumns([]);
      setRows([]);
    }).catch((err) => setError(err.message || String(err)));
    return () => { mounted = false; };
  }, [entity]);

  const handleRun = async () => {
    setLoading(true);
    setError('');
    try {
      // Build payload: keep it simple and explicit so backend can adapt
      const payload = {
        entity,
        columns: selectedColumns,
        filters: {
          // include date range as conventional fields
          ...(range.from ? { from_date: range.from } : {}),
          ...(range.to ? { to_date: range.to } : {}),
          // additional filters as array for flexibility
          extra: filters,
        },
        group_by: groupBy || undefined,
        aggregate: aggregate.func ? { func: aggregate.func, field: aggregate.field } : undefined,
        limit: 1000,
      };

      const resp = await executeReport(payload, { timeout: 30000 });
      const respCols = resp.columns || payload.columns || [];
      let normRows = [];
      if (Array.isArray(resp.rows) && resp.rows.length > 0 && Array.isArray(resp.rows[0])) {
        normRows = resp.rows.map(r => {
          const obj = {};
          respCols.forEach((c, i) => (obj[c.name || c] = r[i]));
          return obj;
        });
      } else {
        normRows = resp.rows || [];
      }
      const normalizedCols = respCols.map(c => (typeof c === 'string' ? { name: c, label: c } : (c.name ? { name: c.name, label: c.label || c.name } : c)));
      setColumns(normalizedCols);
      setRows(normRows);
      // jump to results view
      setStep(3);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (!rows || !columns) return null;
    const totalIndex = columns.findIndex(c => (c.name || c) === 'total');
    const count = rows.length;
    const sum = totalIndex >= 0 ? rows.reduce((acc, r) => acc + Number(r[columns[totalIndex].name] ?? 0), 0) : null;
    return { count, sum };
  }, [rows, columns]);

  const availableFields = (meta?.fields || []).map(f => (typeof f === 'string' ? { name: f, label: f, type: 'string' } : ({ name: f.name, label: f.label || f.name, type: f.type || f.field_type || 'string' })));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Relatórios</h2>
        <StepPills step={step} setStep={setStep} />
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {step === 1 && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card title="Sobre o que você quer o relatório?" className="col-span-2">
            <div className="flex flex-wrap gap-3">
              {ENTITY_LABELS.map((e) => (
                <button key={e.id} onClick={() => setEntity(e.id)} className={`px-4 py-2 rounded-md border ${entity === e.id ? 'bg-black text-white' : 'bg-white'} text-sm`}>{e.label}</button>
              ))}
            </div>
            <div className="mt-4 text-sm text-neutral-500">Entidade selecionada: <strong>{ENTITY_LABELS.find(x => x.id === entity)?.label || entity}</strong></div>
          </Card>

          <Card title="Próximo passo" className="col-span-1">
            <div className="flex flex-col gap-2">
              <Button onClick={() => setStep(2)}>Continuar</Button>
            </div>
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="col-span-1">
            <Card title="Quais informações você quer ver?">
              <div className="mt-2 max-h-56 overflow-auto">
                {availableFields.map((f) => {
                  const checked = selectedColumns.includes(f.name);
                  return (
                    <label key={f.name} className="flex items-center gap-2 py-1 text-sm">
                      <input type="checkbox" checked={checked} onChange={(e) => {
                        if (e.target.checked) setSelectedColumns((cur) => Array.from(new Set([...cur, f.name])));
                        else setSelectedColumns((cur) => cur.filter(c => c !== f.name));
                      }} />
                      <span>{f.label}</span>
                    </label>
                  );
                })}
              </div>
            </Card>

            <Card title="Filtros" className="mt-4">
              <div className="mb-2 text-xs text-neutral-500">Refine sua busca adicionando condições simples.</div>
              <FilterBuilder fields={availableFields} value={filters} onChange={setFilters} />
              <div className="mt-3">
                <div className="text-xs text-neutral-500 mb-1">Período</div>
                <DateRange from={range.from} to={range.to} onChange={(v) => setRange(v)} />
              </div>
            </Card>
          </div>

          <div className="col-span-2">
            <Card title="Visualização / Prévia">
              <div className="text-sm text-neutral-500">Selecione colunas e filtros à esquerda. Depois vá para Agrupar/Totalizar ou Gere o relatório diretamente.</div>
              <div className="mt-4">
                <ReportChart columns={columns} rows={rows} hint={chartHint} />
              </div>
              <div className="mt-4">
                <Card>
                  <ReportTable columns={columns} rows={rows} loading={loading} />
                </Card>
              </div>
            </Card>

            <div className="mt-4 flex gap-2">
              <Button onClick={() => setStep(1)} variant="ghost">Voltar</Button>
              <Button onClick={() => setStep(3)}>Próximo: Agrupar</Button>
              <div className="ml-auto">
                <Button onClick={handleRun} disabled={loading}>{loading ? 'Executando...' : 'Gerar Relatório'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card title="Como você quer agrupar e totalizar?" className="col-span-1">
              <div className="mb-3">
                <div className="text-xs text-neutral-500">Agrupar por</div>
                <Select value={groupBy} onChange={(v) => setGroupBy(v)} options={[{ id: '', label: '(nenhum)' }, ...availableFields.map(f => ({ id: f.name, label: f.label }))]} />
              </div>

              <div>
                <div className="text-xs text-neutral-500">Totalizar</div>
                <div className="flex gap-2 mt-2">
                  <Select value={aggregate.func} onChange={(v) => setAggregate((cur) => ({ ...cur, func: v }))} options={[{ id: '', label: '(nenhum)' }, { id: 'sum', label: 'Soma' }, { id: 'avg', label: 'Média' }, { id: 'count', label: 'Contagem' }]} />
                  <Select value={aggregate.field} onChange={(v) => setAggregate((cur) => ({ ...cur, field: v }))} options={[{ id: '', label: '(nenhum)' }, ...availableFields.map(f => ({ id: f.name, label: f.label }))]} />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button onClick={() => setStep(2)} variant="ghost">Voltar</Button>
                <Button onClick={handleRun} disabled={loading}>{loading ? 'Executando...' : 'Gerar Relatório'}</Button>
              </div>
            </Card>

            <div className="col-span-2">
              <Card title="Resultado">
                <div className="mb-3 text-sm text-neutral-500">Resultado do último relatório gerado.</div>
                {summary && (
                  <div className="mb-3">
                    <div className="text-xs text-neutral-500">Resultados</div>
                    <div className="text-lg font-semibold">{summary.count} linhas{summary.sum !== null ? ` · R$ ${Number(summary.sum).toFixed(2)}` : ''}</div>
                  </div>
                )}

                <div className="mt-4">
                  <ReportChart columns={columns} rows={rows} hint={chartHint} />
                </div>

                <div className="mt-4">
                  <Card>
                    <ReportTable columns={columns} rows={rows} loading={loading} />
                  </Card>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
