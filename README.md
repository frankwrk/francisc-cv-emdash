# EmDash Blog Template (Cloudflare)

A clean, minimal blog built with [EmDash](https://github.com/emdash-cms/emdash) and deployed on Cloudflare Workers with D1 and R2.

## What's Included

- Featured post hero on the homepage
- Post archive with reading time estimates
- Category and tag archives
- Full-text search
- RSS feed
- SEO metadata and JSON-LD
- Dark/light mode
- Forms plugin and webhook notifier

## Pages

| Page             | Route             |
| ---------------- | ----------------- |
| Homepage         | `/`               |
| All posts        | `/posts`          |
| Single post      | `/posts/:slug`    |
| Category archive | `/category/:slug` |
| Tag archive      | `/tag/:slug`      |
| Search           | `/search`         |
| Static pages     | `/pages/:slug`    |
| 404              | fallback          |

## Screenshots

|       | Desktop                                                                                                                                     | Mobile                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Light | ![homepage light desktop](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-light-desktop.jpg) | ![homepage light mobile](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-light-mobile.jpg) |
| Dark  | ![homepage dark desktop](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-dark-desktop.jpg)   | ![homepage dark mobile](https://raw.githubusercontent.com/emdash-cms/emdash/main/assets/templates/blog/latest/homepage-dark-mobile.jpg)   |

## Infrastructure

- **Runtime:** Cloudflare Workers
- **Database:** D1
- **Storage:** R2
- **Framework:** Astro with `@astrojs/cloudflare`

## Local Development

```bash
pnpm install
pnpm bootstrap
pnpm dev
```

`pnpm dev` and `pnpm build` run a `predev` / `prebuild` step that compiles the local workspace package `@frankwrk/emdash-email` first. This ensures its `dist/*` exports exist before Astro loads `astro.config.mjs` in fresh environments (including Cloudflare CI).

## Email Provider Architecture Notes

- The site now uses `@frankwrk/emdash-email` as the primary plugin package (provider-agnostic).
- Runtime/plugin compatibility is intentionally preserved with plugin ID `emdash-resend` and existing route namespaces so existing data and installed plugin links continue to work.
- `@frankwrk/emdash-resend` remains as a compatibility shim package that re-exports `@frankwrk/emdash-email`.

## Resend Webhook Notes

- The webhook signing secret is stored in plugin KV as `settings:webhookSecret` when the webhook is registered from plugin settings.
- If Resend webhook calls fail auth, re-register the webhook from the plugin settings so both `webhookId` and `webhookSecret` are refreshed.
- EmDash route handlers receive parsed JSON in `ctx.input`; webhook signature verification in this plugin is performed against that JSON payload representation.

## Email Providers Admin UI

- The plugin is exposed as a single Plugins entry: `Email Providers`.
- That page contains top-left tabs for `Delivery Log`, `Contacts`, `Broadcasts`, and `Settings`.
- The active tab is mirrored to `?tab=` in the URL for refresh-safe navigation.
- The tab shell and page controls are built from plugin-local shadcn-style primitives (`Button`, `Card`, `Input`, `Select`, `Textarea`, `Badge`, `Table`, `Notice`) in `packages/emdash-email/src/components/ui.tsx`.
- Styling is scoped in `packages/emdash-email/src/components/resend-admin-styles.tsx` so plugin UI updates do not leak into the site theme.
- Complete design pass notes:
  - Upgraded typography/spacing hierarchy and state styling for a professional CMS plugin surface.
  - Added per-page metric summaries for faster operational scanning (deliverability, contacts, broadcasts, setup readiness).
  - Added accessibility-focused tab semantics (`tablist` / `tab` / `tabpanel`) for keyboard/screen-reader clarity.
- Page details retained from the original workflow:
  - `Delivery Log`: status filters, provider-aware message ID row, open timestamp column.
  - `Contacts`: audience selector, inline add-contact form, unsubscribe/delete actions.
  - `Broadcasts`: compose panel, draft table, per-row send action.
  - `Settings`: provider selector, provider-specific config cards, test email, provider-specific operational checks/actions.
- Settings UX behavior:
  - Changing provider persists immediately (the selector writes `settings:provider` via `settings/save`), so refreshes keep the selected provider.
  - Provider panels are conditional: Resend-only sections are hidden when Cloudflare is active, and Cloudflare checklist/worker sections are hidden when Resend is active.

## Cloudflare Email Provider Setup

- Authentication modes supported:
  - API token (default): set API token/key field only.
  - Global API key: set API token/key field to your Global API key and also fill `Auth email`.
- Reason for this distinction: Cloudflare API tokens use `Authorization: Bearer ...`, while Global API keys require `X-Auth-Email` + `X-Auth-Key`.
- Minimum required fields for sending: API credential (token or key), Account ID, and sender email (`fromAddress`).
- For inbound/routing workflows and worker setup, also set: Zone ID, sending domain, route address, destination address, worker name, and optional `sendEmailBindingName`.
- Use the Settings page actions:
  - `Refresh checklist` to re-run readiness diagnostics.
  - `Create or update Email Worker` to provision/update worker script and routing rule in one flow.
- Worker status checks now treat "worker does not exist yet" as an expected not-provisioned state (not a hard API error), and show a provisioning-focused reason message instead.

## Git Hygiene

This repository should not track local runtime state, generated artifacts, or secrets.

- Ignored by default:
  - dependencies/build: `node_modules/`, `dist/`, `coverage/`, `*.tsbuildinfo`
  - local runtime data: `.astro/`, `.wrangler/`, `uploads/`, `data.db*`
  - local agent/tooling files: `.agents/`, `.claude/`, `.impeccable.md`, `AGENTS.md`, `CLAUDE.md`, `docs/`
  - secrets/local env: `.env*`, `.dev.vars*`, `dev.vars` (except `.env.example`)
  - noise: `*.log`, `.DS_Store`
- If files were tracked before these rules, untrack once:

```bash
git rm -r --cached .wrangler
```

Then commit the `.gitignore` update.

## Deploying

```bash
pnpm deploy
```

Or click the deploy button above to set up the project in your Cloudflare account.

## See Also

- [Node.js variant](../blog) -- same template using SQLite and local file storage
- [All templates](../)
- [EmDash documentation](https://github.com/emdash-cms/emdash/tree/main/docs)
