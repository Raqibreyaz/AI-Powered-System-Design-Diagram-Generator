/**
 * Type-safe fetch wrapper.
 * - Reads auth token from localStorage
 * - Returns typed response or throws ApiError
 * - Exposes get/post/patch/delete helpers
 */

const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("df_token");
}

export function setToken(token: string): void {
  localStorage.setItem("df_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("df_token");
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { isMultipart?: boolean }
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (body !== undefined && !options?.isMultipart) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body:
      options?.isMultipart
        ? (body as FormData)
        : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const error = json as { error?: string; code?: string } | null;
    throw new Error(error?.error ?? `HTTP ${response.status}`);
  }

  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  upload: <T>(path: string, formData: FormData) =>
    request<T>("POST", path, formData, { isMultipart: true }),
};
