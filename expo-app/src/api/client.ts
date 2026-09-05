import { API_BASE } from '../config';

// Token cache mirrored in memory for synchronous access.
// AuthContext keeps this in sync with AsyncStorage.
let cachedToken: string | null = null;

export function setToken(token: string | null): void {
  cachedToken = token;
}

export function getToken(): string | null {
  return cachedToken;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError('Cannot reach server. Check that the server is running and the app base URL is correct.', 0);
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const errBody = (json ?? {}) as { error?: string; code?: string };
    throw new ApiClientError(errBody.error ?? `Request failed (${res.status})`, res.status, errBody.code);
  }
  return json as T;
}

export const get = <T>(path: string, auth = true) => request<T>(path, { method: 'GET', auth });
export const post = <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: 'POST', body, auth });
export const patch = <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: 'PATCH', body, auth });