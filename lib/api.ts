export function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string; code?: string; status: number }> {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  }).then(async (res) => {
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        status: res.status,
        error: body?.message ?? body?.error ?? "Something went wrong",
        code: body?.code,
      };
    }
    return { status: res.status, data: body as T };
  });
}