import { vi } from "vitest";

export interface MockKV {
  store: Map<string, unknown>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
}

export interface MockCollection {
  store: Map<string, unknown>;
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
  getMany: ReturnType<typeof vi.fn>;
  putMany: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
}

export function makeMockKV(initial: Record<string, unknown> = {}): MockKV {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => { const had = store.has(key); store.delete(key); return had; }),
    list: vi.fn(async (prefix?: string) =>
      [...store.entries()]
        .filter(([k]) => !prefix || k.startsWith(prefix))
        .map(([key, value]) => ({ key, value }))
    ),
  };
}

export function makeMockCollection(initial: Record<string, unknown> = {}): MockCollection {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    store,
    get: vi.fn(async (id: string) => store.get(id) ?? null),
    put: vi.fn(async (id: string, data: unknown) => { store.set(id, data); }),
    delete: vi.fn(async (id: string) => { const had = store.has(id); store.delete(id); return had; }),
    exists: vi.fn(async (id: string) => store.has(id)),
    getMany: vi.fn(async (ids: string[]) => {
      const result = new Map<string, unknown>();
      for (const id of ids) { const v = store.get(id); if (v !== undefined) result.set(id, v); }
      return result;
    }),
    putMany: vi.fn(async (items: Array<{ id: string; data: unknown }>) => {
      for (const { id, data } of items) store.set(id, data);
    }),
    deleteMany: vi.fn(async (ids: string[]) => {
      let n = 0;
      for (const id of ids) { if (store.delete(id)) n++; }
      return n;
    }),
    query: vi.fn(async (_opts?: unknown) => ({
      items: [...store.entries()].map(([id, data]) => ({ id, data })),
      cursor: undefined,
      hasMore: false,
    })),
    count: vi.fn(async (_where?: unknown) => store.size),
  };
}

export function makeMockCtx(overrides: {
  kv?: Record<string, unknown>;
  deliveries?: Record<string, unknown>;
  fetchImpl?: typeof vi.fn;
} = {}) {
  const fetchMock = overrides.fetchImpl ?? vi.fn();
  return {
    kv: makeMockKV(overrides.kv ?? {}),
    storage: {
      deliveries: makeMockCollection(overrides.deliveries ?? {}),
    },
    http: { fetch: fetchMock },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    plugin: { id: "emdash-resend", version: "0.1.0" },
  };
}

export function makeRouteMockCtx(
  input: unknown,
  options: { method?: string; url?: string; kv?: Record<string, unknown>; fetchImpl?: typeof vi.fn } = {}
) {
  const ctx = makeMockCtx({ kv: options.kv, fetchImpl: options.fetchImpl });
  return {
    ...ctx,
    input,
    request: new Request(
      options.url ?? "https://example.com/_emdash/api/plugins/emdash-resend/settings",
      { method: options.method ?? "GET" }
    ),
  };
}
