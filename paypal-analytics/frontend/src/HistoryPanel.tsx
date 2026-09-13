import { useEffect, useState } from 'react';
import axios from 'axios';
import { History, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { theme, LeaderRow } from './Theme';

interface HistoryPanelProps {
  apiBase: string;
  refreshKey: number;
}

interface HistorySummary {
  id: number;
  filename: string;
  uploaded_at: string;
  date_range_start: string;
  date_range_end: string;
  transaction_count: number;
  total_gross: number;
  total_net: number;
}

interface HistoryDetail {
  id: number;
  metrics: Record<string, number>;
  revenue_by_month: Array<{ month: string; revenue: number; growth_pct: number | null }>;
  categories_breakdown: Array<{ category: string; count: number; total: number }>;
  customers: { unique_customers: number; repeat_customers: number; retention_rate: number } | null;
}

export default function HistoryPanel({ apiBase, refreshKey }: HistoryPanelProps) {
  const [runs, setRuns] = useState<HistorySummary[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [collapsed, setCollapsed] = useState(true);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${apiBase}/history`);
      setRuns(res.data);
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    }
  };

  useEffect(() => { fetchHistory(); }, [refreshKey]);

  const toggleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    const res = await axios.get(`${apiBase}/history/${id}`);
    setDetail(res.data);
  };

  const removeRun = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await axios.delete(`${apiBase}/history/${id}`);
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
    }
    fetchHistory();
  };

  if (unavailable) return null;

  return (
    <div style={{
      background: theme.colors.card, border: `1px solid ${theme.colors.line}`, borderRadius: 6,
      marginBottom: 24, overflow: 'hidden',
    }}>
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 16, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: theme.fonts.mono, fontSize: 12.5, color: theme.colors.ink, letterSpacing: '0.03em' }}>
          <History size={15} color={theme.colors.inkMuted} />
          UPLOAD HISTORY {runs ? `(${runs.length})` : ''}
        </span>
        {collapsed ? <ChevronDown size={15} color={theme.colors.inkMuted} /> : <ChevronUp size={15} color={theme.colors.inkMuted} />}
      </button>

      {!collapsed && (
        <div style={{ borderTop: `1px solid ${theme.colors.line}` }}>
          {runs && runs.length === 0 && (
            <p style={{ padding: 16, fontSize: 13, color: theme.colors.inkMuted }}>No past uploads yet.</p>
          )}
          {runs?.map((run) => (
            <div key={run.id} style={{ borderBottom: `1px solid ${theme.colors.line}` }}>
              <div
                onClick={() => toggleExpand(run.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14,
                  cursor: 'pointer', fontSize: 13,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: theme.colors.ink }}>{run.filename}</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: theme.colors.inkMuted, fontFamily: theme.fonts.mono }}>
                    {new Date(run.uploaded_at).toLocaleString()} · {run.date_range_start} to {run.date_range_end} · {run.transaction_count} txns
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontFamily: theme.fonts.mono, fontWeight: 600, color: theme.colors.teal }}>{formatCurrency(run.total_gross)}</span>
                  <button onClick={(e) => removeRun(run.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.inkMuted, padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {expandedId === run.id && detail && (
                <div style={{ background: theme.colors.paper, padding: 16, fontSize: 13 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 12 }}>
                    <div><p style={{ margin: 0, fontSize: 10.5, color: theme.colors.inkMuted, fontFamily: theme.fonts.mono, textTransform: 'uppercase' }}>Net</p><p style={{ margin: 0, fontFamily: theme.fonts.mono, fontWeight: 600 }}>{formatCurrency(detail.metrics.total_net)}</p></div>
                    <div><p style={{ margin: 0, fontSize: 10.5, color: theme.colors.inkMuted, fontFamily: theme.fonts.mono, textTransform: 'uppercase' }}>Fees</p><p style={{ margin: 0, fontFamily: theme.fonts.mono, fontWeight: 600 }}>{formatCurrency(detail.metrics.total_fees)}</p></div>
                    <div><p style={{ margin: 0, fontSize: 10.5, color: theme.colors.inkMuted, fontFamily: theme.fonts.mono, textTransform: 'uppercase' }}>Avg Txn</p><p style={{ margin: 0, fontFamily: theme.fonts.mono, fontWeight: 600 }}>{formatCurrency(detail.metrics.avg_transaction)}</p></div>
                    {detail.customers && (
                      <div><p style={{ margin: 0, fontSize: 10.5, color: theme.colors.inkMuted, fontFamily: theme.fonts.mono, textTransform: 'uppercase' }}>Customers</p><p style={{ margin: 0, fontFamily: theme.fonts.mono, fontWeight: 600 }}>{detail.customers.unique_customers}</p></div>
                    )}
                  </div>
                  {detail.revenue_by_month.map((m, i) => (
                    <LeaderRow key={i} label={m.month} value={formatCurrency(m.revenue)} muted />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}