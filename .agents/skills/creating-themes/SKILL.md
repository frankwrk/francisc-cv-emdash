# Creating EmDash Themes

An EmDash theme is a complete Astro site — pages, layouts, components, styles — plus a seed file that bootstraps the database on first run. There is no theme API or abstraction layer. You build a real site and ship it as a template.

## Key Rules (never violate these)

- **All content pages must be server-rendered.** Never use `getStaticPaths()` or `export const prerender = true` on pages that display EmDash content. Content changes at runtime through the admin UI.
- **No hard-coded content.** Site title, tagline, and navigation come from the CMS via `getSiteSettings()` and `getMenu()` — never from template strings.
- **Image fields are objects, not strings.** Access as `{ src, alt }`. Use `<Image image={...} />` from `emdash/ui` for optimized rendering.
- **Taxonomy names in queries must match the seed's `"name"` field exactly** (e.g. `"category"` not `"categories"`).
- **Always call `Astro.cache.set(cacheHint)`** on pages that query content.
- **`entry.id` is the slug** (for URLs). **`entry.data.id` is the database ULID** (for API calls like `getEntryTerms`).

---

## Project Structure

```
my-emdash-theme/
├── package.json              # Theme metadata — must include "emdash" field
├── astro.config.mjs          # Astro + EmDash configuration
├── src/
│   ├── live.config.ts        # Live Collections setup (boilerplate, don't modify)
│   ├── pages/
│   │   ├── index.astro       # Homepage
│   │   ├── [...slug].astro   # Pages catch-all (about → /about)
│   │   ├── posts/
│   │   │   ├── index.astro   # Post archive
│   │   │   └── [slug].astro  # Single post
│   │   ├── categories/
│   │   │   └── [slug].astro  # Category archive
│   │   ├── tags/
│   │   │   └── [slug].astro  # Tag archive
│   │   ├── search.astro      # Search page
│   │   └── 404.astro         # Not found
│   ├── layouts/
│   │   └── Base.astro        # Base layout
│   └── components/           # UI components
├── .emdash/
│   ├── seed.json             # Schema + sample content
│   └── uploads/              # Local media files for sample content
└── public/                   # Static assets
```

**Route conventions:**
- `pages` collection → `[...slug].astro` catch-all at the root (slug `about` → `/about`)
- `posts` collection → `posts/[slug].astro`
- Category taxonomy → `categories/[slug].astro`
- Tag taxonomy → `tags/[slug].astro`

---

## package.json — Required `emdash` Field

```json
{
  "name": "@your-org/emdash-theme-blog",
  "version": "1.0.0",
  "description": "A minimal blog theme for EmDash",
  "keywords": ["astro-template", "emdash", "blog"],
  "emdash": {
    "label": "Minimal Blog",
    "description": "A clean blog theme with posts, pages, and categories",
    "seed": ".emdash/seed.json",
    "preview": "https://demo.example.com"
  }
}
```

| Field | Description |
|-------|-------------|
| `emdash.label` | Display name shown in theme pickers |
| `emdash.description` | Brief description |
| `emdash.seed` | Path to the seed file |
| `emdash.preview` | URL to a live demo (optional) |

---

## Seed File Format

Location: `.emdash/seed.json`

```json
{
  "$schema": "https://emdashcms.com/seed.schema.json",
  "version": "1",
  "meta": {
    "name": "My Theme",
    "description": "...",
    "author": "Your Name"
  },
  "settings": {
    "title": "My Site",
    "tagline": "A modern CMS",
    "postsPerPage": 10
  },
  "collections": [],
  "taxonomies": [],
  "bylines": [],
  "menus": [],
  "redirects": [],
  "widgetAreas": [],
  "sections": [],
  "content": {}
}
```

### Field Types

