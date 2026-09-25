import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, X, Check } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { demoTracks } from './demo-data';

export const CALENDLY_URL = 'https://calendly.com/pk595-cornell/aimi';
export function DemoBookingModal({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef(document.activeElement as HTMLElement | null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  useEffect(() => {
    const previous = previousFocus.current;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(['full_name', 'work_email', 'company_name', 'team_size', 'track_interest'].map(k => [k, String(form.get(k) || '').trim()]));
    try {
      const response = await fetch('/api/enterprise-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save your request. Please try again.');
      setSaved(true);
      if (form.get('create_account')) {
        setAccountMessage('Sending your account sign-in link…');
        try {
          if (!supabase) throw new Error('Account access is unavailable');
          const { error: authError } = await supabase.auth.signInWithOtp({ email: payload.work_email, options: { emailRedirectTo: window.location.origin + '/screen', shouldCreateUser: true } });
          if (authError) throw authError;
          setAccountMessage('Check your work email for a secure account sign-in link. Employer access is provisioned separately during your pilot.');
        } catch { setAccountMessage('Your pilot request is saved. The account email could not be sent; you can create an account from the login page. You can still book below.'); }
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to submit your request.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="aimi-booking" aria-labelledby="booking-title" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="aimi-booking-content"><button className="aimi-modal-close" aria-label="Close booking" onClick={onClose}><X size={20} /></button><p className="aimi-eyebrow">{saved ? '02 / FIND A TIME' : '01 / LET’S MEET YOUR TEAM'}</p><h2 id="booking-title">{saved ? 'Let’s put it on the calendar.' : 'See what your talent can do.'}</h2>{saved ? <><p role="status" className="aimi-saved"><Check size={17} /> Your pilot request is saved.</p>{accountMessage && <p className="aimi-caption" role="status">{accountMessage}</p>}<p className="aimi-caption">Choose a time below to confirm your booking.</p><iframe title="Book an AIMI strategy call on Calendly" src={`${CALENDLY_URL}?embed_domain=${encodeURIComponent(window.location.hostname)}&embed_type=Inline&background_color=101012&text_color=fafafa&primary_color=777777`} className="aimi-calendly" /><a className="aimi-secondary" href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">Open Calendly in a new tab <ArrowRight size={16} /></a></> : <><p className="aimi-caption">Tell us about your team, then book an executive strategy call.</p><form onSubmit={submit}><div className="aimi-form-grid"><label>Full name<input name="full_name" autoComplete="name" required maxLength={200} /></label><label>Work email<input name="work_email" autoComplete="email" type="email" required maxLength={320} /></label><label>Company name<input name="company_name" autoComplete="organization" required maxLength={200} /></label><label>Team size<select name="team_size" required defaultValue=""><option disabled value="">Select team size</option>{['1–10', '11–50', '51–200', '201–1000', '1000+'].map(s => <option key={s}>{s}</option>)}</select></label><label className="aimi-full-field">Track interest<select name="track_interest" defaultValue="IB">{demoTracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label></div><label className="aimi-checkbox"><input type="checkbox" name="create_account" defaultChecked /> Create an AIMI account with a secure email sign-in link.</label><p className="aimi-caption">Submitting shares these details with AIMI to arrange your pilot. Scheduling is handled by Calendly.</p>{error && <p role="alert" className="aimi-error">{error}</p>}<button className="aimi-primary" disabled={busy}>{busy ? 'Saving your request…' : 'Continue to booking'} <ArrowRight size={16} /></button></form></>}</div></dialog>;
}
