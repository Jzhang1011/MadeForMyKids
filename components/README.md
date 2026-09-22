# MadeForMyKids shared components

Warm, kid-friendly UI chrome for [www.madeformykids.com](https://www.madeformykids.com).  
Pattern mirrors WealthLanding (`/components/*.js`), with an `mfk-` prefix and coral/slate brand tokens.

**Brand:** MadeForMyKids (never BuildForMyKids).  
**Skills (locked):** `typing` | `mac` | `math` | `stem` → ⌨️ Typing, 💻 Mac, 🧮 Math, 🔬 STEM.  
**Difficulty (locked):** `beginner` | `intermediate` | `advanced` | `challenge`  
→ labels **Beginner, Intermediate, Advanced, Challenge** (do **not** use Easy/Medium/Hard as the primary site vocabulary).  
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


## Activity pages (required chrome)

Every activity page (Typing, AMC, future Mac/STEM games) **must** include:

1. Fredoka + Inter fonts
2. `/components/theme.css`
3. `<mfk-header active="…">` (use a main-nav id: `learn` | `practice` | `games` | `parents`)
4. `<mfk-footer>`
5. Scripts: `/components/header.js` + `/components/footer.js`

**Do not invent page-local site headers** (no competing brand bars like “OlympiadForge” or “Fox’s Adventure” as site identity). Keep unique activity UIs, but demote game-only chrome to a toolbar / intro inside `<main>`.

For full-bleed games that need the remaining viewport:

```html
<body class="mfk-page mfk-activity-shell mfk-activity-fixed">
  <mfk-header active="practice"></mfk-header>
  <main class="mfk-activity-main">…game…</main>
  <mfk-footer></mfk-footer>
</body>
```

Utility classes (in `theme.css`): `.mfk-activity-shell`, `.mfk-activity-main`, `.mfk-activity-fixed`.

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
| `<mfk-activity-card>` | `skill`, `title`, `blurb`, `difficulty`, `duration`, `href`, `cta-label` (default `Start`); optional `icon` override; legacy `tags` |
| `<mfk-lesson-card>` | `skill`, `title`, `blurb`, `duration`, `href`, `cta-label` (default `Learn`); optional `icon`, `progress` (0–100) |
| `<mfk-related-activities>` | `title`, `columns="3"`, optional `data-items` JSON; or nest `<mfk-activity-card>` children |
| `<mfk-parent-note>` | `title`, `summary`, `skill`, `minutes`, `next`, `body` — or default slot for HTML body |

### Indicators & controls

| Element | Key attributes / API |
|---------|----------------------|
| `<mfk-progress-bar>` | `value`, `label`, `show-percent` |
| `<mfk-skill-badge>` | `skill` = `typing` \| `mac` \| `math` \| `stem` (display-name aliases ok); optional `icon` override |
| `<mfk-difficulty-badge>` | `level` = `beginner` \| `intermediate` \| `advanced` \| `challenge` (case-insensitive aliases ok, including legacy Easy/Medium/Hard); optional `ages` |
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

### Feedback: site thumbs vs activity states

| Element | Purpose |
|---------|---------|
| `<mfk-feedback>` (`feedback.js`) | Site thumbs + optional comment (localStorage). Use on hub / parent pages. |
| `<mfk-activity-feedback>` (`activityFeedback.js`) | In-activity states: **Correct** / **Incorrect** / **Completed** / **Hint**. |

```html
<mfk-activity-feedback state="correct" message="Nice — keep going!"></mfk-activity-feedback>
<script src="/components/activityFeedback.js"></script>
<script>
  MFK.activityFeedback.show({ state: 'hint', message: 'Try the home row first.' });
</script>
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


## Difficulty & skill vocabulary

Site-wide enums. Cards and badges should only **display** the locked labels.

### Difficulty

| Value | Label | Notes |
|-------|-------|-------|
| `beginner` | Beginner | Legacy alias: `easy` |
| `intermediate` | Intermediate | Legacy alias: `medium` |
| `advanced` | Advanced | Legacy alias: `hard` |
| `challenge` | Challenge | Stretch / contest pace |

Helpers (after `difficultyBadge.js` loads):

```js
MFK.difficulty.normalize("Easy"); // "beginner"
MFK.difficulty.label("challenge"); // "Challenge"
```

```html
<mfk-difficulty-badge level="beginner" ages="6+"></mfk-difficulty-badge>
<mfk-difficulty-badge level="challenge"></mfk-difficulty-badge>
```

### Skills

| Value | Label | Default icon |
|-------|-------|----------------|
| `typing` | Typing | ⌨️ |
| `mac` | Mac | 💻 |
| `math` | Math | 🧮 |
| `stem` | STEM | 🔬 |

Helpers (after `skillBadge.js` loads):

```js
MFK.skill.normalize("AMC"); // "math"
MFK.skill.label("mac");     // "Mac"
MFK.skill.icon("stem");     // "🔬"
```

```html
<mfk-skill-badge skill="typing"></mfk-skill-badge>
<mfk-skill-badge skill="mac" icon="🍏"></mfk-skill-badge>
```

Theme tokens in `theme.css`: `--mfk-beginner` / `--mfk-beginner-bg` (and intermediate, advanced, challenge) plus `--mfk-skill-typing` / `--mfk-skill-typing-bg` (and mac, math, stem).

### Activity card

Layout: skill badge → title → blurb → difficulty + duration row → CTA (default **Start**).

```html
<mfk-activity-card
  skill="typing"
  title="Fox Typing Adventure"
  blurb="Guided typing practice with a friendly fox."
  difficulty="beginner"
  duration="10 min"
  href="/typing.html"
  cta-label="Start"
></mfk-activity-card>
```

Optional `icon` overrides the skill’s default glyph. Legacy `tags="Typing, Ages 6+"` still renders as soft pills **only when** `skill` and `difficulty` are omitted (home-page backward compat).

### Lesson card

Layout: skill badge → title → blurb → duration + CTA (default **Learn**) → optional progress.

```html
<mfk-lesson-card
  skill="math"
  title="Contest warm-up set"
  blurb="A handful of AMC-style problems."
  duration="12 min"
  href="/amc/"
  progress="40"
  cta-label="Learn"
></mfk-lesson-card>
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

This cumulative pack includes unified `typing.html` and `amc/index.html` (shared MFK header/footer).  
**Do not** bundle `amc_master_dataset.json` in the archive — it lives on GitHub next to `amc/index.html` and is fetched at runtime.  
No kids' full names on public pages.

## Kids & mission

An education site to help kids thrive in subjects they need help with — not a money-first product.
