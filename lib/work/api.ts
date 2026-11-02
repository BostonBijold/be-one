// Fetch wrapper for /api/work. Throws with the server's { error } message so
// callers can show it as is.
export async function workApi<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`/api/work${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Something went wrong. Try again.");
  return data as T;
}
