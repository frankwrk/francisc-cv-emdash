import { apiFetch as baseFetch, parseApiResponse } from "emdash/plugin-utils";

const API = "/_emdash/api/plugins/emdash-resend";

export const api = {
  async get<T = unknown>(route: string): Promise<T> {
    const res = await baseFetch(`${API}/${route}`, { method: "GET" });
    return parseApiResponse<T>(res);
  },
  async post<T = unknown>(route: string, body: unknown = {}): Promise<T> {
    const res = await baseFetch(`${API}/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseApiResponse<T>(res);
  },
};
