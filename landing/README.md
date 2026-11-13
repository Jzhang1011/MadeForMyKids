# madeformykids.com landing page (Cloudflare Worker)

The marketing front door for Family Board, served at madeformykids.com
(apex) and www.madeformykids.com via the `madeformykids-landing` Worker
(assets-only). The learning site lives at private.madeformykids.com
(GitHub Pages, from this same repo).

## Deploy

```bash
cd landing
python3 ~/workspace/family-board-v2/scripts/run-wrangler.py deploy
```

## Contents

- `public/index.html` — the landing page
- `public/visual-schedules/` — the visual-schedules article and its images
- `wrangler.toml` — Worker config (`[assets] directory = "./public"`)
