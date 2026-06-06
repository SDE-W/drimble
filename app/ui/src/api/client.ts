/// <reference types="vite/client" />
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiRequestError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiRequestError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      message = body.error ?? body.message ?? message;
    } catch {
      // ignore json parse failure
    }
    throw new ApiRequestError(message, res.status);
  }
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export const client = {
  get<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>(path, { method: "GET", ...options });
  },

  post<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    });
  },

  patch<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      ...options,
    });
  },

  delete<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>(path, { method: "DELETE", ...options });
  },
};

export { BASE_URL };
