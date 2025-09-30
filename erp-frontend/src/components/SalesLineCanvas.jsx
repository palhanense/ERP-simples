import React, { useEffect, useRef, useState } from 'react';

function formatCurrency(v) {
  const num = Number(v || 0);
  return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

export default function SalesLineCanvas({ data = [], height = 140 }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    // measure the immediate wrapper once per draw cycle
    const wrapper = canvas.parentElement || container;
    const draw = () => {
      // Use the canvas' parent element (the immediate wrapper) to measure the available
      // layout width. Measuring the outer container caused the canvas to be sized larger
      // than its parent and made the drawing overflow the visible area.
      const rect = wrapper.getBoundingClientRect();
      // CSS width (in layout pixels) available for the canvas
      const cssW = Math.max(200, Math.floor(rect.width));
      const cssH = height;

      // Set the internal pixel size according to DPR, and set the CSS size to the
      // measured layout size. Use clientWidth when possible to avoid forcing a larger
      // style width that can overflow the parent.
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      // ensure deterministic transform (avoid cumulative scales)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

    if (!data || data.length === 0) {
      // draw empty state subtle line
      ctx.strokeStyle = 'rgba(107,114,128,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8, cssH / 2);
      ctx.lineTo(cssW - 8, cssH / 2);
      ctx.stroke();
      return;
    }

    // compute ranges
    const values = data.map(d => Number(d.total || 0));
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

  const padding = 10;
  const innerW = cssW - padding * 2;
  const innerH = cssH - padding * 2;

    // compute points
    const pts = data.map((d, i) => {
      const x = padding + (i / Math.max(1, data.length - 1)) * innerW;
      const norm = (Number(d.total || 0) - min) / range;
      const y = padding + (1 - norm) * innerH;
      return { x, y, raw: d };
    });

    // stroke color based on computed text color of container to follow theme
    const computedColor = getComputedStyle(container).color || '#111';
    const strokeColor = computedColor;
    const pointColor = computedColor;

    // draw area fill subtle
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.lineTo(padding + innerW, padding + innerH);
    ctx.lineTo(padding, padding + innerH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(14,165,233,0.06)';
    ctx.fill();

    // draw straight line segments (thin)
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // draw points
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = pointColor;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 0.4;
      ctx.stroke();
    });

    // attach points to canvas for hit-testing
  // store points (in CSS pixels) for hit-testing
  canvas._pts = pts;
    };

    // initial draw
    draw();

  // observe wrapper resize to redraw
  const ro = new ResizeObserver(() => draw());
  ro.observe(wrapper);

    return () => {
      ro.disconnect();
    };
  }, [data, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onMove(e) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const cx = e.clientX - canvasRect.left; // px relative to canvas
      const cy = e.clientY - canvasRect.top;
      const pts = canvas._pts || [];
      if (!pts.length) return;
      // find nearest by x in container coords
      let nearest = pts[0];
      let best = Math.abs(pts[0].x - cx);
      for (let i = 1; i < pts.length; i++) {
        const d = Math.abs(pts[i].x - cx);
        if (d < best) { best = d; nearest = pts[i]; }
      }
      // compute tooltip position relative to the outer container (containerRef)
      const leftInContainer = (canvasRect.left - containerRect.left) + nearest.x;
      const topInContainer = (canvasRect.top - containerRect.top) + nearest.y;
      // clamp tooltip inside container bounds (use conservative tooltip size)
      const tooltipW = 140;
      const tooltipH = 48;
      // center tooltip horizontally above the point
      let left = leftInContainer - tooltipW / 2;
      left = Math.max(8, Math.min(containerRect.width - 8 - tooltipW, left));
      // position tooltip so its bottom is 8px above the point
      let top = topInContainer - 8 - tooltipH;
      top = Math.max(8, Math.min(containerRect.height - 8 - tooltipH, top));
      setHover({ x: left, y: top, item: nearest.raw });
    }

    function onLeave() { setHover(null); }

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [data]);

  return (
    <div ref={containerRef} className="relative rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-white/10 dark:bg-surface-dark">
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-neutral-400">Vendas por dia</div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">Total dias: {data.length}</div>
      </div>

      <div className="mt-3">
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
      </div>

      {hover && (
        <div className="pointer-events-none absolute z-50" style={{ left: `${hover.x}px`, top: `${hover.y}px` }}>
          <div className="rounded-md bg-neutral-900/95 text-white text-xs px-2 py-1 shadow-md dark:bg-neutral-100/95 dark:text-neutral-900">
            <div className="whitespace-nowrap font-medium">{hover.item.date}</div>
            <div className="whitespace-nowrap">{formatCurrency(hover.item.total)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
