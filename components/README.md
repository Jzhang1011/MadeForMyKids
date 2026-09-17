# MadeForMyKids shared components

Warm, kid-friendly UI chrome for [www.madeformykids.com](https://www.madeformykids.com).  
Pattern mirrors WealthLanding (`/components/*.js`), with an `mfk-` prefix and coral/slate brand tokens.

## Approach

**Custom elements** (`<mfk-header>`, `<mfk-activity-card>`, …) register on script load.  
Programmatic helpers live on **`window.MFK`**: `MFK.toast.show()`, `MFK.modal.open()`, `MFK.seo.apply()`, `MFK.load()`.

Paths are site-root relative (`/components/...`) so they work on GitHub Pages for `www.madeformykids.com`.

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
  data-mfk-active="typing"
  data-mfk-extras="pageHero,activityCard,parentNote,seo,toast,breadcrumbs"
></script>
```

`load.js` injects `theme.css` plus core chrome (`header`, `footer`, `button`, `toast`, `modal`) and any listed extras.

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
| `<mfk-header>` | `brand`, `active` = `home` \| `typing` \| `amc` |
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
  // or document.querySelector('#help').open()
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

## Copy into the GitHub repo

From this folder (`MadeForMyKids-components/`), copy into repo root `jzhang1011/MadeForMyKids`:

```text
components/   →  repo/components/
index.html    →  repo/index.html   (replaces empty hub)
```

Do **not** overwrite `typing.html` or `amc/` unless you only need hub links (already point to `/typing.html` and `/amc/`).

## Kids & mission

An education site to help kids thrive in subjects they need help with — not a money-first product.
