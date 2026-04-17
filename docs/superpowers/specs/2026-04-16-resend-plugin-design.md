# Resend Email Provider Plugin — Design Spec

**Date:** 2026-04-16
**Package:** `@frankwrk/emdash-resend`
**Status:** Approved, ready for implementation

---

## Overview

A native EmDash plugin that wires Resend as the exclusive email transport. Beyond transactional delivery, it provides a full admin suite — delivery log, contacts and audience management, and a broadcast composer — so users never leave the EmDash admin to manage email.

The plugin follows the same pattern as `@emdash-cms/plugin-forms`: distributed as an npm package, installed with one `astro.config.mjs` change.

---

## Architecture

**Format:** Native (in-process). Required for React admin pages.
**Capabilities:** `email:provide`, `network:fetch`
**Allowed hosts:** `api.resend.com`

### File structure

```
packages/emdash-resend/
├── src/
│   ├── descriptor.ts              # resendPlugin() → PluginDescriptor
│   ├── index.ts                   # definePlugin() — all runtime logic
│   ├── admin.tsx                  # exports { pages, widgets }
│   ├── components/
│   │   ├── SettingsPage.tsx
│   │   ├── DeliveryLogPage.tsx
│   │   ├── ContactsPage.tsx
│   │   └── BroadcastsPage.tsx
│   └── lib/
│       ├── resend.ts              # typed Resend API client (thin fetch wrapper)
│       └── webhook-verify.ts      # Svix signature verification
├── package.json
└── tsconfig.json
```

### Package exports

```json
{
  "exports": {
    ".": "./dist/descriptor.js",
    "./admin": "./dist/admin.js"
  }
}
```

### Installation (consumer)

```typescript
// astro.config.mjs
import { resendPlugin } from "@frankwrk/emdash-resend";

emdash({
  plugins: [resendPlugin()],
})
```

During development, the package lives at `packages/emdash-resend/` and is referenced via `"@frankwrk/emdash-resend": "file:./packages/emdash-resend"` in the root `package.json`.

---

## Storage & Data Model

### KV (settings)

| Key | Value |
|-----|-------|
| `settings:apiKey` | Resend API key (`re_...`) |
| `settings:fromAddress` | Default sender email address |
| `settings:fromName` | Default sender name |
| `settings:webhookId` | Resend webhook ID (used to clean up on deactivate) |
| `settings:webhookSecret` | Svix signing secret (for verifying inbound events) |

### Storage collection: `deliveries`

Indexes: `["status", "createdAt", "to"]`

| Field | Type | Notes |
|-------|------|-------|
| key | string | Resend email ID (`email.id`) |
| `resendId` | string | Duplicate of key for querying |
| `to` | string | Recipient(s), comma-separated if multiple |
| `subject` | string | |
| `status` | string | `sent` → `delivered` / `bounced` / `complained` / `delayed` |
| `openedAt` | string? | ISO timestamp, written on first `email.opened` event |
| `clickedAt` | string? | ISO timestamp, written on first `email.clicked` event |
| `bouncedAt` | string? | ISO timestamp, written on `email.bounced` |
| `createdAt` | string | ISO timestamp at send time |

Contacts, audiences, and broadcasts are not stored locally. All data for those sections is fetched live from Resend's API.

---

## Plugin Lifecycle

### `plugin:install`

Runs once on first installation.

1. Read `settings:apiKey` from KV
2. If an API key is present, call `POST https://api.resend.com/webhooks` to register the receiver endpoint
3. Store the returned `webhook.id` as `settings:webhookId` and `webhook.signing_secret` as `settings:webhookSecret`
4. If no API key is set yet, skip silently — webhook registration is deferred to the first settings save

**Webhook registered for events:** `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.complained`, `email.bounced`, `email.opened`, `email.clicked`

**Webhook receiver URL:**
```
/_emdash/api/plugins/emdash-resend/webhook
```

### `plugin:activate`

Runs when the plugin is re-enabled after deactivation.

1. If `settings:webhookId` exists → skip (already registered)
2. If API key exists but no webhook ID → re-register

### `plugin:deactivate`

Runs when the plugin is disabled.

1. Read `settings:webhookId`
2. Call `DELETE https://api.resend.com/webhooks/:id`
3. Delete `settings:webhookId` from KV (keep the secret in case of re-activation)

### Settings save (special case)

When the user saves their API key for the first time via the settings page, the `settings` POST route checks whether a webhook is registered. If not, it registers one immediately, so the user never has to think about it.

---

## Email Delivery

### `email:deliver` hook

Exclusive. This plugin is the sole email transport.

