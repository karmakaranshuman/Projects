import type { DataChart } from './types';

const W = 220;
const H = 112;
const PAD = { top: 8, right: 6, bottom: 16, left: 26 };

/** Small line chart with a filled area, y gridlines, and an optional dashed target line. */
export function DataChartView({ chart }: { chart: DataChart }) {
  const { points, target, unit } = chart;
  const max = Math.max(target?.value ?? 0, ...points.map((p) => p.value));
  const top = Math.ceil(max / 250) * 250 || 1;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length > 1 ? (i / (points.length - 1)) * plotW : plotW / 2);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`;
  const grid = [0, top / 2, top];

  return (
    <figure className="cb-chart">
      <figcaption className="cb-chart__title">
        {chart.title} <span>({unit})</span>
      </figcaption>
      <svg className="cb-chart__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${chart.title} in ${unit}`}>
        {grid.map((v) => (
          <g key={v}>
            <line className="cb-chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="cb-chart__axis" x={PAD.left - 4} y={y(v) + 3} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        <path className="cb-chart__area" d={area} />
        <path className="cb-chart__line" d={line} />
        {target && (
          <g>
            <line className="cb-chart__target" x1={PAD.left} x2={W - PAD.right} y1={y(target.value)} y2={y(target.value)} />
            <text className="cb-chart__target-label" x={W - PAD.right} y={y(target.value) - 3} textAnchor="end">
              {target.label}
            </text>
          </g>
        )}
        {points.map((p, i) => (
          <circle key={p.label} className="cb-chart__dot" cx={x(i)} cy={y(p.value)} r={1.6} />
        ))}
        {points.map((p, i) =>
          p.tick ? (
            <text key={p.label} className="cb-chart__axis" x={x(i)} y={H - 4} textAnchor="middle">
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
    </figure>
  );
}
