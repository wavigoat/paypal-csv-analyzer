import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ReactNode, CSSProperties } from 'react';
import MonthCompare from './MonthCompare';
import { theme, LeaderRow } from './Theme';

interface DashboardProps {
  apiBase: string;
  sessionId: string;
  data: {
    validation: {
      paypal_csv_detected: boolean;
      transactions_found: number;
      date_column_valid: boolean;
      amount_columns_valid: boolean;
      currencies: string[];
      duplicates_removed: number;
      date_range: { min: string; max: string };
    };
    categories_breakdown: Array<{ category: string; count: number; total: number }>;
    filters_applied?: { start_date?: string; end_date?: string; categories?: string[] };
    metrics: {
      total_gross: number;
      total_fees: number;
      total_net: number;
      total_refunds: number;
      transaction_count: number;
      avg_transaction: number;
      median_transaction: number;
      largest_transaction: number;
      fee_pct: number;
      avg_fee: number;
    };
    timeseries: Array<{ date: string; revenue: number }>;
    revenue_by_month: Array<{ month: string; revenue: number; growth_pct: number | null }>;
    revenue_by_day_of_week: Array<{ day: string; revenue: number }>;
    transactions_per_month: Array<{ month: string; count: number }>;
    trends: {
      best_month: { month: string; revenue: number } | null;
      best_day_of_week: { day: string; revenue: number } | null;
      growth_periods: Array<{ direction: string; start_month: string; end_month: string }>;
    };
    customers: {
      unique_customers: number;
      repeat_customers: number;
      avg_customer_revenue: number;
      avg_purchase_frequency: number;
      retention_rate: number;
      top_customers: Array<{ email: string; name: string; total_spent: number; purchases: number }>;
    } | null;
  } | null;
}

// --- shared style helpers -------------------------------------------------

const card: CSSProperties = {
  background: theme.colors.card,
  border: `1px solid ${theme.colors.line}`,
  borderRadius: 6,
  padding: 24,
};

const eyebrow: CSSProperties = {
  fontFamily: theme.fonts.mono,
  fontSize: 11,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: theme.colors.inkMuted,
  marginBottom: 6,
};

const sectionTitle: CSSProperties = {
  fontFamily: theme.fonts.display,
  fontSize: 20,
  fontWeight: 600,
  color: theme.colors.ink,
  margin: '0 0 18px 0',
};

const money: CSSProperties = {
  fontFamily: theme.fonts.mono,
  fontVariantNumeric: 'tabular-nums',
};

