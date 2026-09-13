import type { ReactNode } from 'react';

// Shared design tokens for the whole app. Colors are applied via inline
// style (not Tailwind arbitrary-value classes) so they render reliably
// regardless of how Tailwind's content scanning is configured in this
// project — we already hit one silent-failure case with height utilities.
export const theme = {
  colors: {
    paper: '#EEF0EC',      // page background — cool ledger paper (avoiding the warm-cream-serif default)
    card: '#FFFFFF',
    ink: '#211F1C',        // primary text
    inkMuted: '#726C61',   // secondary text / labels
    line: '#E3DFD3',       // hairline dividers
    teal: '#0B6E5A',       // revenue / positive accent
    tealSoft: '#E3F0EB',
    rust: '#9C4A34',       // fees / refunds / negative accent
    rustSoft: '#F3E7E1',
    gold: '#A8791A',       // "best of" highlight accent
    goldSoft: '#F5EDDA',
    plum: '#5B4A6F',       // customers accent
    plumSoft: '#ECE7F1',
  },
  fonts: {
    display: "'Fraunces', Georgia, serif",
    mono: "'IBM Plex Mono', 'Courier New', monospace",
    body: "'Inter', -apple-system, sans-serif",
  },
};

export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap';

let fontsInjected = false;

export function ensureGoogleFontsLoaded() {
  if (fontsInjected || typeof document === 'undefined') return;
  fontsInjected = true;
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = GOOGLE_FONTS_URL;
  document.head.append(preconnect1, preconnect2, stylesheet);
}

// A small dotted "leader" row, like a printed receipt or menu:
// Label ..................... Value
export function LeaderRow({
  label, value, muted = false,
}: { label: ReactNode; value: ReactNode; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 0' }}>
      <span style={{ color: muted ? theme.colors.inkMuted : theme.colors.ink, fontSize: 14, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{
        flex: 1, borderBottom: `1px dotted ${theme.colors.line}`, transform: 'translateY(-3px)',
      }} />
      <span style={{
        fontFamily: theme.fonts.mono, fontSize: 14, fontVariantNumeric: 'tabular-nums',
        color: theme.colors.ink, whiteSpace: 'nowrap',
      }}>
        {value}
      </span>
    </div>
  );
}