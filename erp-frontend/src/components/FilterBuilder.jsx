import { useState } from 'react';
import Select from './ui/Select';
import Button from './ui/Button';

const DEFAULT_OPS = [
  { id: 'eq', label: 'é igual a' },
  { id: 'neq', label: 'diferente' },
  { id: 'gt', label: 'é maior que' },
  { id: 'lt', label: 'é menor que' },
  { id: 'gte', label: 'é maior ou igual' },
  { id: 'lte', label: 'é menor ou igual' },
  { id: 'between', label: 'entre' },
  { id: 'contains', label: 'contém' },
];

export default function FilterBuilder({ fields = [], value = [], onChange = () => {} }) {
  const [internal, setInternal] = useState(value || []);

  const update = (next) => {
    setInternal(next);
    onChange(next);
  };

  const addFilter = () => {
    const candidate = fields[0]?.name || '';
    update([...internal, { id: Date.now(), field: candidate, op: 'eq', value: '' }]);
  };

  const removeFilter = (id) => {
    update(internal.filter(f => f.id !== id));
  };

  const setField = (id, patch) => {
    update(internal.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  return (
    <div>
      {internal.map((f) => (
        <div key={f.id} className="flex items-center gap-2 mb-2">
          <Select value={f.field} onChange={(v) => setField(f.id, { field: v })} options={fields.map(x => ({ id: x.name, label: x.label }))} />
          <Select value={f.op} onChange={(v) => setField(f.id, { op: v })} options={DEFAULT_OPS.map(o => ({ id: o.id, label: o.label }))} />
          {f.op === 'between' ? (
            <input value={f.value?.[0] ?? ''} onChange={(e) => setField(f.id, { value: [e.target.value, f.value?.[1] ?? ''] })} placeholder="início" className="rounded-md border px-2 py-1 text-sm" />
          ) : (
            <input value={f.value ?? ''} onChange={(e) => setField(f.id, { value: e.target.value })} placeholder="valor" className="rounded-md border px-2 py-1 text-sm" />
          )}
          <Button variant="ghost" onClick={() => removeFilter(f.id)}>Remover</Button>
        </div>
      ))}

      <div className="mt-2">
        <Button onClick={addFilter}>Adicionar Filtro</Button>
      </div>
    </div>
  );
}
