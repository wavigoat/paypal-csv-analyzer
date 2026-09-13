import { useState } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { theme } from './Theme';

interface MonthCompareProps {
  apiBase: string;
  sessionId: string;
  months: string[];
}

interface CompareMetric {
  a: number;
  b: number;
  change_pct: number | null;
}

interface CompareResult {
  month_a: string;
  month_b: string;
  diff: Record<string, CompareMetric>;
}

const METRIC_LABELS: Record<string, string> = {
  total_gross: 'Gross Revenue',
  total_fees: 'Total Fees',
  total_net: 'Net Revenue',
  total_refunds: 'Refunds',
  transaction_count: 'Transactions',
  avg_transaction: 'Avg Transaction',
  median_transaction: 'Median Transaction',
  largest_transaction: 'Largest Transaction',
  fee_pct: 'Fee %',
  avg_fee: 'Avg Fee',
};

const CURRENCY_METRICS = new Set([
  'total_gross', 'total_fees', 'total_net', 'total_refunds',
  'avg_transaction', 'median_transaction', 'largest_transaction', 'avg_fee',
]);

export default function MonthCompare({ apiBase, sessionId, months }: MonthCompareProps) {
  const [monthA, setMonthA] = useState(months[0] ?? '');
  const [monthB, setMonthB] = useState(months[months.length - 1] ?? '');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthLabel = (m: string) => {
    if (!m || !m.includes('-')) return m;
    const [y, mo] = m.split('-');
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatValue = (key: string, value: number) => {
    if (CURRENCY_METRICS.has(key)) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }
    if (key === 'fee_pct') return `${value}%`;
    return value.toLocaleString();
  };

  const runCompare = async () => {
    if (!monthA || !monthB) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${apiBase}/compare`, {
        params: { session_id: sessionId, month_a: monthA, month_b: monthB },
      });
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not compare those months.');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (months.length < 2) return null;

  const selectStyle: React.CSSProperties = {
    border: `1px solid ${theme.colors.line}`, borderRadius: 4, padding: '6px 8px',
    fontSize: 13, fontFamily: theme.fonts.body, background: '#fff', color: theme.colors.ink,
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: theme.fonts.mono, fontSize: 10.5, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: theme.colors.inkMuted, marginBottom: 4,
  };

  return (
    <div style={{ background: theme.colors.card, border: `1px solid ${theme.colors.line}`, borderRadius: 6, padding: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Month A</label>
          <select value={monthA} onChange={(e) => setMonthA(e.target.value)} style={selectStyle}>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>

        <div style={{ color: theme.colors.inkMuted, paddingBottom: 6, fontFamily: theme.fonts.mono, fontSize: 12 }}>vs</div>

        <div>
          <label style={labelStyle}>Month B</label>
          <select value={monthB} onChange={(e) => setMonthB(e.target.value)} style={selectStyle}>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>

        <button
          onClick={runCompare}
          disabled={isLoading || monthA === monthB}
          style={{
            fontFamily: theme.fonts.mono, fontSize: 12, padding: '7px 16px', borderRadius: 4, border: 'none',
            background: theme.colors.teal, color: '#fff', cursor: 'pointer',
            opacity: isLoading || monthA === monthB ? 0.6 : 1,
          }}
        >
          {isLoading ? 'Comparing…' : 'Compare'}
        </button>
      </div>

      {error && (
        <div style={{
          fontSize: 13, color: theme.colors.rust, background: theme.colors.rustSoft,
          border: `1px solid ${theme.colors.rust}33`, borderRadius: 4, padding: 12, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: theme.fonts.mono, fontSize: 11, color: theme.colors.inkMuted, marginBottom: 4 }}>
            <span>{monthLabel(result.month_a)}</span>
            <span>{monthLabel(result.month_b)}</span>
          </div>
          {Object.entries(result.diff).map(([key, m]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '8px 0', borderBottom: `1px dotted ${theme.colors.line}` }}>
              <span style={{ flex: '0 0 150px', fontSize: 13, color: theme.colors.ink }}>{METRIC_LABELS[key] ?? key}</span>
              <span style={{ flex: 1, textAlign: 'right', fontFamily: theme.fonts.mono, fontSize: 13, color: theme.colors.inkMuted }}>
                {formatValue(key, m.a)}
              </span>
              <span style={{ flex: 1, textAlign: 'right', fontFamily: theme.fonts.mono, fontSize: 13, color: theme.colors.ink, fontWeight: 600 }}>
                {formatValue(key, m.b)}
              </span>
              <span style={{
                flex: '0 0 70px', textAlign: 'right', fontFamily: theme.fonts.mono, fontSize: 12,
                color: m.change_pct === null ? theme.colors.inkMuted : m.change_pct >= 0 ? theme.colors.teal : theme.colors.rust,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3,
              }}>
                {m.change_pct === null
                  ? <Minus size={11} />
                  : m.change_pct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {m.change_pct === null ? '—' : `${m.change_pct >= 0 ? '+' : ''}${m.change_pct}%`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}