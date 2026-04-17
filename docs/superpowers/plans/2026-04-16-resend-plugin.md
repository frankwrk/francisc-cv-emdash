# Resend Email Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@frankwrk/emdash-resend`, a native EmDash plugin that wires Resend as the exclusive email transport with a full admin suite (delivery log, contacts/audiences, broadcasts).

**Architecture:** Native npm package (not marketplace sandboxed) so it can have React admin pages. Descriptor factory in `src/descriptor.ts`, plugin runtime in `src/index.ts`, React admin in `src/admin.tsx`. All route/hook handler functions are exported from their files for unit testability; `definePlugin()` in index.ts wires them together.

**Tech Stack:** TypeScript, Vitest, tsdown (build), React 18, `@emdash-cms/admin` (pre-built UI components), Web Crypto API (Svix HMAC verification), Resend REST API.

---

## File Map

| File | Role |
|------|------|
| `packages/emdash-resend/src/descriptor.ts` | `resendPlugin()` factory → `PluginDescriptor` |
| `packages/emdash-resend/src/index.ts` | `definePlugin()` default export; re-exports all handlers |
| `packages/emdash-resend/src/lib/resend.ts` | `ResendClient` — typed thin fetch wrapper |
| `packages/emdash-resend/src/lib/webhook-verify.ts` | `verifySvixSignature()` — HMAC-SHA256 |
| `packages/emdash-resend/src/handlers/deliver.ts` | `handleEmailDeliver` hook |
| `packages/emdash-resend/src/handlers/lifecycle.ts` | install / activate / deactivate hooks |
| `packages/emdash-resend/src/handlers/settings.ts` | 5 settings routes |
| `packages/emdash-resend/src/handlers/deliveries.ts` | deliveries + stats routes |
| `packages/emdash-resend/src/handlers/audiences.ts` | audiences + contacts routes |
| `packages/emdash-resend/src/handlers/broadcasts.ts` | broadcasts routes |
| `packages/emdash-resend/src/handlers/webhook.ts` | webhook receiver route |
| `packages/emdash-resend/src/admin.tsx` | exports `{ pages, widgets }` |
| `packages/emdash-resend/src/components/SettingsPage.tsx` | React settings page |
| `packages/emdash-resend/src/components/DeliveryLogPage.tsx` | React delivery log page |
| `packages/emdash-resend/src/components/ContactsPage.tsx` | React contacts page |
| `packages/emdash-resend/src/components/BroadcastsPage.tsx` | React broadcasts page |
| `packages/emdash-resend/tests/helpers.ts` | `makeMockCtx`, `makeRouteMockCtx` |
| `packages/emdash-resend/tests/lib/resend.test.ts` | ResendClient unit tests |
| `packages/emdash-resend/tests/lib/webhook-verify.test.ts` | Svix verification tests |
| `packages/emdash-resend/tests/deliver.test.ts` | email:deliver hook tests |
| `packages/emdash-resend/tests/lifecycle.test.ts` | lifecycle hook tests |
| `packages/emdash-resend/tests/settings-routes.test.ts` | settings route tests |
| `packages/emdash-resend/tests/deliveries-routes.test.ts` | delivery route tests |
| `packages/emdash-resend/tests/audiences-routes.test.ts` | audience/contact route tests |
| `packages/emdash-resend/tests/broadcasts-routes.test.ts` | broadcast route tests |
| `packages/emdash-resend/tests/webhook-route.test.ts` | webhook receiver tests |
| `packages/emdash-resend/package.json` | Package manifest with workspace export map |
| `packages/emdash-resend/tsconfig.json` | TypeScript config |
| `packages/emdash-resend/tsdown.config.ts` | Build config (tsdown) |
| `packages/emdash-resend/vitest.config.ts` | Vitest config |

---

## Task 1: Package Scaffolding

**Files:**
- Create: `packages/emdash-resend/package.json`
- Create: `packages/emdash-resend/tsconfig.json`
- Create: `packages/emdash-resend/tsdown.config.ts`
- Create: `packages/emdash-resend/vitest.config.ts`
- Modify: root `package.json` (add workspace dep)
- Modify: `pnpm-workspace.yaml` (add `packages/*` if not present)

- [ ] **Step 1: Create the package directory**

```bash
mkdir -p packages/emdash-resend/src/lib packages/emdash-resend/src/handlers packages/emdash-resend/src/components packages/emdash-resend/tests/lib
```

- [ ] **Step 2: Write `packages/emdash-resend/package.json`**

```json
{
  "name": "@frankwrk/emdash-resend",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/descriptor.js",
  "exports": {
    ".": "./dist/descriptor.js",
    "./plugin": "./dist/index.js",
    "./admin": "./dist/admin.js"
  },
  "scripts": {
    "build": "tsdown",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "@emdash-cms/admin": "^0.1.0",
    "emdash": "^0.1.0",
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "tsdown": "^0.12.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Write `packages/emdash-resend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "jsx": "react-jsx",
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 4: Write `packages/emdash-resend/tsdown.config.ts`**

```typescript
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    descriptor: "src/descriptor.ts",
    index: "src/index.ts",
    admin: "src/admin.tsx",
  },
  format: "esm",
  dts: true,
  external: ["react", "react-dom", "emdash", "@emdash-cms/admin"],
  outDir: "dist",
});
```

- [ ] **Step 5: Write `packages/emdash-resend/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
  },
});
```

- [ ] **Step 6: Add workspace entry to root `package.json`**

In the root `package.json`, add to `"dependencies"` (or `"devDependencies"`):
```json
"@frankwrk/emdash-resend": "file:./packages/emdash-resend"
```

