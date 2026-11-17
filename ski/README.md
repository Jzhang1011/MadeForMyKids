# Ski Trip Go / No-Go dashboard

Live: https://madeformykids.com/ski/ (also https://private.madeformykids.com/ski/)

A self-contained, no-build static app (HTML + ES modules) that answers "do we drive up today?"
for a Denver (DEN) → Arapahoe Basin / Copper Mountain / Steamboat ski trip.

## Sections
- **Verdict** – GO / CAUTION / NO-GO per resort with itemized reasons (CDOT chain & traction law,
  closures, incidents, road conditions, NWS alerts, heavy snow, summit wind, extreme cold).
- **Weather** – Open-Meteo, base + summit elevations: hourly (24/48/72 h) and 7-day snowfall,
  freezing level, estimated snow line (freezing level − 300 m), Kuchera snow-to-liquid ratio.
- **Roads** – CDOT COtrip events matched to route segments by route name + bounding box, and 16 CDOT cameras.
- **What to wear** – adults & kids per day from summit feels-like temp, wind and snow.
- **Resort cams** – official webcam stills / live players (A-Basin & Copper via HDRelay, Steamboat via YouTube).
- **Packing** – editable list saved in `localStorage`.
- English / 中文 and °F·in / °C·cm toggles, saved in `localStorage`.

## Data
| Source | Endpoint | Key? |
|---|---|---|
| Weather | `api.open-meteo.com/v1/forecast` | no (CORS ok) |
| CDOT events | `api-511x-co.carsprogram.org/events/map-features?eventClassifications=chainLaws|roadClosures|roadReports|winterDriving` | no (CORS `*`) — the public feed behind cotrip.org |
| CDOT cameras | `api-511x-co.carsprogram.org/cameras/map-features`, images on `cocam.carsprogram.org` | no |
| NWS alerts | `api.weather.gov/alerts/active?point=lat,lon` | no |

The browser fetches everything live on load and every 10 minutes. `data/latest.json` is a
morning snapshot used as a fallback if a live call fails. A failed source shows "unavailable" — nothing is invented.

## Morning refresh
`.github/workflows/ski-refresh.yml` runs `node ski/scripts/fetch-data.mjs` daily at 12:30 UTC
(5:30 AM MST) and commits `ski/data/latest.json` to `main`. Run it by hand from the Actions tab
(**Run workflow**) or locally with `node ski/scripts/fetch-data.mjs`.

## Adding resorts (Ikon expansion)
Everything is driven by `data/resorts.json`: add a resort (lat/lon, base/summit elevation, webcams,
links) and its `route` as a list of `segments` (route names + bbox). Cameras reference COtrip camera IDs.
`shop.enabled` reserves a nav slot for a future gear shop.

## madeformykids.com copy
The apex domain is served by the `madeformykids-landing` Cloudflare Worker (`landing/`). After changing
code here run `ski/scripts/sync-to-landing.sh` and then `cd landing && wrangler deploy`.
