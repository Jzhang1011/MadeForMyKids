# madeformykids-landing Worker (two sites, split by hostname)

`src/worker.js` routes by hostname:

| Host | Serves |
|---|---|
| `madeformyfamily.com` | Family Board marketing pages from `public/`: `/`, `/guides/`, `/visual-guidance/`, `/visual-schedules/`. Any other path → 301 to the same path on `www.madeformykids.com`. |
| `www.madeformyfamily.com` | 301 → apex (separate Worker in `www-redirect/`, custom domain). |
| `madeformykids.com`, `www.madeformykids.com` | Kids learning portal + `/ski/`, proxied from GitHub Pages (`private.madeformykids.com`, the repo root). Family Board paths → 301 to `madeformyfamily.com`. `/landing/*` → 404. |

The Family Board app itself is a separate deployment at `family.madeformyfamily.com`.

Canonical tags: Family Board pages → `https://madeformyfamily.com/...`; learning portal and ski → `https://www.madeformykids.com/...`.

## Deploy

Routes/custom domains for this Worker are managed in the Cloudflare dashboard and intentionally
not listed in `wrangler.toml`, so a deploy leaves them untouched.

```bash
# wrangler needs a node_modules dir somewhere above the project; deploy from a temp copy:
rm -rf /tmp/landing-deploy && cp -R landing /tmp/landing-deploy && mkdir -p /tmp/landing-deploy/node_modules
cd /tmp/landing-deploy && npx wrangler@4 deploy
# www redirect (only needed if it changes):
cd /tmp/landing-deploy/www-redirect && npx wrangler@4 deploy
```

Adding a new Family Board page: put it under `public/<name>/` and add `/<name>` to `FAMILY_PREFIXES` in `src/worker.js`.
