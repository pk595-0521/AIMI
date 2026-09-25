import React from 'react';

type AimiLogoProps = { compact?: boolean; className?: string };

export function AimiLogo({ compact = false, className = '' }: AimiLogoProps) {
  const [markFailed, setMarkFailed] = React.useState(false);
  return <span className={`aimi-logo ${compact ? 'aimi-logo-compact' : ''} ${className}`} aria-label="AIMI — AI Maturity Index">
    <span className="aimi-logo-mark" aria-hidden="true" data-fallback={markFailed}>{!markFailed && <img src="/logo-mark.png" alt="" width="32" height="32" onError={() => setMarkFailed(true)} />}{<svg viewBox="0 0 32 32" role="img" aria-label="AIMI mark"><defs><linearGradient id="aimi-mark-gradient" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#7000FF" /><stop offset="1" stopColor="#00A3FF" /></linearGradient></defs><path fill="url(#aimi-mark-gradient)" d="M4 20.5 14 13v7l-10 7.5zm10-7.5L25 5v7L14 20.5z" /></svg>}</span>
    <span className="aimi-logo-type">AIMI</span>
    {!compact && <span className="aimi-logo-badge">[ AI MATURITY INDEX ]</span>}
  </span>;
}
