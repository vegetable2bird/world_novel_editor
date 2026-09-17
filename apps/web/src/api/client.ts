const BASE = import.meta.env.VITE_API_BASE || '/api';

function token(): string | null {
  return typeof localStorage !== 'undefined' ? localStorage.getItem('wx-token') : null;
}

export interface ApiError {
  status: number;
  message: string;
}

export async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  const t = token();
  if (t) headers.set('Authorization', `Bearer ${t}`);
  if (opts.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.message || body?.error || message;
    } catch {
      /* ignore */
    }
    const err: ApiError = { status: res.status, message };
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(p: string) => apiFetch<T>(p),
  post: <T>(p: string, body?: unknown) =>
    apiFetch<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(p: string, body?: unknown) =>
    apiFetch<T>(p, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(p: string) => apiFetch<T>(p, { method: 'DELETE' }),
};
