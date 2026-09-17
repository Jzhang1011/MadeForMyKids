# MadeForMyKids shared components

Warm, kid-friendly UI chrome for [www.madeformykids.com](https://www.madeformykids.com).  
Pattern mirrors WealthLanding (`/components/*.js`), with an `mfk-` prefix and coral/slate brand tokens.

**Brand:** MadeForMyKids (never BuildForMyKids).  
**Skills:** Typing, Mac, Math, STEM.  
**Main nav:** Learn, Practice, Games, Parents.

## Approach

**Custom elements** (`<mfk-header>`, `<mfk-activity-card>`, …) register on script load.  
Programmatic helpers live on **`window.MFK`**: `MFK.toast.show()`, `MFK.modal.open()`, `MFK.seo.apply()`, `MFK.load()`, `MFK.loadSiteNav()`.

Paths are site-root relative (`/components/...`, `/data/site-nav.json`) so they work on GitHub Pages for `www.madeformykids.com`.

## Site navigation config (`/data/site-nav.json`)

Single source of truth for header + footer. Both components:

1. `fetch("/data/site-nav.json")`
2. Cache the result in memory (`MFK._siteNav` / shared `MFK.loadSiteNav()`)
3. Fall back to an embedded copy of the same structure if the fetch fails

Shape (abridged):

```json
{
  "brand": "MadeForMyKids",
  "homeHref": "/",
  "main": [
    {"id": "learn", "label": "Learn", "href": "/learn/"},
    {"id": "practice", "label": "Practice", "href": "/practice/"},
    {"id": "games", "label": "Games", "href": "/games/"},
    {"id": "parents", "label": "Parents", "href": "/parents/"}
  ],
  "footer": {
    "learn": [{ "label": "Typing", "href": "/typing.html" }],
    "parents": [{ "label": "About", "href": "/parents/about/" }],
    "resources": [{ "label": "Blog", "href": "/blog/" }],
    "legal": [{ "label": "Privacy", "href": "/privacy/" }]
  },
  "search": { "enabled": true, "placeholder": "Search skills & activities" },
  "parentArea": { "label": "Parents", "href": "/parents/" }
}
```

Do **not** hard-code nav labels in pages — edit `site-nav.json` (or the embedded fallback inside `header.js` / `footer.js` if you change the default structure).

Category hubs (`/learn/`, `/practice/`, `/games/`, `/parents/`, …) may 404 until content lands; live activities today include `/typing.html` and `/amc/`.

## Quick start (header + footer)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Page — MadeForMyKids</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/components/theme.css" />
</head>
<body class="mfk-page">
  <mfk-header active="home"></mfk-header>

  <main class="mfk-container mfk-section">
    <!-- page content -->
  </main>

  <mfk-footer></mfk-footer>

  <script src="/components/header.js"></script>
  <script src="/components/footer.js"></script>
</body>
</html>
```

### One-shot loader

```html
<script
  src="/components/load.js"
  data-mfk-active="learn"
  data-mfk-extras="pageHero,activityCard,parentNote,seo,toast,breadcrumbs"
></script>
```

`load.js` injects `theme.css` plus core chrome (`header`, `footer`, `button`, `toast`, `modal`) and any listed extras.

## Header behavior (`<mfk-header>`)

| Attribute | Values |
|-----------|--------|
| `brand` | Defaults to config / `MadeForMyKids` |
| `active` | `home` \| `learn` \| `practice` \| `games` \| `parents` (matches main item `id`) |

Renders:

- Logo + brand → `homeHref`
- Primary nav from `main[]`
- Search form (when `search.enabled`) → navigates to `/search/?q=…`
- Parents area CTA from `parentArea`
- Accessible mobile menu (`aria-expanded`, `aria-controls`) mirroring primary nav

Search UI never hard-codes destinations beyond the stub `/search/` page.

## Footer behavior (`<mfk-footer>`)

| Attribute | Values |
|-----------|--------|
| `brand` | Defaults to config / `MadeForMyKids` |

Renders sitemap columns from `footer.learn`, `footer.parents`, `footer.resources`, plus a legal row (`Privacy` / `Terms` / `Contact`), short mission copy, and the education disclaimer.

## Design tokens

See `theme.css`:

| Token | Role |
|--------|------|
| `--mfk-coral` (`#ff7d26`) | Primary actions / brand |
| `--mfk-slate` (`#1e293b`) | Text / footer |
| `--mfk-cream` | Page background |
| `--mfk-font-display` | Fredoka |
| `--mfk-font-body` | Inter / system |

Tailwind via CDN is optional. Components ship scoped Shadow DOM CSS and look good without Tailwind.

## Component reference

### Chrome

| Element | Key attributes / API |
|---------|----------------------|
| `<mfk-header>` | `brand`, `active` = `home` \| `learn` \| `practice` \| `games` \| `parents` |
| `<mfk-footer>` | `brand` |
| `<mfk-navigation>` | `label`, `active`, `data-items='[{"label":"…","href":"#"}]'` |
| `<mfk-breadcrumbs>` | `data-items='[{"label":"Home","href":"/"},{"label":"Typing"}]'` |

### Content

| Element | Key attributes |
|---------|----------------|
| `<mfk-page-hero>` | `title`, `subtitle`, `badge`, `cta-label`, `cta-href`, `cta2-label`, `cta2-href` |
| `<mfk-activity-card>` | `icon`, `title`, `blurb`, `href`, `tags` (comma-separated) |
| `<mfk-lesson-card>` | `title`, `duration`, `skill`, `href`, `progress` (0–100) |
| `<mfk-related-activities>` | `title`, `columns="3"`, optional `data-items` JSON; or nest `<mfk-activity-card>` children |
| `<mfk-parent-note>` | `title`, `body` — or default slot for HTML body |

### Indicators & controls

| Element | Key attributes / API |
|---------|----------------------|
| `<mfk-progress-bar>` | `value`, `label`, `show-percent` |
| `<mfk-skill-badge>` | `skill`, `variant` = `typing` \| `math` \| `reading` \| `science` \| `default` |
| `<mfk-difficulty-badge>` | `level` = `Easy` \| `Medium` \| `Hard`, `ages` |
| `<mfk-button>` | `variant` = `primary` \| `secondary` \| `ghost`, `size` = `sm` \| `md` \| `lg`, `href`, `disabled` |

### Overlays & helpers

```html
<mfk-modal id="help" title="How practice works">
  <p>Short sessions beat long grind. Celebrate effort.</p>
</mfk-modal>
<script>
  MFK.modal.open('#help');
</script>
```

```js
MFK.toast.show({ message: 'Lesson saved!', type: 'success' }); // success|error|info|warning
```

```html
<mfk-feedback storage-key="mfk-fb-typing" prompt="Was this practice helpful?"></mfk-feedback>
```

```html
<mfk-seo
  title="MadeForMyKids — practice that helps kids thrive"
  description="Typing, AMC math, and more — practice that builds confidence."
  canonical="https://www.madeformykids.com/"
></mfk-seo>
```

```js
MFK.seo.apply({
  title: '…',
  description: '…',
  canonical: 'https://www.madeformykids.com/typing.html',
});
```

## Accessibility

- Focus-visible rings use coral outline  
- Header mobile menu: `aria-expanded` / `aria-controls`  
- Modal: `role="dialog"`, Escape to close, backdrop click  
- Progress bars expose `role="progressbar"` and valuemin/max/now  
- Toast host uses `aria-live="polite"`  
- Search forms use `role="search"` and visible/hidden labels  

## Copy into the GitHub repo

From this folder (`MadeForMyKids-components/`), copy into repo root `jzhang1011/MadeForMyKids`:

```text
components/   →  repo/components/
data/         →  repo/data/
index.html    →  repo/index.html   (hub)
learn/ practice/ games/ parents/ search/  →  matching stubs (optional)
```

Do **not** overwrite `typing.html` or `amc/` unless you only need hub links (already point to `/typing.html` and `/amc/`).  
No kids' full names on public pages.

## Kids & mission

An education site to help kids thrive in subjects they need help with — not a money-first product.