| Type | Description | Stored As |
|------|-------------|-----------|
| `string` | Short text | TEXT |
| `text` | Long text (textarea) | TEXT |
| `number` | Numeric value | REAL |
| `integer` | Whole number | INTEGER |
| `boolean` | True/false | INTEGER |
| `date` | Date (ISO 8601) | TEXT |
| `datetime` | Date and time (ISO 8601) | TEXT |
| `email` | Email address | TEXT |
| `url` | URL | TEXT |
| `slug` | URL-safe string | TEXT |
| `portableText` | Rich text content | JSON |
| `image` | Image reference `{ src, alt }` | JSON |
| `file` | File reference | JSON |
| `json` | Arbitrary JSON | JSON |
| `reference` | Reference to another entry | TEXT |

### Collection Definition

```json
{
  "collections": [
    {
      "slug": "posts",
      "label": "Posts",
      "labelSingular": "Post",
      "description": "Blog posts",
      "icon": "file-text",
      "supports": ["drafts", "revisions", "search", "seo"],
      "commentsEnabled": true,
      "fields": [
        { "slug": "title", "label": "Title", "type": "string", "required": true, "searchable": true },
        { "slug": "featured_image", "label": "Featured Image", "type": "image" },
        { "slug": "excerpt", "label": "Excerpt", "type": "text" },
        { "slug": "content", "label": "Content", "type": "portableText", "searchable": true }
      ]
    }
  ]
}
```

**`supports` values:** `"drafts"`, `"revisions"`, `"search"`, `"seo"`, `"comments"`

### Taxonomy Definition

```json
{
  "taxonomies": [
    {
      "name": "category",
      "label": "Categories",
      "labelSingular": "Category",
      "hierarchical": true,
      "collections": ["posts"],
      "terms": [
        { "slug": "development", "label": "Development" },
        { "slug": "design", "label": "Design" }
      ]
    },
    {
      "name": "tag",
      "label": "Tags",
      "labelSingular": "Tag",
      "hierarchical": false,
      "collections": ["posts"],
      "terms": []
    }
  ]
}
```

### Menu Definition

```json
{
  "menus": [
    {
      "name": "primary",
      "label": "Primary Navigation",
      "items": [
        { "label": "Home", "url": "/" },
        { "label": "Posts", "url": "/posts" },
        { "label": "About", "url": "/about" }
      ]
    },
    {
      "name": "footer",
      "label": "Footer Navigation",
      "items": []
    }
  ]
}
```

### Widget Areas

```json
{
  "widgetAreas": [
    {
      "name": "sidebar",
      "label": "Sidebar",
      "description": "Main sidebar widget area",
      "widgets": [
        {
          "type": "component",
          "componentId": "core:recent-posts",
          "title": "Recent Posts",
          "settings": { "limit": 5 }
        },
        {
          "type": "component",
          "componentId": "core:archives",
          "title": "Archives",
          "settings": { "type": "monthly", "limit": 6 }
        }
      ]
    }
  ]
}
```

### Sample Content

```json
{
  "content": {
    "pages": [
      {
        "id": "about",
        "slug": "about",
        "status": "published",
        "data": {
          "title": "About",
          "content": [
            {
              "_type": "block",
              "style": "normal",
              "children": [{ "_type": "span", "text": "About page content here." }]
            }
          ]
        }
      }
    ],
    "posts": [
      {
        "id": "hello-world",
        "slug": "hello-world",
        "status": "published",
        "data": {
          "title": "Hello World",
          "excerpt": "First post excerpt.",
          "featured_image": {
            "$media": {
              "url": "https://images.unsplash.com/photo-...?w=1200&h=800&fit=crop",
              "alt": "Description",
              "filename": "hello-world.jpg"
            }
          },
          "content": [
            {
              "_type": "block",
              "style": "normal",
              "children": [{ "_type": "span", "text": "Post content here." }]
            }
          ]
        }
      }
    ]
  }
}
```

**Local media:** Place files in `.emdash/uploads/` and reference with a relative path instead of a URL:
```json
{ "$media": { "url": ".emdash/uploads/hero.jpg", "alt": "Hero image", "filename": "hero.jpg" } }
```

---

## Astro Pages — Common Patterns

### Base Layout (`src/layouts/Base.astro`)

