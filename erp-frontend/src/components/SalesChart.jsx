import React, { useMemo } from 'react';

function formatCurrency(v) {
  const num = Number(v || 0);
  return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

function buildSmoothPath(pts, h) {
  // pts: [{x,y}], return path string using quadratic smoothing
  if (!pts || pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;

  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const midX = (prev.x + cur.x) / 2;
    const midY = (prev.y + cur.y) / 2;
    d += ` Q ${prev.x},${prev.y} ${midX},${midY}`;
  }
  // Line to last point
  const last = pts[pts.length - 1];
  d += ` T ${last.x},${last.y}`;
  return d;
}

export default function SalesChart({ data = [], height = 140 }) {
  const chart = useMemo(() => {
    if (!data || data.length === 0) return null;
    const values = data.map(d => Number(d.total || 0));
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    const w = 100;
    const h = 56; // inner chart height
    const step = w / Math.max(1, data.length - 1);
    const pts = data.map((d, i) => {
      const x = +(i * step).toFixed(2);
      const norm = (Number(d.total || 0) - min) / range;
      const y = +((1 - norm) * h).toFixed(2);
      return { x, y, raw: d };
    });

    const path = buildSmoothPath(pts, h);
    // area path: start at first, draw smooth path then line to bottom-right, bottom-left and close
    const areaPath = `${path} L ${w},${h} L 0,${h} Z`;
    return { pts, path, areaPath, max, min };
  }, [data]);

  if (!chart) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-500 dark:border-white/10 dark:bg-surface-dark dark:text-neutral-400">
        Sem vendas no período selecionado
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-surface-dark">
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-400">Vendas por dia</div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">Total dias: {data.length}</div>
      </div>

      <div className="mt-3">
        <svg viewBox={`0 0 100 80`} preserveAspectRatio="none" className="w-full" style={{ height }}>
          <g transform="translate(0,8)">
            <path d={chart.areaPath} fill="currentColor" fillOpacity="0.06" className="text-neutral-900 dark:text-neutral-100" />
            <path d={chart.path} fill="none" stroke="currentColor" strokeWidth="0.9" className="text-neutral-800 dark:text-neutral-200" strokeLinecap="round" strokeLinejoin="round" />
            {chart.pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={1.2} fill="currentColor" className="text-neutral-800 dark:text-neutral-200" />
            ))}
          </g>

          <g transform="translate(0,72)">
            {data.map((d, i) => {
              const x = (i * (100 / Math.max(1, data.length - 1)));
              return (
                <text key={i} x={x} y={6} fontSize="3.6" textAnchor="middle" className="fill-neutral-400 dark:fill-neutral-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {d.date.slice(5)}
                </text>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
