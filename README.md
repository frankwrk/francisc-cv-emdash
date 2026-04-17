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

`pnpm dev` and `pnpm build` run a `predev` / `prebuild` step that compiles the local workspace package `@frankwrk/emdash-resend` first. This ensures its `dist/*` exports exist before Astro loads `astro.config.mjs` in fresh environments (including Cloudflare CI).

## Resend Webhook Notes

- The webhook signing secret is stored in plugin KV as `settings:webhookSecret` when the webhook is registered from plugin settings.
- If Resend webhook calls fail auth, re-register the webhook from the plugin settings so both `webhookId` and `webhookSecret` are refreshed.
- EmDash route handlers receive parsed JSON in `ctx.input`; webhook signature verification in this plugin is performed against that JSON payload representation.

## Resend Plugin Admin UI

- The Resend plugin is exposed as a single Plugins entry: `Resend Email`.
- That page contains top-left tabs for `Delivery Log`, `Contacts`, `Broadcasts`, and `Settings`.
- The active tab is mirrored to `?tab=` in the URL for refresh-safe navigation.

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
