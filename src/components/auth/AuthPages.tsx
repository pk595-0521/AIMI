import React, { useEffect, useState } from 'react';
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase, supabaseAuthConfigured } from '../../services/supabase';
import { api } from '../../services/api';
import { homeForRole, type Portal } from '../../auth-roles';

function go(path: string) {
  window.location.assign(path);
}

async function goToPortal() {
  const identity = await api<{ role: string }>('/me');
  const next = new URLSearchParams(window.location.search).get('next');
  const allowed = ['/screen', '/superday', '/assessment', '/admin', '/employer', '/grader'];
  go(next && allowed.includes(next) ? next : homeForRole(identity.role));
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#FAFAFA] px-6 py-10 text-[#1A1A1A] sm:px-10">
      <div className="mx-auto max-w-md">
        <a href="/" className="font-semibold tracking-tight">AIMI Superday</a>
        <section className="work-card mt-10 bg-white p-7 sm:p-9">
          <p className="work-eyebrow">Secure account access</p>
          <h1 className="text-3xl font-medium tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#666]">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </section>
      </div>
    </main>
  );
}

function AuthUnavailable() {
  return <p role="alert" className="work-warning">Supabase Auth is not configured for this build. Set the browser-safe Supabase URL and publishable key before using account access.</p>;
}

export function SignupPage() {
  const [name, setName] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (!supabase) { setError('Supabase Auth is not configured for this build.'); return; }
    setBusy(true);
    try {
      await api('/auth/signup', { name: name.trim(), email: email.trim(), password, access_key: accessKey });
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      await goToPortal();
    } catch (e) { setError((e as Error).message || 'Unable to create the account.'); }
    finally { setBusy(false); }
  }
  return <AuthShell title="Create your account" subtitle="Use your name, email, and password to start a candidate workspace or access an assigned portal.">
    {!supabaseAuthConfigured && <AuthUnavailable />}
    <form onSubmit={submit} className="work-stack" aria-label="Sign up">
      <label className="work-field"><span>Full Name</span><input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Jordan Lee" /></label>
      <label className="work-field"><span>Email Address</span><input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
      <label className="work-field"><span>Password</span><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
      <label className="work-field"><span>Access Key / Invite Code (Optional)</span><input name="access_key" type="password" autoComplete="off" maxLength={256} value={accessKey} onChange={e => setAccessKey(e.target.value)} aria-describedby="access-key-help" /><small id="access-key-help">Leave blank for Candidate access, or enter your Grader/Employer key.</small></label>
      {error && <p role="alert" className="work-warning">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <button className="work-primary w-full justify-center" disabled={busy || !supabase}>{busy ? 'Creating account…' : 'Create account'} <ArrowRight className="h-4 w-4" /></button>
    </form>
    <p className="mt-6 text-center text-sm text-[#666]">Already have an account? <a className="font-medium text-black underline" href="/auth/login">Sign In</a></p>
  </AuthShell>;
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (!supabase) { setError('Supabase Auth is not configured for this build.'); return; }
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      await goToPortal();
    } catch (e) { setError((e as Error).message || 'Unable to sign in.'); }
    finally { setBusy(false); }
  }
  return <AuthShell title="Welcome back" subtitle="Sign in to continue to your candidate workspace, grader portal, or employer report.">
    {!supabaseAuthConfigured && <AuthUnavailable />}
    <form onSubmit={submit} className="work-stack" aria-label="Sign in">
      <label className="work-field"><span>Email Address</span><input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
      <label className="work-field"><span>Password</span><input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" /></label>
      {error && <p role="alert" className="work-warning">{error}</p>}
      <button className="work-primary w-full justify-center" disabled={busy || !supabase}>{busy ? 'Signing in…' : 'Sign In'} <ArrowRight className="h-4 w-4" /></button>
    </form>
    <p className="mt-6 text-center text-sm text-[#666]">Need an account? <a className="font-medium text-black underline" href="/auth/signup">Get Started / Sign Up</a></p>
  </AuthShell>;
}

export function AuthRequired({ next }: { next: string }) {
  useEffect(() => { window.location.replace(`/auth/login?next=${encodeURIComponent(next)}`); }, [next]);
  return <AuthShell title="Sign in to continue" subtitle="This portal is protected by your AIMI account. Your session will persist as you move between assessment pages.">
    <div className="flex flex-wrap gap-3"><a href={`/auth/login?next=${encodeURIComponent(next)}`} className="work-primary">Sign In <ArrowRight className="h-4 w-4" /></a><a href={`/auth/signup?next=${encodeURIComponent(next)}`} className="work-secondary">Get Started / Sign Up</a></div>
  </AuthShell>;
}

export function AccessDenied({ portal }: { portal: Portal }) {
  return <main className="min-h-dvh bg-[#FAFAFA] p-6 text-[#1A1A1A] sm:p-10"><div className="mx-auto max-w-xl work-card bg-white"><p className="work-eyebrow">Protected portal</p><h1 className="text-2xl font-medium">{portal === 'assessment' ? 'Candidate access required' : portal === 'grader' ? 'Grader access required' : 'Employer / Admin access required'}</h1><p className="mt-3 text-sm leading-6 text-[#666]">Your account is signed in, but it has not been assigned this portal role. Ask an AIMI administrator to update your role, then sign in again.</p><a href="/" className="work-secondary mt-6">Return home</a></div></main>;
}
