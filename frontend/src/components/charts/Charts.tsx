import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { formatCompactINR, formatINR } from '../../lib/format';
import { useChartTheme } from './chartTheme';

/**
 * Recharts visualisations (optional F9 / A3). This module is lazy-loaded (see
 * LazyCharts.tsx) so Recharts never delays or blocks the required numeric summaries.
 */

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  const t = useChartTheme();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-control px-3 py-2 text-body-sm shadow-float" style={{ background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, color: t.text }}>
      {label !== undefined && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((p) => (
        <p key={String(p.dataKey ?? p.name)} className="tnum flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? p.payload?.fill }} />
          <span style={{ color: t.muted }}>{p.name}:</span>
          <span className="font-semibold">{formatINR(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

export interface TrendPoint {
  label: string;
  total: number;
}

/** 6-month spend trend (dashboard). */
export function TrendChart({ data }: { data: TrendPoint[] }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={t.primary} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={t.grid} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: t.axis, fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: t.axis, fontSize: 12 }} tickFormatter={formatCompactINR} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: t.axis, strokeDasharray: '3 3' }} />
        <Area type="monotone" dataKey="total" name="Spent" stroke={t.primary} strokeWidth={2.5} fill="url(#trendFill)" dot={{ r: 3, fill: t.primary }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

/** Spend-by-category donut with the total in the centre (dashboard / budgets). */
export function CategoryDonut({ data, centerLabel, centerValue }: { data: DonutSlice[]; centerLabel: string; centerValue: string }) {
  const t = useChartTheme();
  const slices = data.filter((d) => d.value > 0);
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices.length ? slices : [{ name: 'Empty', value: 1, color: t.grid }]}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="92%"
            paddingAngle={slices.length > 1 ? 2 : 0}
            stroke="none"
            isAnimationActive
          >
            {(slices.length ? slices : [{ color: t.grid }]).map((s, i) => (
              <Cell key={i} fill={s.color} />
            ))}
          </Pie>
          {slices.length > 0 && <Tooltip content={<ChartTooltip />} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-body-sm text-muted">{centerLabel}</span>
        <span className="tnum font-heading text-headline-md font-bold text-ink">{centerValue}</span>
      </div>
    </div>
  );
}

/** Per-day spend bars for a month (reports). */
export function DailyBarChart({ data }: { data: { label: string; total: number }[] }) {
  const t = useChartTheme();
  const max = Math.max(...data.map((d) => d.total), 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={t.grid} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} tick={{ fill: t.axis, fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: t.axis, fontSize: 12 }} tickFormatter={formatCompactINR} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: t.grid, opacity: 0.5 }} />
        <Bar dataKey="total" name="Spent" radius={[4, 4, 0, 0]} maxBarSize={22}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.total === max && max > 0 ? t.primary : `${t.primary}99`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Budget vs actual per month for a year (reports). */
export function BudgetVsActualChart({ data }: { data: { label: string; total: number; budget: number }[] }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }} barGap={4}>
        <CartesianGrid vertical={false} stroke={t.grid} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: t.axis, fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: t.axis, fontSize: 12 }} tickFormatter={formatCompactINR} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: t.grid, opacity: 0.5 }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: t.axis }} />
        <Bar dataKey="budget" name="Budget" fill={t.budget} radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Bar dataKey="total" name="Actual" radius={[4, 4, 0, 0]} maxBarSize={24}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.budget > 0 && d.total > d.budget ? t.danger : t.primary} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