function Section({ eyebrowText, title, children }: { eyebrowText: string; title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={eyebrow}>{eyebrowText}</div>
      <h2 style={sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ ...card, borderTop: `3px solid ${accent ?? theme.colors.ink}` }}>
      <div style={{ ...eyebrow, marginBottom: 10 }}>{label}</div>
      <div style={{ ...money, fontSize: 26, color: theme.colors.ink }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: theme.colors.inkMuted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

const axisTick = { fill: theme.colors.inkMuted, fontSize: 11, fontFamily: theme.fonts.mono };
const tooltipStyle = {
  borderRadius: 4, border: `1px solid ${theme.colors.line}`, boxShadow: '0 4px 12px rgba(33,31,28,0.08)',
  fontFamily: theme.fonts.body, fontSize: 13,
};

export default function Dashboard({ data, apiBase, sessionId }: DashboardProps) {
  if (!data) return null;
  if (!data.validation) {
    return (
      <div style={{ ...card, borderColor: theme.colors.rust, color: theme.colors.rust, marginTop: 24 }}>
        Something went wrong loading this view — try clicking Reset in the filter bar, or re-upload the file.
      </div>
    );
  }

  const {
    validation, metrics, timeseries, revenue_by_month,
    revenue_by_day_of_week, transactions_per_month, categories_breakdown,
    trends, customers, filters_applied
  } = data;

  const filtersApplied = filters_applied && (
    filters_applied.start_date || filters_applied.end_date || (filters_applied.categories && filters_applied.categories.length > 0)
  ) ? filters_applied : null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const monthLabel = (m: string) => {
    if (!m || !m.includes('-')) return m ?? '';
    const [y, mo] = m.split('-');
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div>
      {/* Validation stamp */}
      <div style={{
        ...card, background: theme.colors.tealSoft, borderColor: `${theme.colors.teal}33`,
        marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 20px',
      }}>
        <p style={{ margin: 0, fontFamily: theme.fonts.mono, fontSize: 13, color: theme.colors.teal, fontWeight: 600 }}>
          ✓ PayPal CSV verified — no data errors found
        </p>
        <p style={{ margin: 0, fontSize: 12.5, color: theme.colors.ink }}>
          {validation.transactions_found.toLocaleString()} transactions found, {metrics.transaction_count.toLocaleString()} counted as revenue
          {validation.duplicates_removed > 0 && ` · ${validation.duplicates_removed} duplicate(s) removed`}
          {' '}· {validation.currencies.join(', ') || 'USD'} · {validation.date_range.min} to {validation.date_range.max}
        </p>
        {filtersApplied && (
          <p style={{ margin: 0, fontSize: 12.5, color: theme.colors.teal }}>
            Filtered — {filtersApplied.start_date ? `from ${filtersApplied.start_date} ` : ''}
            {filtersApplied.end_date ? `to ${filtersApplied.end_date} ` : ''}
            {filtersApplied.categories?.length ? `· categories: ${filtersApplied.categories.join(', ')}` : ''}
          </p>
        )}
      </div>

      <Section eyebrowText="Overview" title="Summary">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
          <MetricCard label="Gross Revenue" value={formatCurrency(metrics.total_gross)} accent={theme.colors.teal} />
          <MetricCard label="Net Revenue" value={formatCurrency(metrics.total_net)} accent={theme.colors.teal} />
          <MetricCard label="Total Fees" value={formatCurrency(metrics.total_fees)}
            sub={`${metrics.fee_pct}% of gross · avg ${formatCurrency(metrics.avg_fee)}`} accent={theme.colors.rust} />
          <MetricCard label="Transactions" value={metrics.transaction_count.toLocaleString()} accent={theme.colors.plum} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <MetricCard label="Avg / Median Txn" value={`${formatCurrency(metrics.avg_transaction)} / ${formatCurrency(metrics.median_transaction)}`} />
          <MetricCard label="Largest Transaction" value={formatCurrency(metrics.largest_transaction)} />
          <MetricCard label="Refunds Issued" value={formatCurrency(metrics.total_refunds)} accent={theme.colors.rust} />
          <MetricCard label="Best Month" value={trends.best_month ? monthLabel(trends.best_month.month) : '—'}
            sub={trends.best_month ? formatCurrency(trends.best_month.revenue) : undefined} accent={theme.colors.gold} />
        </div>
      </Section>

      <Section eyebrowText="Trend" title="Revenue Over Time">
        <div style={card}>
          <div style={{ width: '100%', height: 288 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeseries} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.line} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={axisTick} tickMargin={10} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="revenue" stroke={theme.colors.teal} strokeWidth={2.5} dot={false}
                  activeDot={{ r: 5, fill: theme.colors.teal }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      <Section eyebrowText="Breakdown" title="Monthly Activity">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <div style={card}>
            <h3 style={{ ...sectionTitle, fontSize: 15, marginBottom: 14 }}>Revenue by Month</h3>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue_by_month} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.line} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} axisLine={false} tickLine={false} tick={axisTick} />
                  <YAxis axisLine={false} tickLine={false} tick={axisTick} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                    labelFormatter={(label) => monthLabel(String(label))} contentStyle={tooltipStyle} />
                  <Bar dataKey="revenue" fill={theme.colors.teal} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {trends.growth_periods.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {trends.growth_periods.map((p, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5,
                    fontFamily: theme.fonts.mono, padding: '3px 8px', borderRadius: 3,
                    background: p.direction === 'growth' ? theme.colors.tealSoft : theme.colors.rustSoft,
                    color: p.direction === 'growth' ? theme.colors.teal : theme.colors.rust,
                  }}>
                    {p.direction === 'growth' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {monthLabel(p.start_month)}{p.start_month !== p.end_month && `–${monthLabel(p.end_month)}`} {p.direction}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={card}>
            <h3 style={{ ...sectionTitle, fontSize: 15, marginBottom: 14 }}>Transactions per Month</h3>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transactions_per_month} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.line} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} axisLine={false} tickLine={false} tick={axisTick} />
                  <YAxis axisLine={false} tickLine={false} tick={axisTick} allowDecimals={false} />
                  <Tooltip labelFormatter={(label) => monthLabel(String(label))} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={theme.colors.plum} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </Section>

      <Section eyebrowText="Tool" title="Compare Two Months">
        <MonthCompare apiBase={apiBase} sessionId={sessionId} months={revenue_by_month.map((r) => r.month)} />
      </Section>

      <Section eyebrowText="Pattern" title="Revenue by Day of Week">
        <div style={card}>
          {trends.best_day_of_week && (
            <p style={{ margin: '0 0 12px 0', fontSize: 12.5, color: theme.colors.inkMuted }}>
              Best day: <span style={{ color: theme.colors.gold, fontWeight: 600 }}>{trends.best_day_of_week.day}</span>
            </p>
          )}
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue_by_day_of_week} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.colors.line} />
                <XAxis dataKey="day" tickFormatter={(d) => d.slice(0, 3)} axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']} contentStyle={tooltipStyle} />
                <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
                  {revenue_by_day_of_week.map((entry, i) => (
                    <Cell key={i} fill={trends.best_day_of_week?.day === entry.day ? theme.colors.gold : `${theme.colors.gold}55`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      <Section eyebrowText="Ledger" title="Itemized Categories">
        <div style={card}>
          {categories_breakdown.map((c, i) => (
            <LeaderRow key={i} label={`${c.category} (${c.count})`} value={formatCurrency(c.total)} />
          ))}
        </div>
      </Section>

      {customers && (
        <Section eyebrowText="Who" title="Customers">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 16 }}>
            <MetricCard label="Unique Customers" value={String(customers.unique_customers)} accent={theme.colors.plum} />
            <MetricCard label="Repeat Customers" value={String(customers.repeat_customers)} accent={theme.colors.plum} />
            <MetricCard label="Avg Revenue / Customer" value={formatCurrency(customers.avg_customer_revenue)} accent={theme.colors.plum} />
            <MetricCard label="Retention Rate" value={`${customers.retention_rate}%`} accent={theme.colors.plum} />
          </div>
          <div style={card}>
            <h4 style={{ ...eyebrow, marginBottom: 12 }}>Top Customers</h4>
            {customers.top_customers.map((c, i) => (
              <LeaderRow key={i} label={`${c.name} (${c.purchases}×)`} value={formatCurrency(c.total_spent)} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}