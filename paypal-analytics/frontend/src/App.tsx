import { useState, useEffect } from 'react'
import axios from 'axios'
import FileUpload from './FileUpload'
import Dashboard from './Dashboard'
import FilterBar from './Filterbar'
import HistoryPanel from './HistoryPanel'
import { theme, ensureGoogleFontsLoaded } from './Theme'

// VITE_API_BASE is set at build time (.env.development / .env.production).
// Falls back to localhost for local dev if it's ever unset.
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

function App() {
  const [data, setData] = useState<any>(null)
  const [baseValidation, setBaseValidation] = useState<any>(null)
  const [meta, setMeta] = useState<{ dateRange: { min: string; max: string }; categories: string[] } | null>(null)
  const [isFiltering, setIsFiltering] = useState(false)
  const [filterError, setFilterError] = useState<string | null>(null)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  useEffect(() => {
    ensureGoogleFontsLoaded()
  }, [])

  const handleUploadSuccess = (payload: any) => {
    setData(payload)
    setBaseValidation(payload.validation)
    setMeta({
      dateRange: payload.validation.date_range,
      categories: payload.categories_breakdown.map((c: any) => c.category),
    })
    setHistoryRefreshKey((k) => k + 1)
  }

  const handleApplyFilters = async (filters: { start_date?: string; end_date?: string; categories?: string[] }) => {
    if (!data) return
    setIsFiltering(true)
    setFilterError(null)
    try {
      const response = await axios.post(`${API_BASE}/filter`, {
        session_id: data.session_id,
        ...filters,
      })
      setData({ ...response.data, session_id: data.session_id, filename: data.filename, validation: baseValidation })
    } catch (err: any) {
      setFilterError(err.response?.data?.detail || 'Could not apply that filter.')
    } finally {
      setIsFiltering(false)
    }
  }

  const reset = () => {
    setData(null)
    setBaseValidation(null)
    setMeta(null)
    setFilterError(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.paper, fontFamily: theme.fonts.body, color: theme.colors.ink }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Ledger-style masthead */}
        <header style={{
          borderBottom: `2px solid ${theme.colors.ink}`,
          paddingBottom: 18,
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <div>
            <div style={{
              fontFamily: theme.fonts.mono, fontSize: 11, letterSpacing: '0.12em',
              color: theme.colors.inkMuted, textTransform: 'uppercase', marginBottom: 4,
            }}>
              Statement of Account
            </div>
            <h1 style={{
              fontFamily: theme.fonts.display, fontSize: 32, fontWeight: 600, margin: 0,
              color: theme.colors.ink,
            }}>
              PayPal Ledger
            </h1>
          </div>
          {data && (
            <button
              onClick={reset}
              style={{
                fontFamily: theme.fonts.mono, fontSize: 12, color: theme.colors.teal,
                background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
                padding: 0,
              }}
            >
              ← upload a different file
            </button>
          )}
        </header>

        <HistoryPanel apiBase={API_BASE} refreshKey={historyRefreshKey} />

        {!data && <FileUpload apiBase={API_BASE} onUploadSuccess={handleUploadSuccess} />}

        {data && meta && (
          <>
            <FilterBar
              apiBase={API_BASE}
              sessionId={data.session_id}
              filename={data.filename}
              dateRange={meta.dateRange}
              categories={meta.categories}
              onApply={handleApplyFilters}
              isLoading={isFiltering}
            />

            {filterError && (
              <div style={{
                background: theme.colors.rustSoft, border: `1px solid ${theme.colors.rust}33`,
                color: theme.colors.rust, borderRadius: 4, padding: '10px 14px', fontSize: 13,
                marginBottom: 20,
              }}>
                {filterError}
              </div>
            )}

            <Dashboard data={data} apiBase={API_BASE} sessionId={data.session_id} />
          </>
        )}
      </div>
    </div>
  )
}

export default App