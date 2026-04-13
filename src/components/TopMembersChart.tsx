import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { WEEKLY_DATA } from '../data/mockData';
import { formatMoney } from '../utils/format';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded text-sm"
        style={{
          background: '#1a1a28',
          border: '1px solid #2a2a3e',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}
      >
        <p className="font-display font-semibold text-ink-primary mb-1">{label}</p>
        <p className="font-mono" style={{ color: '#d4af37' }}>
          {formatMoney(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const formatYAxis = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
};

export default function TopMembersChart() {
  return (
    <div className="gang-card p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-bold text-sm tracking-widest uppercase text-ink-primary">
          Top 5 Rentabilité
        </h3>
        <span className="text-xs text-ink-secondary font-mono bg-bg-elevated px-2 py-1 rounded border border-ink-border">
          Cette semaine
        </span>
      </div>

      {WEEKLY_DATA.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center">
          <p className="text-xs text-ink-secondary">Aucune donnée hebdomadaire.</p>
        </div>
      ) : (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={WEEKLY_DATA}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          barCategoryGap="25%"
        >
          <CartesianGrid
            horizontal={false}
            stroke="rgba(30,30,46,0.8)"
            strokeDasharray="3 3"
          />
          <XAxis
            type="number"
            tickFormatter={formatYAxis}
            tick={{ fill: '#5a5a7a', fontSize: 11, fontFamily: 'Share Tech Mono' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={68}
            tick={{ fill: '#8a8aaa', fontSize: 12, fontFamily: 'DM Sans', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(196,30,58,0.05)' }} />
          <Bar dataKey="amount" radius={[0, 3, 3, 0]} maxBarSize={20}>
            {WEEKLY_DATA.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? '#d4af37' : index === 1 ? '#c41e3a' : '#8b1528'}
                fillOpacity={index === 0 ? 1 : index === 1 ? 0.9 : 0.6 + (index * 0.05)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
