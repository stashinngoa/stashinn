type TrendPoint = { date: string; [key: string]: string | number };

interface TrendChartProps {
  data: TrendPoint[];
  title: string;
  dataKey: string;
  format?: 'number' | 'currency';
  variant?: 'area' | 'bar';
}

const fmt = (v: number, format: 'number' | 'currency') =>
  format === 'currency'
    ? `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : v.toLocaleString('en-IN');

const fmtAxis = (v: number, format: 'number' | 'currency') => {
  const prefix = format === 'currency' ? '₹' : '';
  if (v >= 100000) return `${prefix}${(v / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (v >= 1000) return `${prefix}${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${prefix}${Math.round(v)}`;
};

const shortDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// Round the axis max up to a "nice" number so gridline labels read cleanly
const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
};

function Tooltip({ date, value }: { date: string; value: string }) {
  return (
    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs py-1.5 px-2.5 rounded-lg whitespace-nowrap shadow-lg">
      <div className="font-semibold opacity-70">{shortDate(date)}</div>
      <div className="font-bold tabular-nums">{value}</div>
    </div>
  );
}

export default function TrendChart({ data, title, dataKey, format = 'number', variant = 'area' }: TrendChartProps) {
  const values = (data || []).map(d => Number(d[dataKey]) || 0);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = values.length ? total / values.length : 0;
  const max = niceMax(Math.max(...values, 0));
  const gradientId = `trend-${dataKey}`;

  const header = (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Avg <span className="font-semibold text-gray-700 dark:text-gray-300">{fmt(Math.round(avg), format)}</span> / active day
        </p>
      </div>
      <div className="text-right">
        <p className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{fmt(total, format)}</p>
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Period total</p>
      </div>
    </div>
  );

  if (values.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-none">
        {header}
        <div className="h-44 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-sm border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
          No data for this period
        </div>
      </div>
    );
  }

  // Area path in a 100x100 viewBox; a single point is drawn as a flat line across the chart
  const pts = values.length === 1
    ? [[0, values[0]!], [100, values[0]!]]
    : values.map((v, i) => [(i / (values.length - 1)) * 100, v]);
  const y = (v: number) => 100 - (v / max) * 100;
  const line = pts.map(([x, v], i) => `${i ? 'L' : 'M'}${x},${y(v!)}`).join(' ');
  const area = `${line} L100,100 L0,100 Z`;
  const gridSteps = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-none">
      {header}
      <div className="flex gap-3">
        {/* Y axis labels */}
        <div className="flex flex-col justify-between h-44 text-[10px] font-medium text-gray-400 dark:text-gray-500 tabular-nums text-right w-9 shrink-0 -my-1.5">
          {gridSteps.map(s => <span key={s}>{fmtAxis(max * s, format)}</span>)}
        </div>

        <div className="relative flex-1 h-44">
          {/* Gridlines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {gridSteps.map(s => (
              <div key={s} className={`border-t ${s === 0 ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-100 dark:border-gray-800'}`} />
            ))}
          </div>

          {variant === 'area' ? (
            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area} fill={`url(#${gradientId})`} />
              <path d={line} fill="none" stroke="#f97316" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          ) : null}

          {variant === 'bar' ? (
            <div className="absolute inset-0 flex items-end gap-1">
              {data.map((item, idx) => {
                const v = values[idx]!;
                return (
                  <div key={item.date} className="flex-1 h-full flex flex-col justify-end items-center group relative">
                    <Tooltip date={item.date} value={fmt(v, format)} />
                    <div
                      className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-orange-500 to-amber-400 opacity-80 group-hover:opacity-100 transition-opacity"
                      style={{ height: `${Math.max((v / max) * 100, 1.5)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            // Hover zones centred on each data point of the area line
            data.map((item, idx) => {
              const v = values[idx]!;
              const x = data.length === 1 ? 50 : (idx / (data.length - 1)) * 100;
              const half = data.length === 1 ? 50 : 50 / (data.length - 1);
              const left = Math.max(0, x - half);
              const width = Math.min(100, x + half) - left;
              const marker = `${((x - left) / width) * 100}%`;
              return (
                <div
                  key={item.date}
                  className="absolute inset-y-0 flex justify-center group"
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  <div className="absolute inset-y-0 w-px group-hover:bg-orange-300 dark:group-hover:bg-orange-500/40 transition-colors" style={{ left: marker }} />
                  <div
                    className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white dark:bg-gray-900 border-2 border-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ top: `${100 - (v / max) * 100}%`, left: marker }}
                  />
                  <Tooltip date={item.date} value={fmt(v, format)} />
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="flex justify-between mt-3 pl-12 text-[10px] font-medium text-gray-400 dark:text-gray-500">
        <span>{shortDate(data[0]!.date)}</span>
        {data.length > 2 && <span>{shortDate(data[Math.floor(data.length / 2)]!.date)}</span>}
        <span>{shortDate(data[data.length - 1]!.date)}</span>
      </div>
    </div>
  );
}
