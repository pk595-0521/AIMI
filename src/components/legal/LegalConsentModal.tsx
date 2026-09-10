import React, { useRef, useEffect, useState } from 'react';
import { api } from '../../services/api';
export function LegalConsentModal({ sessionId, policy, ready, onAccepted }: { sessionId: string; policy: { version: string; monitoring: string; zeroRetraining: string; humanReview: string }; ready: boolean; onAccepted: () => void }) {
  const [accepted,setAccepted] = useState([false,false,false]);
  const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  async function submit() {
    setBusy(true); setError('');
    try { await api('/legal/consent', { sessionId, policyVersion: policy.version, monitoringAccepted: accepted[0], zeroRetrainingAccepted: accepted[1], humanReviewAccepted: accepted[2] }); onAccepted(); }
    catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="consent-title" className="bg-white rounded-2xl border max-w-2xl w-full max-h-[90dvh] overflow-y-auto p-6 sm:p-8 space-y-5" onKeyDown={e => {
      if(e.key === 'Tab') { const items = ref.current?.querySelectorAll<HTMLElement>('input,button:not(:disabled)'); if(!items?.length) return; const first=items[0], last=items[items.length-1]; if(e.shiftKey && (document.activeElement===first || document.activeElement===ref.current)) { e.preventDefault(); last.focus(); } else if(!e.shiftKey && document.activeElement===last) { e.preventDefault(); first.focus(); } }
    }}>
      <p className="text-xs uppercase tracking-widest text-neutral-500">Assessment privacy · {policy.version}</p>
      <h1 id="consent-title" className="text-2xl font-medium">Before you begin</h1>
      <p className="text-sm text-neutral-600">Read and accept each disclosure. Your assessment timer begins after consent is saved.</p>
      {[['Assessment monitoring',policy.monitoring],['Zero model retraining',policy.zeroRetraining],['Human evaluation',policy.humanReview]].map(([title,body],i) => <label key={title} className="flex gap-3 border rounded-xl p-4 cursor-pointer">
        <input type="checkbox" className="mt-1 accent-black shrink-0" checked={accepted[i]} onChange={e => setAccepted(a => a.map((x,j) => i===j ? e.target.checked : x))}/>
        <span><strong className="block text-sm mb-1">{title}</strong><span className="text-sm text-neutral-600 leading-relaxed">{body}</span></span>
      </label>)}
      {!ready && <p role="status" className="text-sm text-amber-800">Enrollment is unavailable until your administrator verifies the enterprise data contract.</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={!ready || !accepted.every(Boolean) || busy} onClick={submit} className="rounded-full bg-black text-white px-6 py-3 disabled:opacity-40">{busy ? 'Saving consent…' : 'Accept and enter assessment'}</button>
    </div>
  </div>;
}
