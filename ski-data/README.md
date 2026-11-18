# ski-data Worker

Scheduled data refresh and JSON API for https://madeformykids.com/ski/.

- **Cron**: one trigger `*/15 * * * *` (free plan: 5 crons per account). Per tick (UTC): roads + NWS alerts + CDOT cameras every 15 min; weather on the first tick of each hour; resort intel hourly 12:00–23:00 UTC (5 AM–4 PM MST); everything at 12:30 UTC (5:30 AM MST).
- **Storage**: KV namespace `SKI_DATA` (`7e2987feff8c4218aa766211fff5b859`), one key per source: `src:weather`, `src:roads`, `src:alerts`, `src:cameras`, `src:camsall`, `src:intel` (+ `src:cotrip` when keyed). Each record: `{status: ok|stale|failed, fetchedAt, attemptAt, error, data}`. A failed fetch keeps the last good `data` and its `fetchedAt`.
- **API** (routed by `madeformykids-landing` via service binding `SKI_DATA_SVC`): `/ski/api/latest.json`, `/ski/api/intel.json`, `/ski/api/cameras.json`, `/ski/api/status.json`. `Cache-Control: public, max-age=60`. Edge-cached 60 s.
- **Manual refresh**: `curl -X POST -H "Authorization: Bearer $REFRESH_TOKEN" "https://ski-data.<subdomain>.workers.dev/ski/api/run?sources=weather,roads"`.
- Collection logic is shared with the GitHub Action backup: `ski/scripts/collect.mjs` (+ `ski/js/core.js`, `ski/js/intel.js`).

Deploy: `npx wrangler@4 deploy` from this folder.

## Secrets (`npx wrangler@4 secret put NAME`)
| Name | Effect |
|---|---|
| `REFRESH_TOKEN` | Required for `POST /ski/api/run`. |
| `OPEN_METEO_KEY` | Uses `customer-api.open-meteo.com` with the commercial key (same response). |
| `COTRIP_API_KEY` | Also fetches CDOT's official data-sharing feeds (`destinations`, `incidents`, `roadConditions`) into `src:cotrip`. Endpoint path/params (`COTRIP_API_BASE`, default `https://data.cotrip.org/api/v1`) must be confirmed against the portal once the key is issued; the UI still reads the COtrip map feed until then. |
