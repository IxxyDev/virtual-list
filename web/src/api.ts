export type Page = { items: number[]; nextCursor: number | null };

export type Health = { selected: number; custom: number; pending: number };

export class ApiError extends Error {
  readonly status: number;
  readonly result: string | undefined;

  constructor(status: number, body: { error?: string; result?: string }) {
    super(body.error ?? body.result ?? `HTTP ${status}`);
    this.status = status;
    this.result = body.result;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json);
  return json as T;
}

function pageQuery(q: string, cursor: number | null): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (cursor !== null) params.set('cursor', String(cursor));
  const s = params.toString();
  return s ? `?${s}` : '';
}

export const api = {
  items: (q: string, cursor: number | null) => request<Page>('GET', `/api/items${pageQuery(q, cursor)}`),
  selected: (q: string, cursor: number | null) => request<Page>('GET', `/api/selected${pageQuery(q, cursor)}`),
  addItem: (id: number) => request<{ result: string }>('POST', '/api/items', { id }),
  select: (id: number) => request<{ result: string }>('POST', '/api/selected', { id }),
  deselect: (id: number) => request<{ result: string }>('DELETE', `/api/selected/${id}`),
  move: (id: number, beforeId: number | null) => request<{ result: string }>('PATCH', `/api/selected/${id}`, { beforeId }),
  health: () => request<Health>('GET', '/api/health'),
};
