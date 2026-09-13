import { useState } from 'react';
import axios from 'axios';
import { UploadCloud, Loader2 } from 'lucide-react';
import { theme } from './Theme';

interface FileUploadProps {
  apiBase: string;
  onUploadSuccess: (data: any) => void;
}

export default function FileUpload({ apiBase, onUploadSuccess }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(`${apiBase}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploadSuccess(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred while communicating with the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 420, margin: '0 auto', padding: 32, background: theme.colors.card,
      border: `1px solid ${theme.colors.line}`, borderRadius: 6,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
        <div>
          <div style={{
            fontFamily: theme.fonts.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: theme.colors.inkMuted, marginBottom: 6,
          }}>
            New Entry
          </div>
          <h2 style={{ fontFamily: theme.fonts.display, fontSize: 20, fontWeight: 600, margin: 0, color: theme.colors.ink }}>
            Upload PayPal Export
          </h2>
          <p style={{ fontSize: 13, color: theme.colors.inkMuted, marginTop: 6 }}>Select your PayPal CSV to itemize it.</p>
        </div>

        <label style={{
          width: '100%', border: `1px dashed ${theme.colors.line}`, borderRadius: 4, padding: '20px 12px',
          cursor: 'pointer', fontSize: 13, color: theme.colors.inkMuted,
        }}>
          {file ? file.name : 'Click to choose a .csv file'}
          <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>

        {error && (
          <div style={{
            width: '100%', fontSize: 13, color: theme.colors.rust, background: theme.colors.rustSoft,
            border: `1px solid ${theme.colors.rust}33`, borderRadius: 4, padding: 12,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || isLoading}
          style={{
            width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
            padding: '11px 16px', borderRadius: 4, border: 'none', cursor: !file || isLoading ? 'not-allowed' : 'pointer',
            fontFamily: theme.fonts.mono, fontSize: 13, letterSpacing: '0.02em', color: '#fff',
            background: !file || isLoading ? `${theme.colors.teal}66` : theme.colors.teal,
          }}
        >
          <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
          {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <UploadCloud size={16} />}
          {isLoading ? 'Processing…' : 'Analyze'}
        </button>
      </div>
    </div>
  );
}