**From address resolution (priority order):**
1. `event.from` if provided by the calling plugin
2. `"${fromName} <${fromAddress}>"` from KV
3. Neither set → throw a descriptive error

**Field mapping to Resend API:**

| EmDash event field | Resend field |
|---|---|
| `event.from` (resolved above) | `from` |
| `event.to` | `to` |
| `event.subject` | `subject` |
| `event.html` | `html` |
| `event.text` | `text` |
| `event.cc` | `cc` (omitted if absent) |
| `event.bcc` | `bcc` (omitted if absent) |
| `event.replyTo` | `reply_to` (omitted if absent) |
| `event.attachments` | `attachments` (omitted if absent) |
| `event.tags` | `tags` (omitted if absent) |

**After a successful send:**
Write a `deliveries` record with `status: "sent"` and the Resend email ID as the storage key.

**Error handling:**
- `4xx` → throw with Resend's error message (surfaces in EmDash logs and admin)
- `5xx` → throw; EmDash handles retry
- `errorPolicy: "abort"` (default) — a failed send blocks the operation. Correct for transactional email.

---

## Webhook Receiver

**Route:** `POST webhook`
**URL:** `/_emdash/api/plugins/emdash-resend/webhook`
**Auth:** Svix signature verification (not EmDash admin auth)

### Verification

1. Read `settings:webhookSecret` from KV
2. Reconstruct signed payload: `${svix-id}.${svix-timestamp}.${rawBody}`
3. HMAC-SHA256 with base64-decoded secret
4. Compare against each value in `svix-signature` header
5. Reject `401` if no match
6. Reject `401` if `svix-timestamp` is more than 5 minutes old (replay protection)

### Event handling

| Resend event | Storage update |
|---|---|
| `email.sent` | No-op (record already exists) |
| `email.delivered` | `status: "delivered"` |
| `email.delivery_delayed` | `status: "delayed"` |
| `email.bounced` | `status: "bounced"`, write `bouncedAt` |
| `email.complained` | `status: "complained"` |
| `email.opened` | write `openedAt` if not already set |
| `email.clicked` | write `clickedAt` if not already set |

Returns `200` immediately. Resend retries on non-2xx.

### Reliability update (2026-04-17)

- Route handlers now throw `PluginRouteError` for webhook auth/validation failures instead of native `Response`. This prevents EmDash from downgrading expected auth failures into generic `500 INTERNAL_ERROR` responses.
- Webhook processing now **upserts** delivery rows when no existing local record is found, so the Delivery Log page can show webhook-driven events (including emails sent outside the plugin transport path).
- Webhook registration status now requires both `settings:webhookId` and `settings:webhookSecret`; save flow re-registers automatically when the ID exists but the secret is missing.
- Svix signature parsing now accepts broader `svix-signature` header formats (space- or comma-delimited `v1,...` signatures).

---

## Admin Pages

All pages mount under `/_emdash/admin/plugins/emdash-resend/`.

### Settings (`/settings`)

- API key input (masked). Saving triggers webhook auto-registration if this is the first save.
- Default from name and address fields.
- Webhook status indicator: registered ✓ / not registered ✗.
- Manual re-register button (fallback).
- "Send test email" button — sends to the logged-in admin's email, shows success/error inline.

### Delivery Log (`/deliveries`)

- Paginated table: recipient, subject, status badge, sent at, opened at, clicked at.
- Filter bar: all / delivered / bounced / complained / delayed.
- Status badges: delivered (green), bounced (red), complained (amber), delayed (grey).
- Row click shows Resend email ID for cross-reference in Resend's dashboard.

### Contacts (`/contacts`)

- Audience selector (dropdown — all Resend audiences).
- Contacts table for selected audience: email, first/last name, subscribed status.
- Add contact form: email, first name, last name, audience.
- Unsubscribe and delete actions per row.
- All data fetched live from Resend — no local copy.

### Broadcasts (`/broadcasts`)

- List view: name, audience, status, sent count.
- "New broadcast" opens composer:
  - Audience picker
  - From name + address (pre-filled from settings, overridable per broadcast)
  - Subject line
  - HTML rich-text editor (bold, italic, links, headings, lists) with live preview pane
  - Send now / Save as draft
- Draft broadcasts are editable; sent broadcasts are read-only.

### Dashboard widget (`delivery-stats`, size: `"third"`)

Three numbers: emails sent (last 30 days), delivery rate %, bounce rate %. Computed from local `deliveries` storage — no Resend API call.

---

## API Routes

All routes mount at `/_emdash/api/plugins/emdash-resend/<route>`. Admin routes enforce EmDash authentication automatically. The `webhook` route bypasses auth and uses Svix verification instead.

