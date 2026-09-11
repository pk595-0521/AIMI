import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
export function AdminAssignments({ onAssigned }: { onAssigned: () => void }) {
  const [tracks, setTracks] = useState<any[]>([]), [people, setPeople] = useState<any[]>([]);
  const [track, setTrack] = useState(''), [candidate, setCandidate] = useState(''), [grader, setGrader] = useState('');
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function refresh() { try { const [t, p] = await Promise.all([api('/catalog'), api('/admin/people')]); setTracks(t); setPeople(p); } catch (e) { setError((e as Error).message); } }
  useEffect(() => { void refresh(); }, []);
  async function assign(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { await api('/admin/assignments', { trackId: track, candidateId: candidate, ...(grader ? { graderId: grader } : {}) }); setMessage(`Assessment ${tracks.find(t => t.id === track)?.title} assigned to ${people.find(p => p.id === candidate)?.name}`); onAssigned(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function certify(id: string) { setBusy(true); setError(''); try { await api(`/admin/graders/${id}/certify`, { confirmed: true }); await refresh(); setMessage('Grader approved for human scoring.'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <section className="work-card m-4 shrink-0 max-h-[50dvh] overflow-auto"><div className="flex flex-wrap justify-between gap-4"><h2>Assign assessment</h2><button className="work-secondary" onClick={refresh}>Refresh people and tracks</button></div>
    <form onSubmit={assign} className="grid gap-3 md:grid-cols-4 mt-4">
      <label className="work-field"><span>Select Assessment</span><select required value={track} onChange={e => setTrack(e.target.value)}><option value="">Choose track</option>{tracks.map(t => <option key={t.id} value={t.id}>{t.title} · {t.companyName}</option>)}</select></label>
      <label className="work-field"><span>Candidate</span><select required value={candidate} onChange={e => setCandidate(e.target.value)}><option value="">Choose candidate</option>{people.filter(p => p.role === 'APPLICANT').map(p => <option key={p.id} value={p.id}>{p.name} · {p.email}</option>)}</select></label>
      <label className="work-field"><span>Grader</span><select value={grader} onChange={e => setGrader(e.target.value)}><option value="">Leave in available review queue</option>{people.filter(p => p.role === 'GRADER' && p.certifiedGrader).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <button disabled={busy || !candidate || !track} className="work-primary self-end justify-center">Assign Assessment</button>
    </form>
    {!!people.filter(p => p.role === 'GRADER' && !p.certifiedGrader).length && <details className="mt-4"><summary>Grader scoring authorization</summary><p className="work-muted my-3">Approve only graders whose training you have verified. Approval permits scoring assigned assessments.</p>{people.filter(p => p.role === 'GRADER' && !p.certifiedGrader).map(p => <div key={p.id} className="flex gap-3 my-2 items-center"><span>{p.name}</span><button disabled={busy} className="work-secondary" onClick={() => certify(p.id)}>Confirm training and approve {p.name}</button></div>)}</details>}
    {message && <p role="status" className="mt-4 text-green-800">{message}</p>}{error && <p role="alert" className="work-warning mt-4">{error}</p>}
  </section>;
}
export function PracticeTracks({ onAssigned }: { onAssigned: (trackId: string) => void }) {
  const [tracks, setTracks] = useState<any[]>([]), [track, setTrack] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { api('/catalog').then(setTracks).catch(e => setError(e.message)); }, []);
  async function assign() { setBusy(true); setError(''); try { const s = await api('/practice', { trackId: track }); onAssigned(s.trackId); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <section className="work-card m-6"><h2>Beta practice</h2><p className="work-muted">Choose a repository case to practice. An existing active attempt will resume.</p><div className="flex flex-wrap gap-3 mt-4"><select aria-label="Practice track" className="work-input" value={track} onChange={e => setTrack(e.target.value)}><option value="">Choose a practice track</option>{tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select><button className="work-primary" disabled={!track || busy} onClick={assign}>Self-Assign Beta Practice Track</button></div>{error && <p role="alert" className="work-warning mt-3">{error}</p>}</section>;
}
