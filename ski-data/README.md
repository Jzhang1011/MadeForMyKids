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

## Resort catalog conditions (discovery page)

- `ski/data/catalog.json` lists ~77 North American resorts (id, name, aliases, region, pass, lat/lon, base/summit elevation, official URL, photo credit, `detail: full|basic`). Coordinates/elevations come from each resort's Wikipedia infobox (`src`), pass membership from ikonpass.com / epicpass.com (2026/27). `detail: full` resorts (A-Basin, Copper, Steamboat) use the verified values in `resorts.json`.
- The cron refreshes one of 4 slices per 15-minute tick (each resort hourly) with a single multi-location Open-Meteo request (summit + mid-mountain points, unixtime), stored in KV `cat:b0..3` (~96 writes/day).
- `GET /ski/api/catalog-conditions.json`: merged summary (summit/mid temperature, wind, 24 h past and 72 h forecast snowfall, cm/°C/km/h) plus resort-reported status/lifts only for resorts with a report feed (intel). No lift data is invented for other resorts.
- `GET /ski/api/forecast.json?r=<id>`: 7-day hourly/daily forecast for one catalog resort (basic view), edge-cached 30 minutes.
- Manual refresh: `POST /ski/api/run?sources=catalog` with the refresh token.
