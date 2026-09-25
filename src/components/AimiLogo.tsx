import React from 'react';

type AimiLogoProps = { compact?: boolean; className?: string };

export function AimiLogo({ compact = false, className = '' }: AimiLogoProps) {
  return <span className={`aimi-logo ${compact ? 'aimi-logo-compact' : ''} ${className}`} aria-label="AIMI — AI Maturity Index">
    <span className="aimi-logo-mark" aria-hidden="true"><img src="/logo-mark.png" alt="" /></span>
    <span className="aimi-logo-type">AIMI</span>
    {!compact && <span className="aimi-logo-badge">[ AI MATURITY INDEX ]</span>}
  </span>;
}