```astro
---
import { getSiteSettings, getMenu } from "emdash";
import { EmDashHead, EmDashBodyStart, EmDashBodyEnd, WidgetArea } from "emdash/ui";

const settings = await getSiteSettings();
const menu = await getMenu("primary");
const { title, description } = Astro.props;
const fullTitle = title ? `${title} — ${settings.title}` : settings.title;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{fullTitle}</title>
    <EmDashHead />
  </head>
  <body>
    <EmDashBodyStart />
    <header>
      <a href="/">{settings.title}</a>
      <nav>
        {menu?.items.map(item => <a href={item.url}>{item.label}</a>)}
      </nav>
    </header>
    <main><slot /></main>
    <footer>...</footer>
    <EmDashBodyEnd />
  </body>
</html>
```

### Single Post (`src/pages/posts/[slug].astro`)

```astro
---
import { getEmDashEntry, getSeoMeta } from "emdash";
import { PortableText, Image } from "emdash/ui";
import Base from "../../layouts/Base.astro";

const { slug } = Astro.params;
const { entry, cacheHint } = await getEmDashEntry("posts", slug!);
if (!entry) return Astro.redirect("/404");

Astro.cache.set(cacheHint);
const seo = await getSeoMeta(entry, { Astro });
---
<Base title={seo.title} description={seo.description}>
  <article>
    {entry.data.featured_image && <Image image={entry.data.featured_image} />}
    <h1>{entry.data.title}</h1>
    <PortableText value={entry.data.content} />
  </article>
</Base>
```

### Post Archive (`src/pages/posts/index.astro`)

```astro
---
import { getEmDashCollection } from "emdash";
import Base from "../../layouts/Base.astro";

const { entries, cacheHint } = await getEmDashCollection("posts", {
  where: { status: "published" },
  orderBy: { publishedAt: "desc" },
  limit: 10,
});
Astro.cache.set(cacheHint);
---
<Base title="Posts">
  {entries.map(entry => (
    <article>
      <a href={`/posts/${entry.id}`}>{entry.data.title}</a>
    </article>
  ))}
</Base>
```

### Pages Catch-all (`src/pages/[...slug].astro`)

```astro
---
import { getEmDashEntry } from "emdash";
import { PortableText } from "emdash/ui";
import Base from "../layouts/Base.astro";

const slug = Astro.params.slug || "home";
const { entry, cacheHint } = await getEmDashEntry("pages", slug);
if (!entry) return Astro.redirect("/404");

Astro.cache.set(cacheHint);
---
<Base title={entry.data.title}>
  <PortableText value={entry.data.content} />
</Base>
```

---

## live.config.ts (boilerplate — never modify)

```typescript
import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};
```

---

## Completion Checklist

- [ ] `package.json` with `emdash` field (`label`, `description`, `seed`)
- [ ] `.emdash/seed.json` with valid schema
- [ ] All collections referenced in pages exist in the seed
- [ ] Menus used in layouts are defined in the seed
- [ ] Sample content demonstrates the theme design
- [ ] `astro.config.mjs` with database and storage configuration
- [ ] `src/live.config.ts` with EmDash loader (unmodified boilerplate)
- [ ] No `getStaticPaths()` on content pages
- [ ] No `export const prerender = true` on content pages
- [ ] No hard-coded site title, tagline, or navigation
- [ ] Image fields accessed as objects (`image.src`), not strings
- [ ] `Astro.cache.set(cacheHint)` called on every content page
- [ ] `entry.id` used for slugs/URLs, `entry.data.id` used for API calls
- [ ] Taxonomy query names match seed `"name"` field exactly
- [ ] README with setup instructions

---

## Distributing a Theme

Themes are distributed as Astro templates via `create-astro`:

```bash
# Official template
npm create astro@latest -- --template @emdash-cms/template-blog

# GitHub template
npm create astro@latest -- --template github:your-org/emdash-theme-name
```

To publish, push to GitHub and tag releases. Users clone it with the `--template` flag. The Setup Wizard runs automatically on first admin visit, applying the seed file.
