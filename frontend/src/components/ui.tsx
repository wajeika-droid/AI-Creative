import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function formatNumber(value: any): string {
  return Number(value ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

export function formatMoney(value: any): string {
  return `Rp ${formatNumber(value)}`;
}

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h2 className="page-title">{title}</h2>
        {subtitle && <div className="page-sub">{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}

export function Sparkline({ values, id }: { values: number[]; id: string }) {
  const data = values.map((value, index) => ({ index, value }));
  return (
    <div className="spark">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#7c5cff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="#8b6bff"
            strokeWidth={1.6}
            fill={`url(#spark-${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  values,
  id,
  foot,
  tone = 'purple',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  values?: number[];
  id: string;
  foot?: ReactNode;
  tone?: 'purple' | 'green' | 'amber' | 'blue';
}) {
  const tones: Record<string, string> = {
    purple: 'rgba(124, 92, 255, 0.12)',
    green: 'rgba(61, 220, 151, 0.12)',
    amber: 'rgba(245, 181, 68, 0.12)',
    blue: 'rgba(59, 130, 246, 0.14)',
  };
  const colors: Record<string, string> = {
    purple: '#b9a9ff',
    green: '#8ef0c4',
    amber: '#f3cd8a',
    blue: '#9cc4ff',
  };
  return (
    <div className="card stat-card">
      <div className="stat-top">
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
        </div>
        <div className="icon-chip" style={{ background: tones[tone], color: colors[tone] }}>
          <Icon size={17} />
        </div>
      </div>
      {values && <Sparkline values={values} id={id} />}
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

export function TrendChart({
  data,
  name = 'Komisi',
}: {
  data: { label: string; value: number }[];
  name?: string;
}) {
  return (
    <div style={{ height: 250, marginLeft: -14 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#7c5cff" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1a1f30" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#5f667c', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#5f667c', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : String(value))}
          />
          <Tooltip
            contentStyle={{
              background: '#121623',
              border: '1px solid #2a3150',
              borderRadius: 10,
              fontSize: 12,
            }}
            labelStyle={{ color: '#e6e9f4' }}
            itemStyle={{ color: '#b9a9ff' }}
            formatter={(value: any) => [formatNumber(value), name]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#9b7bff"
            strokeWidth={2}
            fill="url(#trend-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProgressRow({
  name,
  value,
  percent,
  alt,
}: {
  name: string;
  value: string;
  percent: number;
  alt?: boolean;
}) {
  return (
    <div className="progress-row">
      <div className="progress-top">
        <span className="name">{name}</span>
        <span className="value">{value}</span>
      </div>
      <div className="progress-track">
        <div
          className={`progress-fill${alt ? ' alt' : ''}`}
          style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="muted" style={{ textAlign: 'center', padding: '22px 8px' }}>
        {text}
      </td>
    </tr>
  );
}
