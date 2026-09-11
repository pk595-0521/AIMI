import { getSupabaseSession } from './supabase';

export async function authHeaders(contentType?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = contentType ? { 'Content-Type': contentType } : {};
  const session = await getSupabaseSession();
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

export async function api<T = any>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/api' + path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: await authHeaders(body === undefined ? undefined : 'application/json'), body: body === undefined ? undefined : JSON.stringify(body), signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export class AssessmentClient {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(public session: any) {}
  command(payload: object) {
    const task = this.queue.then(async () => {
      const result = await api('/assessment/sync', { ...payload, sessionId: this.session.id, revision: this.session.revision });
      this.session = result; return result;
    });
    this.queue = task.catch(() => undefined); return task;
  }
}