| Route | Purpose |
|-------|---------|
| `GET settings` | Read settings (API key masked) |
| `POST settings` | Save API key, from name/address. Registers webhook on first save. |
| `POST settings/test` | Send test email to admin's address |
| `GET settings/webhook-status` | Check webhook registration in Resend |
| `POST settings/webhook-register` | Manual fallback re-registration |
| `GET deliveries` | Paginated log. Inputs: `status`, `limit`, `cursor` |
| `GET deliveries/stats` | Aggregate counts for dashboard widget |
| `GET audiences` | List Resend audiences |
| `POST audiences` | Create audience |
| `GET audiences/contacts` | List contacts in audience. Inputs: `audienceId`, `cursor` |
| `POST audiences/contacts` | Add contact to audience |
| `POST audiences/contacts/unsubscribe` | Unsubscribe contact |
| `POST audiences/contacts/delete` | Delete contact |
| `GET broadcasts` | List broadcasts from Resend |
| `POST broadcasts` | Create broadcast (draft) |
| `POST broadcasts/send` | Send or schedule broadcast. Input: `broadcastId` |
| `POST webhook` | Inbound Resend webhook receiver (Svix-verified) |

---

## Post-review Hardening (2026-04-17)

The first implementation pass was hardened after a correctness/maintainability review.

1. **Peer compatibility declared explicitly for current stack**
   - Updated `packages/emdash-resend/package.json` peers to:
     - `@emdash-cms/admin:^0.4.0`
     - `emdash:^0.4.0`
     - `react:^19.0.0`
   - Also aligned `@types/react` to `^19.2.0` in plugin dev dependencies.
   - Reasoning: avoid false incompatibility signals and peer resolution failures on this workspace.

2. **Duplicate-send risk reduced on post-send persistence failures**
   - Updated `packages/emdash-resend/src/handlers/deliver.ts` so `ctx.storage.deliveries.put(...)` is best-effort after a successful provider send.
   - On storage failure, the handler logs a warning and does not throw.
   - Reasoning: once Resend accepts the message, throwing on local log-write failures can trigger retries and duplicate outbound emails.

3. **Manual webhook re-register now reconciles existing webhook first**
   - Updated `packages/emdash-resend/src/handlers/settings.ts` (`handleRegisterWebhook`) to:
     - read existing `settings:webhookId`
     - attempt deletion before registering a new webhook
     - continue past "not found" delete responses, but fail on other delete errors
   - Reasoning: repeated manual re-register operations should not leak parallel active webhooks.

4. **Local runtime artifacts are now ignored and removed from VCS**
   - Updated `.gitignore` to exclude:
     - `.wrangler/state`
     - `.claude/settings.local.json`
   - Removed tracked `.wrangler/state/*` files and `.claude/settings.local.json`.
   - Reasoning: these are machine-local/generated files and created non-reproducible commit noise.

5. **Svix replay window now rejects future timestamps**
   - Updated `packages/emdash-resend/src/lib/webhook-verify.ts` to enforce a symmetric ±5 minute skew window (`abs(now - timestamp)`).
   - Reasoning: old-only checks allow attacker-controlled far-future timestamps to bypass freshness checks.

6. **Delivery log table row structure corrected**
   - Updated `packages/emdash-resend/src/components/DeliveryLogPage.tsx` to render expanded detail in a separate `<tr><td colSpan={5}>`.
   - Reasoning: appending an extra `<td>` to the main row produced invalid table structure and inconsistent rendering/accessibility behavior.

7. **Typecheck portability cleanup**
   - Updated handler KV calls to remove invalid generic type arguments on untyped runtime context APIs (`ctx.kv.get<string>(...)` -> `ctx.kv.get(...)`).
   - Updated `packages/emdash-resend/src/lib/webhook-verify.ts` to normalize the HMAC key into an explicitly ArrayBuffer-backed `Uint8Array` before `crypto.subtle.importKey(...)`, satisfying strict DOM WebCrypto typings.
   - Updated `packages/emdash-resend/tests/helpers.ts` with explicit `MockCtx` / `RouteMockCtx` return types and correct `fetchImpl` mock-instance typing.
   - Reasoning: this removes TS2742/TS2322 portability issues and keeps strict `tsc --noEmit` green in workspace installs.

---

## Out of Scope

- Resend dashboard templates (user composes content inline in EmDash)
- Received email (inbound routing)
- Domains and API key management via admin (users manage these in Resend's dashboard)
- Scheduled broadcasts (Resend's broadcast scheduling API, if added later, is a straightforward extension)