- [ ] **Step 7: Ensure `pnpm-workspace.yaml` includes packages/**

Open `pnpm-workspace.yaml`. If `packages/*` is not already listed under `packages:`, add it:
```yaml
packages:
  - "."
  - "packages/*"
```

- [ ] **Step 8: Install dependencies**

```bash
pnpm install
```

Expected: pnpm resolves the workspace link and installs dev deps for the new package.

- [ ] **Step 9: Commit**

```bash
git add packages/emdash-resend/package.json packages/emdash-resend/tsconfig.json packages/emdash-resend/tsdown.config.ts packages/emdash-resend/vitest.config.ts pnpm-workspace.yaml package.json pnpm-lock.yaml
git commit -m "feat: scaffold @frankwrk/emdash-resend package"
```

---

## Task 2: Test Helpers

**Files:**
- Create: `packages/emdash-resend/tests/helpers.ts`

- [ ] **Step 1: Write `tests/helpers.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/emdash-resend/tests/helpers.ts
git commit -m "test: add mock context helpers for emdash-resend"
```

---

## Task 3: ResendClient

**Files:**
- Create: `packages/emdash-resend/src/lib/resend.ts`
- Create: `packages/emdash-resend/tests/lib/resend.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/resend.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResendClient } from "../../src/lib/resend.js";

function makeFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

describe("ResendClient.sendEmail", () => {
  it("POSTs to /emails and returns id", async () => {
    const fetchMock = makeFetch(200, { id: "email_abc123" });
    const client = new ResendClient("re_test_key", fetchMock);

    const result = await client.sendEmail({
      from: "test@example.com",
      to: "user@example.com",
      subject: "Hello",
      text: "World",
    });

    expect(result).toEqual({ id: "email_abc123" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_test_key" }),
      })
    );
  });

  it("throws with Resend error message on 4xx", async () => {
    const fetchMock = makeFetch(422, { message: "Invalid from address" });
    const client = new ResendClient("re_test_key", fetchMock);

    await expect(
      client.sendEmail({ from: "bad", to: "user@example.com", subject: "Hi", text: "." })
    ).rejects.toThrow("Invalid from address");
  });
});

describe("ResendClient.registerWebhook", () => {
  it("POSTs to /webhooks and returns id + signing_secret", async () => {
    const fetchMock = makeFetch(200, { id: "wh_123", signing_secret: "whsec_abc" });
    const client = new ResendClient("re_test_key", fetchMock);

    const result = await client.registerWebhook("https://example.com/_emdash/api/plugins/emdash-resend/webhook", [
      "email.sent",
      "email.delivered",
    ]);

    expect(result).toEqual({ id: "wh_123", signing_secret: "whsec_abc" });
  });
});

describe("ResendClient.deleteWebhook", () => {
  it("sends DELETE to /webhooks/:id", async () => {
    const fetchMock = makeFetch(200, {});
    const client = new ResendClient("re_test_key", fetchMock);

    await client.deleteWebhook("wh_123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/webhooks/wh_123",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/emdash-resend && pnpm test tests/lib/resend.test.ts
```

Expected: FAIL — `Cannot find module '../../src/lib/resend.js'`

- [ ] **Step 3: Write `src/lib/resend.ts`**

```typescript
export type FetchFn = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface SendEmailParams {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  reply_to?: string | string[];
  attachments?: Array<{ filename: string; content: string }>;
  tags?: Array<{ name: string; value: string }>;
}

export interface ResendContact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed: boolean;
}

export interface ResendAudience {
  id: string;
  name: string;
  created_at: string;
}

export interface ResendBroadcast {
  id: string;
  name: string;
  audience_id: string;
  status: "draft" | "sent" | "sending";
  created_at: string;
}

const WEBHOOK_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.complained",
  "email.bounced",
  "email.opened",
  "email.clicked",
] as const;

export class ResendClient {
  constructor(private apiKey: string, private fetchFn: FetchFn = fetch) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.fetchFn(`https://api.resend.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error((err as { message?: string }).message ?? `Resend API error: ${res.status}`);
    }

    if (res.status === 204) return undefined as unknown as T;
    return res.json() as Promise<T>;
  }

  async sendEmail(params: SendEmailParams): Promise<{ id: string }> {
    return this.request("POST", "/emails", params);
  }

  async registerWebhook(url: string, events: string[] = [...WEBHOOK_EVENTS]): Promise<{ id: string; signing_secret: string }> {
    return this.request("POST", "/webhooks", { url, events });
  }

  async deleteWebhook(id: string): Promise<void> {
    return this.request("DELETE", `/webhooks/${id}`);
  }

  async getWebhook(id: string): Promise<{ id: string; url: string; enabled: boolean }> {
    return this.request("GET", `/webhooks/${id}`);
  }

  async listAudiences(): Promise<{ data: ResendAudience[] }> {
    return this.request("GET", "/audiences");
  }

  async createAudience(name: string): Promise<{ id: string; name: string }> {
    return this.request("POST", "/audiences", { name });
  }

  async listContacts(audienceId: string): Promise<{ data: ResendContact[] }> {
    return this.request("GET", `/audiences/${audienceId}/contacts`);
  }

  async createContact(
    audienceId: string,
    params: { email: string; first_name?: string; last_name?: string; unsubscribed?: boolean }
  ): Promise<{ id: string }> {
    return this.request("POST", `/audiences/${audienceId}/contacts`, params);
  }

  async updateContact(audienceId: string, id: string, params: { unsubscribed: boolean }): Promise<void> {
    return this.request("PATCH", `/audiences/${audienceId}/contacts/${id}`, params);
  }

  async deleteContact(audienceId: string, id: string): Promise<void> {
    return this.request("DELETE", `/audiences/${audienceId}/contacts/${id}`);
  }

  async listBroadcasts(): Promise<{ data: ResendBroadcast[] }> {
    return this.request("GET", "/broadcasts");
  }

  async createBroadcast(params: {
    name?: string;
    audience_id: string;
    from: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<{ id: string }> {
    return this.request("POST", "/broadcasts", params);
  }

  async sendBroadcast(id: string): Promise<void> {
    return this.request("POST", `/broadcasts/${id}/send`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/emdash-resend && pnpm test tests/lib/resend.test.ts
```

Expected: PASS (3 test cases)

- [ ] **Step 5: Commit**

```bash
git add packages/emdash-resend/src/lib/resend.ts packages/emdash-resend/tests/lib/resend.test.ts
git commit -m "feat: add ResendClient with typed API methods"
```

---

## Task 4: Svix Webhook Verification

**Files:**
- Create: `packages/emdash-resend/src/lib/webhook-verify.ts`
- Create: `packages/emdash-resend/tests/lib/webhook-verify.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/webhook-verify.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { verifySvixSignature, makeSvixHeaders } from "../../src/lib/webhook-verify.js";

// Helper to generate a valid signature for testing
async function sign(secret: string, svixId: string, svixTimestamp: string, rawBody: string): Promise<string> {
  const secretBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const payload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `v1,${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

const RAW_SECRET = btoa("supersecretbytes_at_least_32_chars!!");
const SVIX_SECRET = `whsec_${RAW_SECRET}`;

describe("verifySvixSignature", () => {
  const body = JSON.stringify({ type: "email.delivered", data: { email_id: "test_123" } });
  const svixId = "msg_01j8xyz";
  const nowSeconds = Math.floor(Date.now() / 1000).toString();

  it("returns true for a valid signature", async () => {
    const sig = await sign(SVIX_SECRET, svixId, nowSeconds, body);
    const result = await verifySvixSignature(body, {
      "svix-id": svixId,
      "svix-timestamp": nowSeconds,
      "svix-signature": sig,
    }, SVIX_SECRET);
    expect(result).toBe(true);
  });

  it("returns false for a wrong signature", async () => {
    const result = await verifySvixSignature(body, {
      "svix-id": svixId,
      "svix-timestamp": nowSeconds,
      "svix-signature": "v1,invalidsignature==",
    }, SVIX_SECRET);
    expect(result).toBe(false);
  });

  it("returns false if timestamp is older than 5 minutes", async () => {
    const oldTimestamp = Math.floor((Date.now() - 6 * 60 * 1000) / 1000).toString();
    const sig = await sign(SVIX_SECRET, svixId, oldTimestamp, body);
    const result = await verifySvixSignature(body, {
      "svix-id": svixId,
      "svix-timestamp": oldTimestamp,
      "svix-signature": sig,
    }, SVIX_SECRET);
    expect(result).toBe(false);
  });

  it("accepts any valid sig from space-separated list", async () => {
    const sig1 = await sign(SVIX_SECRET, svixId, nowSeconds, body);
    const result = await verifySvixSignature(body, {
      "svix-id": svixId,
      "svix-timestamp": nowSeconds,
      "svix-signature": `v1,invalidsig== ${sig1}`,
    }, SVIX_SECRET);
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/emdash-resend && pnpm test tests/lib/webhook-verify.test.ts
```

Expected: FAIL — `Cannot find module '../../src/lib/webhook-verify.js'`

- [ ] **Step 3: Write `src/lib/webhook-verify.ts`**

```typescript
export interface SvixHeaders {
  "svix-id": string;
  "svix-timestamp": string;
  "svix-signature": string;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function verifySvixSignature(
  rawBody: string,
  headers: SvixHeaders,
  secret: string
): Promise<boolean> {
  const { "svix-id": svixId, "svix-timestamp": svixTimestamp, "svix-signature": svixSignature } = headers;

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const timestamp = parseInt(svixTimestamp, 10);
  if (isNaN(timestamp) || Date.now() - timestamp * 1000 > FIVE_MINUTES_MS) return false;

  const rawSecret = secret.replace(/^whsec_/, "");
  let secretBytes: Uint8Array;
  try {
    secretBytes = Uint8Array.from(atob(rawSecret), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computedSig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));

  const signatures = svixSignature.split(" ").map((s) => s.replace(/^v1,/, ""));
  return signatures.some((sig) => sig === computedSig);
}

// Exported for use in tests that need to generate valid headers
export function makeSvixHeaders(partial: Partial<SvixHeaders> = {}): SvixHeaders {
  return {
    "svix-id": partial["svix-id"] ?? "msg_test",
    "svix-timestamp": partial["svix-timestamp"] ?? Math.floor(Date.now() / 1000).toString(),
    "svix-signature": partial["svix-signature"] ?? "",
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/emdash-resend && pnpm test tests/lib/webhook-verify.test.ts
```

Expected: PASS (4 test cases)

- [ ] **Step 5: Commit**

```bash
git add packages/emdash-resend/src/lib/webhook-verify.ts packages/emdash-resend/tests/lib/webhook-verify.test.ts
git commit -m "feat: add Svix HMAC-SHA256 webhook verification"
```

---

## Task 5: Plugin Descriptor

**Files:**
- Create: `packages/emdash-resend/src/descriptor.ts`

- [ ] **Step 1: Write `src/descriptor.ts`**

No unit tests needed — it's a data factory with no logic.

```typescript
import type { PluginDescriptor } from "emdash";

export function resendPlugin(): PluginDescriptor {
  return {
    id: "emdash-resend",
    version: "0.1.0",
    entrypoint: "@frankwrk/emdash-resend/plugin",
    adminEntry: "@frankwrk/emdash-resend/admin",
    adminPages: [
      { path: "/settings", label: "Settings", icon: "settings" },
      { path: "/deliveries", label: "Delivery Log", icon: "mail" },
      { path: "/contacts", label: "Contacts", icon: "users" },
      { path: "/broadcasts", label: "Broadcasts", icon: "send" },
    ],
    adminWidgets: [
      { id: "delivery-stats", title: "Email Delivery", size: "third" },
    ],
  };
}
```

- [ ] **Step 2: Verify it typechecks**

```bash
cd packages/emdash-resend && pnpm typecheck
```

Expected: no errors (or only errors about missing emdash types if the peer dep isn't fully resolved yet — acceptable, will resolve during integration).

- [ ] **Step 3: Commit**

```bash
git add packages/emdash-resend/src/descriptor.ts
git commit -m "feat: add resendPlugin() descriptor factory"
```

---

## Task 6: email:deliver Hook

**Files:**
- Create: `packages/emdash-resend/src/handlers/deliver.ts`
- Create: `packages/emdash-resend/tests/deliver.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/deliver.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleEmailDeliver } from "../src/handlers/deliver.js";
import { makeMockCtx } from "./helpers.js";

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    message: {
      to: "user@example.com",
      subject: "Test email",
      text: "Hello world",
      html: "<p>Hello world</p>",
      ...overrides,
    },
    source: "test",
  };
}

describe("handleEmailDeliver", () => {
  it("sends email via Resend and writes a delivery record", async () => {
    const ctx = makeMockCtx({
      kv: {
        "settings:apiKey": "re_test_key",
        "settings:fromAddress": "noreply@example.com",
        "settings:fromName": "Test Site",
      },
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "email_abc" }), { status: 200, headers: { "Content-Type": "application/json" } })
      ),
    });

    await handleEmailDeliver(makeEvent(), ctx as any);

    expect(ctx.http.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );

    expect(ctx.storage.deliveries.put).toHaveBeenCalledWith(
      "email_abc",
      expect.objectContaining({ resendId: "email_abc", status: "sent" })
    );
  });

  it("uses event.from if provided, ignoring defaults", async () => {
    const ctx = makeMockCtx({
      kv: { "settings:apiKey": "re_test_key" },
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "email_xyz" }), { status: 200, headers: { "Content-Type": "application/json" } })
      ),
    });

    await handleEmailDeliver(makeEvent({ from: "custom@example.com" }), ctx as any);

    const body = JSON.parse((ctx.http.fetch as any).mock.calls[0][1].body);
    expect(body.from).toBe("custom@example.com");
  });

  it("builds 'Name <address>' from KV defaults when no from in event", async () => {
    const ctx = makeMockCtx({
      kv: {
        "settings:apiKey": "re_test_key",
        "settings:fromName": "My Site",
        "settings:fromAddress": "hi@mysite.com",
      },
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "e1" }), { status: 200, headers: { "Content-Type": "application/json" } })
      ),
    });

    await handleEmailDeliver(makeEvent(), ctx as any);

    const body = JSON.parse((ctx.http.fetch as any).mock.calls[0][1].body);
    expect(body.from).toBe("My Site <hi@mysite.com>");
  });

  it("throws when no API key is configured", async () => {
    const ctx = makeMockCtx({ kv: {} });
    await expect(handleEmailDeliver(makeEvent(), ctx as any)).rejects.toThrow("API key");
  });

  it("throws when no from address is configured", async () => {
    const ctx = makeMockCtx({ kv: { "settings:apiKey": "re_test_key" } });
    await expect(handleEmailDeliver(makeEvent(), ctx as any)).rejects.toThrow("from address");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/emdash-resend && pnpm test tests/deliver.test.ts
```

Expected: FAIL — `Cannot find module '../src/handlers/deliver.js'`

- [ ] **Step 3: Write `src/handlers/deliver.ts`**

```typescript
import { ResendClient } from "../lib/resend.js";

interface EmailMessage {
  from?: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  attachments?: Array<{ filename: string; content: string }>;
  tags?: Array<{ name: string; value: string }>;
}

interface DeliverEvent {
  message: EmailMessage;
  source: string;
}

export async function handleEmailDeliver(event: DeliverEvent, ctx: any): Promise<void> {
  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  if (!apiKey) throw new Error("Resend plugin: API key not configured. Add it in the Resend plugin settings.");

  const fromAddress = await ctx.kv.get<string>("settings:fromAddress");
  const fromName = await ctx.kv.get<string>("settings:fromName");

  let from = event.message.from;
  if (!from) {
    if (!fromAddress) {
      throw new Error("Resend plugin: No from address configured. Set a default sender in Settings > Resend > Settings.");
    }
    from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
  }

  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));

  const params: Record<string, unknown> = {
    from,
    to: event.message.to,
    subject: event.message.subject,
  };
  if (event.message.html) params.html = event.message.html;
  if (event.message.text) params.text = event.message.text;
  if (event.message.cc) params.cc = event.message.cc;
  if (event.message.bcc) params.bcc = event.message.bcc;
  if (event.message.replyTo) params.reply_to = event.message.replyTo;
  if (event.message.attachments) params.attachments = event.message.attachments;
  if (event.message.tags) params.tags = event.message.tags;

  const result = await client.sendEmail(params as any);

  const to = Array.isArray(event.message.to) ? event.message.to.join(", ") : event.message.to;
  await ctx.storage.deliveries.put(result.id, {
    resendId: result.id,
    to,
    subject: event.message.subject,
    status: "sent",
    createdAt: new Date().toISOString(),
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/emdash-resend && pnpm test tests/deliver.test.ts
```

Expected: PASS (5 test cases)

- [ ] **Step 5: Commit**

```bash
git add packages/emdash-resend/src/handlers/deliver.ts packages/emdash-resend/tests/deliver.test.ts
git commit -m "feat: add email:deliver hook handler for Resend transport"
```

---

## Task 7: Lifecycle Hooks

**Files:**
- Create: `packages/emdash-resend/src/handlers/lifecycle.ts`
- Create: `packages/emdash-resend/tests/lifecycle.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lifecycle.test.ts
import { describe, it, expect, vi } from "vitest";
import { handleInstall, handleActivate, handleDeactivate } from "../src/handlers/lifecycle.js";
import { makeMockCtx } from "./helpers.js";

const WEBHOOK_RESPONSE = new Response(
  JSON.stringify({ id: "wh_new", signing_secret: "whsec_newsecret" }),
  { status: 200, headers: { "Content-Type": "application/json" } }
);
const DELETE_RESPONSE = new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });

describe("handleInstall", () => {
  it("registers webhook when API key and site URL are present", async () => {
    const ctx = makeMockCtx({
      kv: {
        "settings:apiKey": "re_test",
        "settings:siteUrl": "https://example.com",
      },
      fetchImpl: vi.fn().mockResolvedValue(WEBHOOK_RESPONSE.clone()),
    });

    await handleInstall({}, ctx as any);

    expect(ctx.kv.set).toHaveBeenCalledWith("settings:webhookId", "wh_new");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:webhookSecret", "whsec_newsecret");
  });

  it("skips silently when no API key", async () => {
    const ctx = makeMockCtx({ kv: {} });
    await handleInstall({}, ctx as any);
    expect(ctx.kv.set).not.toHaveBeenCalled();
  });
});

describe("handleActivate", () => {
  it("skips when webhookId already exists", async () => {
    const ctx = makeMockCtx({
      kv: { "settings:apiKey": "re_test", "settings:webhookId": "wh_existing" },
    });
    await handleActivate({}, ctx as any);
    expect(ctx.http.fetch).not.toHaveBeenCalled();
  });

  it("re-registers when API key exists but no webhookId", async () => {
    const ctx = makeMockCtx({
      kv: { "settings:apiKey": "re_test", "settings:siteUrl": "https://example.com" },
      fetchImpl: vi.fn().mockResolvedValue(WEBHOOK_RESPONSE.clone()),
    });

    await handleActivate({}, ctx as any);

    expect(ctx.kv.set).toHaveBeenCalledWith("settings:webhookId", "wh_new");
  });
});

describe("handleDeactivate", () => {
  it("deletes webhook from Resend and removes webhookId from KV", async () => {
    const ctx = makeMockCtx({
      kv: { "settings:apiKey": "re_test", "settings:webhookId": "wh_del" },
      fetchImpl: vi.fn().mockResolvedValue(DELETE_RESPONSE.clone()),
    });

    await handleDeactivate({}, ctx as any);

    expect(ctx.http.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/webhooks/wh_del",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(ctx.kv.delete).toHaveBeenCalledWith("settings:webhookId");
  });

  it("skips when no webhookId", async () => {
    const ctx = makeMockCtx({ kv: { "settings:apiKey": "re_test" } });
    await handleDeactivate({}, ctx as any);
    expect(ctx.http.fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/emdash-resend && pnpm test tests/lifecycle.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write `src/handlers/lifecycle.ts`**

```typescript
import { ResendClient } from "../lib/resend.js";

const WEBHOOK_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.complained",
  "email.bounced",
  "email.opened",
  "email.clicked",
];

async function registerWebhook(ctx: any, apiKey: string): Promise<void> {
  const siteUrl = await ctx.kv.get<string>("settings:siteUrl");
  if (!siteUrl) return;

  const webhookUrl = `${siteUrl}/_emdash/api/plugins/emdash-resend/webhook`;
  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
  const result = await client.registerWebhook(webhookUrl, WEBHOOK_EVENTS);

  await ctx.kv.set("settings:webhookId", result.id);
  await ctx.kv.set("settings:webhookSecret", result.signing_secret);
}

export async function handleInstall(_event: unknown, ctx: any): Promise<void> {
  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  if (!apiKey) return;
  await registerWebhook(ctx, apiKey);
}

export async function handleActivate(_event: unknown, ctx: any): Promise<void> {
  const webhookId = await ctx.kv.get<string>("settings:webhookId");
  if (webhookId) return;

  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  if (!apiKey) return;

  await registerWebhook(ctx, apiKey);
}

export async function handleDeactivate(_event: unknown, ctx: any): Promise<void> {
  const webhookId = await ctx.kv.get<string>("settings:webhookId");
  if (!webhookId) return;

  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  if (!apiKey) return;

  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
  await client.deleteWebhook(webhookId);
  await ctx.kv.delete("settings:webhookId");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/emdash-resend && pnpm test tests/lifecycle.test.ts
```

Expected: PASS (5 test cases)

- [ ] **Step 5: Commit**

```bash
git add packages/emdash-resend/src/handlers/lifecycle.ts packages/emdash-resend/tests/lifecycle.test.ts
git commit -m "feat: add plugin lifecycle handlers (install/activate/deactivate)"
```

---

## Task 8: Settings Routes

**Files:**
- Create: `packages/emdash-resend/src/handlers/settings.ts`
- Create: `packages/emdash-resend/tests/settings-routes.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/settings-routes.test.ts
import { describe, it, expect, vi } from "vitest";
import {
  handleGetSettings,
  handleSaveSettings,
  handleTestEmail,
  handleGetWebhookStatus,
  handleRegisterWebhook,
} from "../src/handlers/settings.js";
import { makeRouteMockCtx } from "./helpers.js";

describe("handleGetSettings", () => {
  it("returns settings with apiKey masked", async () => {
    const ctx = makeRouteMockCtx({}, {
      kv: {
        "settings:apiKey": "re_live_secret",
        "settings:fromAddress": "hi@example.com",
        "settings:fromName": "My Site",
        "settings:webhookId": "wh_123",
      },
    });

    const result = await handleGetSettings(ctx as any);

    expect(result).toMatchObject({
      fromAddress: "hi@example.com",
      fromName: "My Site",
      webhookRegistered: true,
    });
    expect(result.apiKey).toMatch(/^\*+/);
    expect(result.apiKey).not.toContain("secret");
  });

  it("returns webhookRegistered: false when no webhookId", async () => {
    const ctx = makeRouteMockCtx({}, { kv: { "settings:apiKey": "re_live_secret" } });
    const result = await handleGetSettings(ctx as any);
    expect(result.webhookRegistered).toBe(false);
  });
});

describe("handleSaveSettings", () => {
  it("saves all provided fields to KV", async () => {
    const ctx = makeRouteMockCtx(
      { apiKey: "re_new_key", fromAddress: "new@example.com", fromName: "New Name" },
      { method: "POST", url: "https://example.com/_emdash/api/plugins/emdash-resend/settings/save" }
    );

    const result = await handleSaveSettings(ctx as any);

    expect(result.success).toBe(true);
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:apiKey", "re_new_key");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:fromAddress", "new@example.com");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:fromName", "New Name");
  });

  it("registers webhook on first save when no webhookId exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "wh_new", signing_secret: "whsec_abc" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const ctx = makeRouteMockCtx(
      { apiKey: "re_new_key", fromAddress: "x@y.com" },
      {
        method: "POST",
        url: "https://mysite.com/_emdash/api/plugins/emdash-resend/settings/save",
        fetchImpl: fetchMock,
      }
    );

    await handleSaveSettings(ctx as any);

    expect(ctx.kv.set).toHaveBeenCalledWith("settings:siteUrl", "https://mysite.com");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:webhookId", "wh_new");
  });
});

describe("handleGetWebhookStatus", () => {
  it("returns registered: false when no webhookId in KV", async () => {
    const ctx = makeRouteMockCtx({}, { kv: {} });
    const result = await handleGetWebhookStatus(ctx as any);
    expect(result.registered).toBe(false);
  });

  it("returns registered: true when webhookId exists", async () => {
    const ctx = makeRouteMockCtx({}, { kv: { "settings:webhookId": "wh_123" } });
    const result = await handleGetWebhookStatus(ctx as any);
    expect(result.registered).toBe(true);
    expect(result.webhookId).toBe("wh_123");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/emdash-resend && pnpm test tests/settings-routes.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write `src/handlers/settings.ts`**

```typescript
import { ResendClient } from "../lib/resend.js";

const WEBHOOK_EVENTS = [
  "email.sent", "email.delivered", "email.delivery_delayed",
  "email.complained", "email.bounced", "email.opened", "email.clicked",
];

function maskApiKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return key.slice(0, 4) + "•".repeat(Math.max(0, key.length - 8)) + key.slice(-4);
}

export async function handleGetSettings(ctx: any): Promise<Record<string, unknown>> {
  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  const fromAddress = await ctx.kv.get<string>("settings:fromAddress");
  const fromName = await ctx.kv.get<string>("settings:fromName");
  const webhookId = await ctx.kv.get<string>("settings:webhookId");

  return {
    apiKey: apiKey ? maskApiKey(apiKey) : null,
    fromAddress: fromAddress ?? null,
    fromName: fromName ?? null,
    webhookRegistered: Boolean(webhookId),
    webhookId: webhookId ?? null,
  };
}

export async function handleSaveSettings(ctx: any): Promise<{ success: boolean }> {
  const { apiKey, fromAddress, fromName } = ctx.input as {
    apiKey?: string;
    fromAddress?: string;
    fromName?: string;
  };

  if (apiKey !== undefined) await ctx.kv.set("settings:apiKey", apiKey);
  if (fromAddress !== undefined) await ctx.kv.set("settings:fromAddress", fromAddress);
  if (fromName !== undefined) await ctx.kv.set("settings:fromName", fromName);

  // Store the site URL from the request origin for webhook registration
  const origin = new URL(ctx.request.url).origin;
  await ctx.kv.set("settings:siteUrl", origin);

  // Auto-register webhook on first save if not already registered
  const resolvedApiKey = apiKey ?? await ctx.kv.get<string>("settings:apiKey");
  const webhookId = await ctx.kv.get<string>("settings:webhookId");

  if (resolvedApiKey && !webhookId) {
    const webhookUrl = `${origin}/_emdash/api/plugins/emdash-resend/webhook`;
    const client = new ResendClient(resolvedApiKey, ctx.http.fetch.bind(ctx.http));
    const result = await client.registerWebhook(webhookUrl, WEBHOOK_EVENTS);
    await ctx.kv.set("settings:webhookId", result.id);
    await ctx.kv.set("settings:webhookSecret", result.signing_secret);
  }

  return { success: true };
}

export async function handleTestEmail(ctx: any): Promise<{ success: boolean; error?: string }> {
  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  if (!apiKey) throw new Error("API key not configured");

  const fromAddress = await ctx.kv.get<string>("settings:fromAddress");
  const fromName = await ctx.kv.get<string>("settings:fromName");

  if (!fromAddress) throw new Error("From address not configured");

  // In a real admin context, ctx.users would give us the admin email.
  // Fallback: send to the from address itself.
  const to = (ctx.users ? await ctx.users.getCurrent?.()?.then((u: any) => u?.email) : null) ?? fromAddress;
  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
  await client.sendEmail({
    from,
    to,
    subject: "EmDash Resend plugin — test email",
    text: "If you received this, the Resend plugin is configured correctly.",
    html: "<p>If you received this, the Resend plugin is configured correctly.</p>",
  });

  return { success: true };
}

export async function handleGetWebhookStatus(ctx: any): Promise<{ registered: boolean; webhookId?: string }> {
  const webhookId = await ctx.kv.get<string>("settings:webhookId");
  return webhookId
    ? { registered: true, webhookId }
    : { registered: false };
}

export async function handleRegisterWebhook(ctx: any): Promise<{ success: boolean; webhookId: string }> {
  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  if (!apiKey) throw new Error("API key not configured");

  const origin = new URL(ctx.request.url).origin;
  const webhookUrl = `${origin}/_emdash/api/plugins/emdash-resend/webhook`;
  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
  const result = await client.registerWebhook(webhookUrl, WEBHOOK_EVENTS);

  await ctx.kv.set("settings:webhookId", result.id);
  await ctx.kv.set("settings:webhookSecret", result.signing_secret);
  await ctx.kv.set("settings:siteUrl", origin);

  return { success: true, webhookId: result.id };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/emdash-resend && pnpm test tests/settings-routes.test.ts
```

Expected: PASS (5 test cases)

- [ ] **Step 5: Commit**

```bash
git add packages/emdash-resend/src/handlers/settings.ts packages/emdash-resend/tests/settings-routes.test.ts
git commit -m "feat: add settings routes (GET/save/test/webhook-status/webhook-register)"
```

---

## Task 9: Deliveries Routes

**Files:**
- Create: `packages/emdash-resend/src/handlers/deliveries.ts`
- Create: `packages/emdash-resend/tests/deliveries-routes.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/deliveries-routes.test.ts
import { describe, it, expect, vi } from "vitest";
import { handleGetDeliveries, handleGetDeliveryStats } from "../src/handlers/deliveries.js";
import { makeRouteMockCtx, makeMockCollection } from "./helpers.js";

const SAMPLE_DELIVERIES = {
  "email_1": { resendId: "email_1", to: "a@a.com", subject: "S1", status: "delivered", createdAt: "2024-01-01T00:00:00Z" },
  "email_2": { resendId: "email_2", to: "b@b.com", subject: "S2", status: "bounced", createdAt: "2024-01-02T00:00:00Z" },
  "email_3": { resendId: "email_3", to: "c@c.com", subject: "S3", status: "sent", createdAt: "2024-01-03T00:00:00Z" },
};

describe("handleGetDeliveries", () => {
  it("returns paginated delivery records", async () => {
    const ctx = makeRouteMockCtx({ limit: 10 });
    ctx.storage.deliveries.query = vi.fn().mockResolvedValue({
      items: Object.entries(SAMPLE_DELIVERIES).map(([id, data]) => ({ id, data })),
      cursor: undefined,
      hasMore: false,
    });

    const result = await handleGetDeliveries(ctx as any);

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(ctx.storage.deliveries.query).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 })
    );
  });

  it("passes status filter to query", async () => {
    const ctx = makeRouteMockCtx({ limit: 50, status: "bounced" });
    ctx.storage.deliveries.query = vi.fn().mockResolvedValue({ items: [], cursor: undefined, hasMore: false });

    await handleGetDeliveries(ctx as any);

    expect(ctx.storage.deliveries.query).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "bounced" } })
    );
  });
});

describe("handleGetDeliveryStats", () => {
  it("returns sent/delivery-rate/bounce-rate counts", async () => {
    const ctx = makeRouteMockCtx({});
    ctx.storage.deliveries.count = vi.fn()
      .mockResolvedValueOnce(100)   // total
      .mockResolvedValueOnce(85)    // delivered
      .mockResolvedValueOnce(5);    // bounced

    const result = await handleGetDeliveryStats(ctx as any);

    expect(result.totalSent).toBe(100);
    expect(result.deliveryRate).toBe(85);
    expect(result.bounceRate).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/emdash-resend && pnpm test tests/deliveries-routes.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write `src/handlers/deliveries.ts`**

```typescript
export async function handleGetDeliveries(ctx: any): Promise<{ items: unknown[]; cursor?: string; hasMore: boolean }> {
  const { limit = 50, cursor, status } = ctx.input as {
    limit?: number;
    cursor?: string;
    status?: string;
  };

  const result = await ctx.storage.deliveries.query({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    limit: Math.min(Math.max(1, limit), 100),
    cursor,
  });

  return {
    items: result.items.map((item: any) => ({ id: item.id, ...item.data })),
    cursor: result.cursor,
    hasMore: result.hasMore,
  };
}

export async function handleGetDeliveryStats(ctx: any): Promise<{
  totalSent: number;
  deliveryRate: number;
  bounceRate: number;
}> {
  const [totalSent, delivered, bounced] = await Promise.all([
    ctx.storage.deliveries.count(),
    ctx.storage.deliveries.count({ status: "delivered" }),
    ctx.storage.deliveries.count({ status: "bounced" }),
  ]);

  return { totalSent, deliveryRate: delivered, bounceRate: bounced };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/emdash-resend && pnpm test tests/deliveries-routes.test.ts
```

Expected: PASS (3 test cases)

- [ ] **Step 5: Commit**

```bash
git add packages/emdash-resend/src/handlers/deliveries.ts packages/emdash-resend/tests/deliveries-routes.test.ts
git commit -m "feat: add deliveries routes (list + stats)"
```

---

## Task 10: Audiences & Contacts Routes

**Files:**
- Create: `packages/emdash-resend/src/handlers/audiences.ts`
- Create: `packages/emdash-resend/tests/audiences-routes.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/audiences-routes.test.ts
import { describe, it, expect, vi } from "vitest";
import {
  handleListAudiences,
  handleCreateAudience,
  handleListContacts,
  handleAddContact,
  handleUnsubscribeContact,
  handleDeleteContact,
} from "../src/handlers/audiences.js";
import { makeRouteMockCtx } from "./helpers.js";

function makeCtx(input: unknown, kv: Record<string, unknown> = {}) {
  return makeRouteMockCtx(input, {
    kv: { "settings:apiKey": "re_test", ...kv },
    fetchImpl: vi.fn(),
  });
}

describe("handleListAudiences", () => {
  it("fetches audiences from Resend", async () => {
    const ctx = makeCtx({});
    (ctx.http.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "aud_1", name: "Newsletter", created_at: "2024-01-01" }] }), {
        status: 200, headers: { "Content-Type": "application/json" },
      })
    );

    const result = await handleListAudiences(ctx as any);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe("aud_1");
  });
});

describe("handleListContacts", () => {
  it("fetches contacts for audience", async () => {
    const ctx = makeCtx({ audienceId: "aud_1" });
    (ctx.http.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "c_1", email: "user@example.com", unsubscribed: false }] }), {
        status: 200, headers: { "Content-Type": "application/json" },
      })
    );

    const result = await handleListContacts(ctx as any);
    expect(result.data).toHaveLength(1);
    expect((ctx.http.fetch as any)).toHaveBeenCalledWith(
      expect.stringContaining("/audiences/aud_1/contacts"),
      expect.any(Object)
    );
  });
});

describe("handleAddContact", () => {
  it("creates a contact in the specified audience", async () => {
    const ctx = makeCtx({ audienceId: "aud_1", email: "new@example.com", firstName: "Jane" });
    (ctx.http.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ id: "c_new" }), { status: 200, headers: { "Content-Type": "application/json" } })
    );

    const result = await handleAddContact(ctx as any);
    expect(result.id).toBe("c_new");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/emdash-resend && pnpm test tests/audiences-routes.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write `src/handlers/audiences.ts`**

```typescript
import { ResendClient } from "../lib/resend.js";

async function getClient(ctx: any): Promise<ResendClient> {
  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  if (!apiKey) throw new Error("API key not configured");
  return new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
}

export async function handleListAudiences(ctx: any) {
  const client = await getClient(ctx);
  return client.listAudiences();
}

export async function handleCreateAudience(ctx: any) {
  const { name } = ctx.input as { name: string };
  if (!name) throw new Error("Audience name is required");
  const client = await getClient(ctx);
  return client.createAudience(name);
}

export async function handleListContacts(ctx: any) {
  const { audienceId } = ctx.input as { audienceId: string };
  if (!audienceId) throw new Error("audienceId is required");
  const client = await getClient(ctx);
  return client.listContacts(audienceId);
}

export async function handleAddContact(ctx: any) {
  const { audienceId, email, firstName, lastName } = ctx.input as {
    audienceId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  if (!audienceId || !email) throw new Error("audienceId and email are required");
  const client = await getClient(ctx);
  return client.createContact(audienceId, {
    email,
    first_name: firstName,
    last_name: lastName,
  });
}

export async function handleUnsubscribeContact(ctx: any) {
  const { audienceId, contactId } = ctx.input as { audienceId: string; contactId: string };
  if (!audienceId || !contactId) throw new Error("audienceId and contactId are required");
  const client = await getClient(ctx);
  await client.updateContact(audienceId, contactId, { unsubscribed: true });
  return { success: true };
}

export async function handleDeleteContact(ctx: any) {
  const { audienceId, contactId } = ctx.input as { audienceId: string; contactId: string };
  if (!audienceId || !contactId) throw new Error("audienceId and contactId are required");
  const client = await getClient(ctx);
  await client.deleteContact(audienceId, contactId);
  return { success: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/emdash-resend && pnpm test tests/audiences-routes.test.ts
```

Expected: PASS (3 test cases)

- [ ] **Step 5: Commit**

```bash
git add packages/emdash-resend/src/handlers/audiences.ts packages/emdash-resend/tests/audiences-routes.test.ts
git commit -m "feat: add audiences and contacts routes"
```

---

## Task 11: Broadcasts Routes

**Files:**
- Create: `packages/emdash-resend/src/handlers/broadcasts.ts`
- Create: `packages/emdash-resend/tests/broadcasts-routes.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/broadcasts-routes.test.ts
import { describe, it, expect, vi } from "vitest";
import { handleListBroadcasts, handleCreateBroadcast, handleSendBroadcast } from "../src/handlers/broadcasts.js";
import { makeRouteMockCtx } from "./helpers.js";

function makeCtx(input: unknown) {
  return makeRouteMockCtx(input, {
    kv: { "settings:apiKey": "re_test" },
    fetchImpl: vi.fn(),
  });
}

describe("handleListBroadcasts", () => {
  it("returns broadcasts from Resend", async () => {
    const ctx = makeCtx({});
    (ctx.http.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "bc_1", name: "March Newsletter", status: "sent" }] }), {
        status: 200, headers: { "Content-Type": "application/json" },
      })
    );

    const result = await handleListBroadcasts(ctx as any);
    expect(result.data[0].id).toBe("bc_1");
  });
});

describe("handleCreateBroadcast", () => {
  it("creates a broadcast draft", async () => {
    const ctx = makeCtx({
      audienceId: "aud_1",
      from: "newsletter@example.com",
      subject: "March Issue",
      html: "<h1>March</h1>",
      name: "March 2024",
    });
    (ctx.http.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ id: "bc_new" }), { status: 200, headers: { "Content-Type": "application/json" } })
    );

    const result = await handleCreateBroadcast(ctx as any);
    expect(result.id).toBe("bc_new");
  });
});

describe("handleSendBroadcast", () => {
  it("POSTs to /broadcasts/:id/send", async () => {
    const ctx = makeCtx({ broadcastId: "bc_1" });
    (ctx.http.fetch as any).mockResolvedValue(
      new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })
    );

    const result = await handleSendBroadcast(ctx as any);
    expect(result.success).toBe(true);
    expect(ctx.http.fetch as any).toHaveBeenCalledWith(
      "https://api.resend.com/broadcasts/bc_1/send",
      expect.objectContaining({ method: "POST" })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/emdash-resend && pnpm test tests/broadcasts-routes.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write `src/handlers/broadcasts.ts`**

```typescript
import { ResendClient } from "../lib/resend.js";

async function getClient(ctx: any): Promise<ResendClient> {
  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  if (!apiKey) throw new Error("API key not configured");
  return new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
}

export async function handleListBroadcasts(ctx: any) {
  const client = await getClient(ctx);
  return client.listBroadcasts();
}

export async function handleCreateBroadcast(ctx: any) {
  const { audienceId, from, subject, html, text, name } = ctx.input as {
    audienceId: string;
    from: string;
    subject: string;
    html?: string;
    text?: string;
    name?: string;
  };

  if (!audienceId || !from || !subject) {
    throw new Error("audienceId, from, and subject are required");
  }

  const client = await getClient(ctx);
  return client.createBroadcast({ audience_id: audienceId, from, subject, html, text, name });
}

export async function handleSendBroadcast(ctx: any) {
  const { broadcastId } = ctx.input as { broadcastId: string };
  if (!broadcastId) throw new Error("broadcastId is required");

  const client = await getClient(ctx);
  await client.sendBroadcast(broadcastId);
  return { success: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/emdash-resend && pnpm test tests/broadcasts-routes.test.ts
```

Expected: PASS (3 test cases)

- [ ] **Step 5: Commit**

```bash
git add packages/emdash-resend/src/handlers/broadcasts.ts packages/emdash-resend/tests/broadcasts-routes.test.ts
git commit -m "feat: add broadcasts routes (list/create/send)"
```

---

## Task 12: Webhook Receiver Route

**Files:**
- Create: `packages/emdash-resend/src/handlers/webhook.ts`
- Create: `packages/emdash-resend/tests/webhook-route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/webhook-route.test.ts
import { describe, it, expect, vi } from "vitest";
import { handleWebhook } from "../src/handlers/webhook.js";
import { makeMockCtx } from "./helpers.js";

// Generate a valid Svix signature for tests
async function signBody(secret: string, svixId: string, timestamp: string, body: string): Promise<string> {
  const raw = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${svixId}.${timestamp}.${body}`));
  return `v1,${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

const RAW_SECRET = btoa("supersecretbytes_at_least_32_chars!!");
const SVIX_SECRET = `whsec_${RAW_SECRET}`;

async function makeWebhookCtx(payload: unknown, secret = SVIX_SECRET) {
  const body = JSON.stringify(payload);
  const svixId = "msg_test_1";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await signBody(secret, svixId, timestamp, body);

  const ctx = makeMockCtx({ kv: { "settings:webhookSecret": secret } });
  return {
    ...ctx,
    input: {},
    request: new Request("https://example.com/_emdash/api/plugins/emdash-resend/webhook", {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        "svix-id": svixId,
        "svix-timestamp": timestamp,
        "svix-signature": signature,
      },
    }),
  };
}

describe("handleWebhook", () => {
  it("updates delivery status to delivered on email.delivered", async () => {
    const ctx = await makeWebhookCtx({ type: "email.delivered", data: { email_id: "email_abc" } });
    ctx.storage.deliveries.get = vi.fn().mockResolvedValue({
      resendId: "email_abc", to: "u@u.com", subject: "Hi", status: "sent", createdAt: "2024-01-01T00:00:00Z"
    });

    await handleWebhook(ctx as any);

    expect(ctx.storage.deliveries.put).toHaveBeenCalledWith(
      "email_abc",
      expect.objectContaining({ status: "delivered" })
    );
  });

  it("rejects requests with invalid signature with 401", async () => {
    const ctx = await makeWebhookCtx({ type: "email.delivered", data: { email_id: "x" } });
    // Overwrite the signature with something invalid
    const badHeaders = new Headers(ctx.request.headers);
    badHeaders.set("svix-signature", "v1,invalidsig==");
    const badRequest = new Request(ctx.request.url, {
      method: "POST",
      body: await ctx.request.clone().text(),
      headers: badHeaders,
    });
    (ctx as any).request = badRequest;

    await expect(handleWebhook(ctx as any)).rejects.toThrow();
  });

  it("writes openedAt on email.opened only when not already set", async () => {
    const ctx = await makeWebhookCtx({ type: "email.opened", data: { email_id: "email_abc" } });
    ctx.storage.deliveries.get = vi.fn().mockResolvedValue({
      resendId: "email_abc", to: "u@u.com", subject: "Hi", status: "delivered", createdAt: "2024-01-01T00:00:00Z"
    });

    await handleWebhook(ctx as any);

    const putCall = (ctx.storage.deliveries.put as any).mock.calls[0][1];
    expect(putCall.openedAt).toBeDefined();
  });

  it("does not overwrite openedAt if already set", async () => {
    const ctx = await makeWebhookCtx({ type: "email.opened", data: { email_id: "email_abc" } });
    ctx.storage.deliveries.get = vi.fn().mockResolvedValue({
      resendId: "email_abc", to: "u@u.com", subject: "Hi", status: "delivered",
      createdAt: "2024-01-01T00:00:00Z", openedAt: "2024-01-01T01:00:00Z"
    });

    await handleWebhook(ctx as any);

    const putCall = (ctx.storage.deliveries.put as any).mock.calls[0][1];
    expect(putCall.openedAt).toBe("2024-01-01T01:00:00Z");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/emdash-resend && pnpm test tests/webhook-route.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Write `src/handlers/webhook.ts`**

```typescript
import { verifySvixSignature } from "../lib/webhook-verify.js";

interface ResendWebhookEvent {
  type: string;
  data: {
    email_id: string;
    [key: string]: unknown;
  };
}

export async function handleWebhook(ctx: any): Promise<{ ok: boolean }> {
  const secret = await ctx.kv.get<string>("settings:webhookSecret");
  if (!secret) {
    throw new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await ctx.request.text();

  const valid = await verifySvixSignature(rawBody, {
    "svix-id": ctx.request.headers.get("svix-id") ?? "",
    "svix-timestamp": ctx.request.headers.get("svix-timestamp") ?? "",
    "svix-signature": ctx.request.headers.get("svix-signature") ?? "",
  }, secret);

  if (!valid) {
    throw new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const event = JSON.parse(rawBody) as ResendWebhookEvent;
  const { type, data } = event;
  const emailId = data.email_id;

  if (!emailId) return { ok: true };

  const existing = await ctx.storage.deliveries.get(emailId);
  if (!existing) return { ok: true };

  const updates: Record<string, unknown> = { ...existing };

  switch (type) {
    case "email.sent":
      break;
    case "email.delivered":
      updates.status = "delivered";
      break;
    case "email.delivery_delayed":
      updates.status = "delayed";
      break;
    case "email.bounced":
      updates.status = "bounced";
      updates.bouncedAt = new Date().toISOString();
      break;
    case "email.complained":
      updates.status = "complained";
      break;
    case "email.opened":
      if (!existing.openedAt) updates.openedAt = new Date().toISOString();
      break;
    case "email.clicked":
      if (!existing.clickedAt) updates.clickedAt = new Date().toISOString();
      break;
  }

  await ctx.storage.deliveries.put(emailId, updates);
  return { ok: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/emdash-resend && pnpm test tests/webhook-route.test.ts
```

Expected: PASS (4 test cases)

- [ ] **Step 5: Commit**

```bash
git add packages/emdash-resend/src/handlers/webhook.ts packages/emdash-resend/tests/webhook-route.test.ts
git commit -m "feat: add webhook receiver with Svix signature verification"
```

---

## Task 13: Wire definePlugin() in src/index.ts

**Files:**
- Create: `packages/emdash-resend/src/index.ts`

- [ ] **Step 1: Run all existing tests to confirm baseline**

```bash
cd packages/emdash-resend && pnpm test
```

Expected: all prior tests pass

- [ ] **Step 2: Write `src/index.ts`**

```typescript
import { definePlugin } from "emdash";
import { handleEmailDeliver } from "./handlers/deliver.js";
import { handleInstall, handleActivate, handleDeactivate } from "./handlers/lifecycle.js";
import {
  handleGetSettings,
  handleSaveSettings,
  handleTestEmail,
  handleGetWebhookStatus,
  handleRegisterWebhook,
} from "./handlers/settings.js";
import { handleGetDeliveries, handleGetDeliveryStats } from "./handlers/deliveries.js";
import {
  handleListAudiences,
  handleCreateAudience,
  handleListContacts,
  handleAddContact,
  handleUnsubscribeContact,
  handleDeleteContact,
} from "./handlers/audiences.js";
import {
  handleListBroadcasts,
  handleCreateBroadcast,
  handleSendBroadcast,
} from "./handlers/broadcasts.js";
import { handleWebhook } from "./handlers/webhook.js";

// Re-export handlers so tests can import them directly
export {
  handleEmailDeliver,
  handleInstall, handleActivate, handleDeactivate,
  handleGetSettings, handleSaveSettings, handleTestEmail, handleGetWebhookStatus, handleRegisterWebhook,
  handleGetDeliveries, handleGetDeliveryStats,
  handleListAudiences, handleCreateAudience, handleListContacts, handleAddContact, handleUnsubscribeContact, handleDeleteContact,
  handleListBroadcasts, handleCreateBroadcast, handleSendBroadcast,
  handleWebhook,
};

export default definePlugin({
  id: "emdash-resend",
  version: "0.1.0",
  capabilities: ["email:provide", "network:fetch"],
  allowedHosts: ["api.resend.com"],

  storage: {
    deliveries: {
      indexes: ["status", "createdAt", "to"],
    },
  },

  hooks: {
    "email:deliver": {
      exclusive: true,
      errorPolicy: "abort",
      handler: handleEmailDeliver,
    },
    "plugin:install": { handler: handleInstall },
    "plugin:activate": { handler: handleActivate },
    "plugin:deactivate": { handler: handleDeactivate },
  },

  routes: {
    settings: { handler: handleGetSettings },
    "settings/save": { handler: handleSaveSettings },
    "settings/test": { handler: handleTestEmail },
    "settings/webhook-status": { handler: handleGetWebhookStatus },
    "settings/webhook-register": { handler: handleRegisterWebhook },
    deliveries: { handler: handleGetDeliveries },
    "deliveries/stats": { handler: handleGetDeliveryStats },
    audiences: { handler: handleListAudiences },
    "audiences/create": { handler: handleCreateAudience },
    "audiences/contacts": { handler: handleListContacts },
    "audiences/contacts/add": { handler: handleAddContact },
    "audiences/contacts/unsubscribe": { handler: handleUnsubscribeContact },
    "audiences/contacts/delete": { handler: handleDeleteContact },
    broadcasts: { handler: handleListBroadcasts },
    "broadcasts/create": { handler: handleCreateBroadcast },
    "broadcasts/send": { handler: handleSendBroadcast },
    webhook: {
      public: true,
      handler: handleWebhook,
    },
  },

  admin: {
    entry: "@frankwrk/emdash-resend/admin",
    pages: [
      { path: "/settings", label: "Settings", icon: "settings" },
      { path: "/deliveries", label: "Delivery Log", icon: "mail" },
      { path: "/contacts", label: "Contacts", icon: "users" },
      { path: "/broadcasts", label: "Broadcasts", icon: "send" },
    ],
    widgets: [{ id: "delivery-stats", title: "Email Delivery", size: "third" }],
  },
});
```

- [ ] **Step 3: Run all tests again to confirm nothing broke**

```bash
cd packages/emdash-resend && pnpm test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/emdash-resend/src/index.ts
git commit -m "feat: wire all handlers into definePlugin() for emdash-resend"
```

---

## Task 14: SettingsPage.tsx

**Files:**
- Create: `packages/emdash-resend/src/components/SettingsPage.tsx`

- [ ] **Step 1: Write `src/components/SettingsPage.tsx`**

No automated tests for React components — verify visually after integration (Task 18).

```tsx
import { useState, useEffect } from "react";
import { usePluginAPI } from "@emdash-cms/admin";

interface Settings {
  apiKey: string | null;
  fromAddress: string | null;
  fromName: string | null;
  webhookRegistered: boolean;
  webhookId: string | null;
}

export function SettingsPage() {
  const api = usePluginAPI();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({ apiKey: "", fromAddress: "", fromName: "" });
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    api.get("settings").then((data) => {
      const s = data as Settings;
      setSettings(s);
      setForm({
        apiKey: "",
        fromAddress: s.fromAddress ?? "",
        fromName: s.fromName ?? "",
      });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const payload: Record<string, string> = {
        fromAddress: form.fromAddress,
        fromName: form.fromName,
      };
      if (form.apiKey) payload.apiKey = form.apiKey;
      await api.post("settings/save", payload);
      const updated = await api.get("settings") as Settings;
      setSettings(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      await api.post("settings/test", {});
      setTestResult({ success: true });
    } catch (e: any) {
      setTestResult({ error: e.message ?? "Test failed" });
    }
  };

  const handleRegisterWebhook = async () => {
    setRegistering(true);
    try {
      await api.post("settings/webhook-register", {});
      const updated = await api.get("settings") as Settings;
      setSettings(updated);
    } finally {
      setRegistering(false);
    }
  };

  if (!settings) return <div>Loading…</div>;

  return (
    <div style={{ maxWidth: 560, padding: "2rem" }}>
      <h1>Resend Settings</h1>

      <section style={{ marginBottom: "2rem" }}>
        <h2>API Key</h2>
        {settings.apiKey && (
          <p style={{ fontFamily: "monospace", color: "#888" }}>Current: {settings.apiKey}</p>
        )}
        <input
          type="password"
          placeholder="re_live_… (leave blank to keep existing)"
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          style={{ display: "block", width: "100%", marginBottom: "0.5rem" }}
        />
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Default Sender</h2>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          From name
          <input
            type="text"
            value={form.fromName}
            onChange={(e) => setForm({ ...form, fromName: e.target.value })}
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label style={{ display: "block" }}>
          From address
          <input
            type="email"
            value={form.fromAddress}
            onChange={(e) => setForm({ ...form, fromAddress: e.target.value })}
            style={{ display: "block", width: "100%" }}
          />
        </label>
      </section>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
        <button onClick={handleTest} disabled={!settings.apiKey}>
          Send test email
        </button>
      </div>

      {testResult && (
        <p style={{ color: testResult.success ? "green" : "red" }}>
          {testResult.success ? "Test email sent successfully." : testResult.error}
        </p>
      )}

      <section>
        <h2>
          Webhook{" "}
          <span style={{ color: settings.webhookRegistered ? "green" : "red" }}>
            {settings.webhookRegistered ? "✓ registered" : "✗ not registered"}
          </span>
        </h2>
        {settings.webhookId && (
          <p style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#888" }}>
            ID: {settings.webhookId}
          </p>
        )}
        {!settings.webhookRegistered && (
          <button onClick={handleRegisterWebhook} disabled={registering || !settings.apiKey}>
            {registering ? "Registering…" : "Register webhook"}
          </button>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/emdash-resend/src/components/SettingsPage.tsx
git commit -m "feat: add SettingsPage React component"
```

---

## Task 15: DeliveryLogPage.tsx

**Files:**
- Create: `packages/emdash-resend/src/components/DeliveryLogPage.tsx`

- [ ] **Step 1: Write `src/components/DeliveryLogPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { usePluginAPI } from "@emdash-cms/admin";

type DeliveryStatus = "sent" | "delivered" | "bounced" | "complained" | "delayed";

interface Delivery {
  id: string;
  resendId: string;
  to: string;
  subject: string;
  status: DeliveryStatus;
  createdAt: string;
  openedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
}

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  sent: "#888",
  delivered: "#16a34a",
  bounced: "#dc2626",
  complained: "#d97706",
  delayed: "#64748b",
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "delivered", label: "Delivered" },
  { value: "bounced", label: "Bounced" },
  { value: "complained", label: "Complained" },
  { value: "delayed", label: "Delayed" },
];

export function DeliveryLogPage() {
  const api = usePluginAPI();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [status, setStatus] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async (filter: string, cur?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (filter) params.set("status", filter);
    if (cur) params.set("cursor", cur);

    const result = await api.get(`deliveries?${params}`) as {
      items: Delivery[];
      cursor?: string;
      hasMore: boolean;
    };

    setDeliveries((prev) => cur ? [...prev, ...result.items] : result.items);
    setCursor(result.cursor);
    setHasMore(result.hasMore);
    setLoading(false);
  };

  useEffect(() => { load(status); }, [status]);

  const handleFilterChange = (f: string) => {
    setStatus(f);
    setDeliveries([]);
    setCursor(undefined);
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1>Delivery Log</h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            style={{ fontWeight: status === f.value ? "bold" : "normal" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p>Loading…</p>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "0.5rem" }}>Recipient</th>
            <th style={{ padding: "0.5rem" }}>Subject</th>
            <th style={{ padding: "0.5rem" }}>Status</th>
            <th style={{ padding: "0.5rem" }}>Sent</th>
            <th style={{ padding: "0.5rem" }}>Opened</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => (
            <tr
              key={d.id}
              onClick={() => setSelectedId(selectedId === d.id ? null : d.id)}
              style={{ cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}
            >
              <td style={{ padding: "0.5rem", fontFamily: "monospace", fontSize: "0.85rem" }}>{d.to}</td>
              <td style={{ padding: "0.5rem" }}>{d.subject}</td>
              <td style={{ padding: "0.5rem" }}>
                <span style={{ color: STATUS_COLORS[d.status] ?? "#888", fontWeight: 500 }}>
                  {d.status}
                </span>
              </td>
              <td style={{ padding: "0.5rem", fontSize: "0.85rem" }}>
                {new Date(d.createdAt).toLocaleString()}
              </td>
              <td style={{ padding: "0.5rem", fontSize: "0.85rem" }}>
                {d.openedAt ? new Date(d.openedAt).toLocaleString() : "—"}
              </td>
              {selectedId === d.id && (
                <td colSpan={5} style={{ padding: "0.5rem", background: "#f9fafb", fontSize: "0.8rem", fontFamily: "monospace" }}>
                  Resend ID: {d.resendId}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {hasMore && (
        <button onClick={() => load(status, cursor)} style={{ marginTop: "1rem" }}>
          Load more
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/emdash-resend/src/components/DeliveryLogPage.tsx
git commit -m "feat: add DeliveryLogPage React component"
```

---

## Task 16: ContactsPage.tsx

**Files:**
- Create: `packages/emdash-resend/src/components/ContactsPage.tsx`

- [ ] **Step 1: Write `src/components/ContactsPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { usePluginAPI } from "@emdash-cms/admin";

interface Audience { id: string; name: string }
interface Contact { id: string; email: string; first_name?: string; last_name?: string; unsubscribed: boolean }

export function ContactsPage() {
  const api = usePluginAPI();
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [addForm, setAddForm] = useState({ email: "", firstName: "", lastName: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api.get("audiences").then((r: any) => {
      setAudiences(r.data ?? []);
      if (r.data?.length > 0) setSelectedAudienceId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedAudienceId) return;
    api.get(`audiences/contacts?audienceId=${selectedAudienceId}`).then((r: any) => {
      setContacts(r.data ?? []);
    });
  }, [selectedAudienceId]);

  const handleAdd = async () => {
    if (!addForm.email || !selectedAudienceId) return;
    setAdding(true);
    try {
      await api.post("audiences/contacts/add", {
        audienceId: selectedAudienceId,
        email: addForm.email,
        firstName: addForm.firstName || undefined,
        lastName: addForm.lastName || undefined,
      });
      setAddForm({ email: "", firstName: "", lastName: "" });
      const r = await api.get(`audiences/contacts?audienceId=${selectedAudienceId}`) as any;
      setContacts(r.data ?? []);
    } finally {
      setAdding(false);
    }
  };

  const handleUnsubscribe = async (contactId: string) => {
    await api.post("audiences/contacts/unsubscribe", { audienceId: selectedAudienceId, contactId });
    setContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, unsubscribed: true } : c));
  };

  const handleDelete = async (contactId: string) => {
    await api.post("audiences/contacts/delete", { audienceId: selectedAudienceId, contactId });
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1>Contacts</h1>

      <div style={{ marginBottom: "1.5rem" }}>
        <label>
          Audience:{" "}
          <select value={selectedAudienceId} onChange={(e) => setSelectedAudienceId(e.target.value)}>
            {audiences.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #e5e7eb", borderRadius: 6 }}>
        <h3 style={{ marginTop: 0 }}>Add contact</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input placeholder="Email *" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
          <input placeholder="First name" value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} />
          <input placeholder="Last name" value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} />
          <button onClick={handleAdd} disabled={adding || !addForm.email}>
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "0.5rem" }}>Email</th>
            <th style={{ padding: "0.5rem" }}>Name</th>
            <th style={{ padding: "0.5rem" }}>Status</th>
            <th style={{ padding: "0.5rem" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "0.5rem" }}>{c.email}</td>
              <td style={{ padding: "0.5rem" }}>{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</td>
              <td style={{ padding: "0.5rem", color: c.unsubscribed ? "#dc2626" : "#16a34a" }}>
                {c.unsubscribed ? "Unsubscribed" : "Subscribed"}
              </td>
              <td style={{ padding: "0.5rem", display: "flex", gap: "0.5rem" }}>
                {!c.unsubscribed && (
                  <button onClick={() => handleUnsubscribe(c.id)} style={{ fontSize: "0.8rem" }}>
                    Unsubscribe
                  </button>
                )}
                <button onClick={() => handleDelete(c.id)} style={{ fontSize: "0.8rem", color: "#dc2626" }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/emdash-resend/src/components/ContactsPage.tsx
git commit -m "feat: add ContactsPage React component"
```

---

## Task 17: BroadcastsPage + admin.tsx + Project Integration

**Files:**
- Create: `packages/emdash-resend/src/components/BroadcastsPage.tsx`
- Create: `packages/emdash-resend/src/admin.tsx`
- Modify: `astro.config.mjs` (add resendPlugin)

- [ ] **Step 1: Write `src/components/BroadcastsPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { usePluginAPI } from "@emdash-cms/admin";

interface Broadcast { id: string; name: string; audience_id: string; status: string; created_at: string }
interface Audience { id: string; name: string }

export function BroadcastsPage() {
  const api = usePluginAPI();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [composing, setComposing] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    audienceId: "",
    from: "",
    subject: "",
    html: "",
  });

  useEffect(() => {
    Promise.all([
      api.get("broadcasts"),
      api.get("audiences"),
    ]).then(([bc, aud]: any[]) => {
      setBroadcasts(bc.data ?? []);
      const audList = aud.data ?? [];
      setAudiences(audList);
      if (audList.length > 0) setForm((f) => ({ ...f, audienceId: audList[0].id }));
    });
  }, []);

  const handleCreate = async () => {
    if (!form.audienceId || !form.from || !form.subject) return;
    const result = await api.post("broadcasts/create", form) as { id: string };
    const updated = await api.get("broadcasts") as any;
    setBroadcasts(updated.data ?? []);
    setComposing(false);
    setForm((f) => ({ ...f, name: "", subject: "", html: "" }));
  };

  const handleSend = async (broadcastId: string) => {
    setSending(broadcastId);
    try {
      await api.post("broadcasts/send", { broadcastId });
      const updated = await api.get("broadcasts") as any;
      setBroadcasts(updated.data ?? []);
    } finally {
      setSending(null);
    }
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Broadcasts</h1>
        <button onClick={() => setComposing(true)}>New broadcast</button>
      </div>

      {composing && (
        <div style={{ marginBottom: "2rem", padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Compose broadcast</h2>

          <label style={{ display: "block", marginBottom: "0.75rem" }}>
            Name (optional)
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ display: "block", width: "100%" }} />
          </label>

          <label style={{ display: "block", marginBottom: "0.75rem" }}>
            Audience *
            <select value={form.audienceId} onChange={(e) => setForm({ ...form, audienceId: e.target.value })} style={{ display: "block" }}>
              {audiences.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>

          <label style={{ display: "block", marginBottom: "0.75rem" }}>
            From *
            <input type="email" placeholder="newsletter@example.com" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} style={{ display: "block", width: "100%" }} />
          </label>

          <label style={{ display: "block", marginBottom: "0.75rem" }}>
            Subject *
            <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={{ display: "block", width: "100%" }} />
          </label>

          <label style={{ display: "block", marginBottom: "1rem" }}>
            HTML content
            <textarea
              value={form.html}
              onChange={(e) => setForm({ ...form, html: e.target.value })}
              rows={10}
              style={{ display: "block", width: "100%", fontFamily: "monospace", fontSize: "0.85rem" }}
            />
          </label>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={handleCreate}>Save as draft</button>
            <button onClick={() => setComposing(false)}>Cancel</button>
          </div>
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "0.5rem" }}>Name</th>
            <th style={{ padding: "0.5rem" }}>Status</th>
            <th style={{ padding: "0.5rem" }}>Created</th>
            <th style={{ padding: "0.5rem" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {broadcasts.map((b) => (
            <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "0.5rem" }}>{b.name || <span style={{ color: "#888" }}>Untitled</span>}</td>
              <td style={{ padding: "0.5rem" }}>{b.status}</td>
              <td style={{ padding: "0.5rem", fontSize: "0.85rem" }}>{new Date(b.created_at).toLocaleString()}</td>
              <td style={{ padding: "0.5rem" }}>
                {b.status === "draft" && (
                  <button
                    onClick={() => handleSend(b.id)}
                    disabled={sending === b.id}
                    style={{ fontSize: "0.85rem" }}
                  >
                    {sending === b.id ? "Sending…" : "Send now"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/admin.tsx`**

```tsx
import { SettingsPage } from "./components/SettingsPage.js";
import { DeliveryLogPage } from "./components/DeliveryLogPage.js";
import { ContactsPage } from "./components/ContactsPage.js";
import { BroadcastsPage } from "./components/BroadcastsPage.js";
import { DeliveryStatsWidget } from "./components/DeliveryStatsWidget.js";

export const pages = {
  "/settings": SettingsPage,
  "/deliveries": DeliveryLogPage,
  "/contacts": ContactsPage,
  "/broadcasts": BroadcastsPage,
};

export const widgets = {
  "delivery-stats": DeliveryStatsWidget,
};
```

- [ ] **Step 3: Write `src/components/DeliveryStatsWidget.tsx`**

```tsx
import { useState, useEffect } from "react";
import { usePluginAPI } from "@emdash-cms/admin";

export function DeliveryStatsWidget() {
  const api = usePluginAPI();
  const [stats, setStats] = useState<{ totalSent: number; deliveryRate: number; bounceRate: number } | null>(null);

  useEffect(() => {
    api.get("deliveries/stats").then((s) => setStats(s as any));
  }, []);

  if (!stats) return <div style={{ padding: "1rem" }}>Loading…</div>;

  const deliveryPct = stats.totalSent ? Math.round((stats.deliveryRate / stats.totalSent) * 100) : 0;
  const bouncePct = stats.totalSent ? Math.round((stats.bounceRate / stats.totalSent) * 100) : 0;

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ display: "flex", gap: "1.5rem" }}>
        <div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{stats.totalSent}</div>
          <div style={{ fontSize: "0.75rem", color: "#888" }}>Sent (30d)</div>
        </div>
        <div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#16a34a" }}>{deliveryPct}%</div>
          <div style={{ fontSize: "0.75rem", color: "#888" }}>Delivered</div>
        </div>
        <div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#dc2626" }}>{bouncePct}%</div>
          <div style={{ fontSize: "0.75rem", color: "#888" }}>Bounced</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build the package to verify it compiles**

```bash
cd packages/emdash-resend && pnpm build
```

Expected: no TypeScript errors, `dist/` directory created with `descriptor.js`, `index.js`, `admin.js`

- [ ] **Step 5: Add the plugin to `astro.config.mjs`**

Open `astro.config.mjs`. At the top with other imports, add:
```typescript
import { resendPlugin } from "@frankwrk/emdash-resend";
```

Inside the `emdash({ ... })` call, add `resendPlugin()` to the `plugins` array (not `sandboxed`):
```typescript
emdash({
  plugins: [resendPlugin()],
  // ... existing config
})
```

- [ ] **Step 6: Start dev server and verify plugin loads**

```bash
npx emdash dev
```

Expected: dev server starts without errors. Navigate to `http://localhost:4321/_emdash/admin` and verify:
- "Resend" appears in the plugin list or admin sidebar
- Navigating to `/settings`, `/deliveries`, `/contacts`, `/broadcasts` shows the React components
- Dashboard shows the "Email Delivery" widget

- [ ] **Step 7: Run all tests one final time**

```bash
cd packages/emdash-resend && pnpm test
```

Expected: all tests pass

- [ ] **Step 8: Commit**

```bash
git add packages/emdash-resend/src/components/BroadcastsPage.tsx packages/emdash-resend/src/components/DeliveryStatsWidget.tsx packages/emdash-resend/src/admin.tsx astro.config.mjs
git commit -m "feat: complete @frankwrk/emdash-resend plugin with React admin UI"
```

---

## Self-Review

**Spec coverage check:**
- ✓ `email:deliver` hook with from address resolution
- ✓ Storage collection `deliveries` with indexed fields
- ✓ `plugin:install` / `activate` / `deactivate` lifecycle with webhook registration
- ✓ Settings save triggers webhook auto-registration on first save
- ✓ Svix webhook receiver with signature verification + replay protection
- ✓ All 17 API routes from the spec
- ✓ Delivery log with status badges and cursor pagination
- ✓ Contacts + audiences live from Resend API
- ✓ Broadcasts composer with save-as-draft and send-now
- ✓ Dashboard widget with 3 delivery stats
- ✓ `public: true` on webhook route so Resend can POST to it
- ✓ Raw body read via `ctx.request.text()` for Svix verification (not `ctx.input`)

**Placeholder scan:** None found — all steps contain actual code.

**Type consistency check:**
- `ResendClient` methods used consistently across handlers and tests
- `verifySvixSignature` signature consistent between implementation and tests
- Handler exports from index.ts match imports in all test files
- `ctx.http.fetch.bind(ctx.http)` used uniformly when constructing `ResendClient`
