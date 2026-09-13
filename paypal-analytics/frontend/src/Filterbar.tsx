import { useState } from 'react';
import { theme } from './Theme';

interface FilterBarProps {
  apiBase: string;
  sessionId: string;
  filename: string;
  dateRange: { min: string; max: string };
  categories: string[];
  onApply: (filters: { start_date?: string; end_date?: string; categories?: string[] }) => void;
  isLoading: boolean;
}

export default function FilterBar({
  apiBase, sessionId, filename, dateRange, categories, onApply, isLoading
}: FilterBarProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const applyFilters = () => {
    onApply({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      categories: selectedCategories.length ? selectedCategories : undefined,
    });
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCategories([]);
    onApply({});
  };

  const reportUrl = (format: 'csv' | 'pdf') => {
    const params = new URLSearchParams({ session_id: sessionId });
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    if (selectedCategories.length) params.set('categories', selectedCategories.join(','));
    return `${apiBase}/report/${format}?${params.toString()}`;
  };

  const inputStyle: React.CSSProperties = {
    border: `1px solid ${theme.colors.line}`, borderRadius: 4, padding: '6px 8px',
    fontSize: 13, fontFamily: theme.fonts.body, background: '#fff', color: theme.colors.ink,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: theme.fonts.mono, fontSize: 10.5, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: theme.colors.inkMuted, marginBottom: 4,
  };

  const btnBase: React.CSSProperties = {
    fontFamily: theme.fonts.mono, fontSize: 12, padding: '7px 14px', borderRadius: 4,
    cursor: 'pointer', border: `1px solid ${theme.colors.line}`, background: '#fff', color: theme.colors.ink,
    textDecoration: 'none', display: 'inline-block',
  };

  return (
    <div style={{
      background: theme.colors.card, border: `1px solid ${theme.colors.line}`, borderRadius: 6,
      padding: 18, marginBottom: 24,
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16 }}>

        <div>
          <label style={labelStyle}>From</label>
          <input type="date" value={startDate} min={dateRange.min} max={dateRange.max}
            onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>To</label>
          <input type="date" value={endDate} min={dateRange.min} max={dateRange.max}
            onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <label style={labelStyle}>Categories</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {categories.map((cat) => {
              const active = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  style={{
                    fontFamily: theme.fonts.mono, fontSize: 11.5, padding: '4px 10px', borderRadius: 12,
                    border: `1px solid ${active ? theme.colors.teal : theme.colors.line}`,
                    background: active ? theme.colors.teal : '#fff',
                    color: active ? '#fff' : theme.colors.inkMuted, cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={applyFilters} disabled={isLoading} style={{
            ...btnBase, background: theme.colors.teal, color: '#fff', border: 'none',
            opacity: isLoading ? 0.6 : 1,
          }}>
            {isLoading ? 'Applying…' : 'Apply'}
          </button>
          <button onClick={resetFilters} disabled={isLoading} style={btnBase}>Reset</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <a href={reportUrl('csv')} style={btnBase}>Download CSV</a>
          <a href={reportUrl('pdf')} style={btnBase}>Download PDF</a>
        </div>
      </div>
    </div>
  );
}