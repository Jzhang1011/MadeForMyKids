# followthepowder Worker

Serves SkiDay at https://followthepowder.com (apex canonical).

- `www.followthepowder.com/*` → 301 `https://followthepowder.com/*` (query kept)
- `/api/*` → `ski-data` Worker via service binding `SKI_DATA_SVC` (data API, event counter, `/api/stats.html`)
- everything else → GitHub Pages `https://private.madeformykids.com/ski/<path>` (the repo's `ski/` folder), so
  pushing to `main` updates the site; `/ski/...` on this host 301s to the root path; `/scripts/*` and
  `/README.md` are 404.
- Custom domains (both hostnames) are declared in `wrangler.toml`; wrangler creates their proxied DNS
  records and edge certificates. Deploy only when this Worker changes: `npx wrangler@4 deploy`.
