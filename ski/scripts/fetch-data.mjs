#!/usr/bin/env node
// Daily snapshot: fetches weather, CDOT road events, NWS alerts and camera URLs
// into ski/data/latest.json. No dependencies (Node 18+). Never invents data:
// a failed source is recorded as {ok:false, error} and the page shows "unavailable".
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAllIntel } from '../js/intel.js';
import { openMeteoUrl, splitOpenMeteo, carsUrl, slimEvents, EVENT_CLASSES, nwsUrl, slimAlerts } from '../js/core.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'data');
const cfg = JSON.parse(await readFile(join(dataDir, 'resorts.json'), 'utf8'));
const UA = 'madeformykids-ski-dashboard (https://madeformykids.com/ski/)';

async function getRaw(url, extra = {}, tries = 3, accept = 'application/json, application/geo+json') {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept, ...extra } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r;
    } catch (e) { last = e; await new Promise(res => setTimeout(res, 1500 * (i + 1))); }
  }
  throw last;
}
const getJson = async (url, extra) => (await getRaw(url, extra)).json();
const getText = async (url, extra) => (await getRaw(url, extra, 3, 'text/html')).text();
const now = () => new Date().toISOString();

// Resort intel (small file; the workflow refreshes it hourly during the ski day).
const intel = { generatedAt: now(), resorts: await fetchAllIntel(cfg, { getJson, getText }) };
await writeFile(join(dataDir, 'intel.json'), JSON.stringify(intel));
console.log('intel:', Object.entries(intel.resorts).map(([k, v]) => `${k}=${v.ok ? 'ok' : 'FAIL ' + v.error}`).join(' '));
if (process.argv.includes('--intel-only')) process.exit(0);

const out = { generatedAt: now(), sources: {}, weather: null, roads: null, alerts: {}, cameras: null };

// Weather
try {
  const json = await getJson(openMeteoUrl(cfg));
  const split = splitOpenMeteo(cfg, json);
  if (!Object.keys(split).length) throw new Error('empty response');
  out.weather = split;
  out.sources.weather = { ok: true, fetchedAt: now() };
} catch (e) { out.sources.weather = { ok: false, fetchedAt: now(), error: String(e.message || e) }; }

// Roads
try {
  const events = [];
  for (const cls of EVENT_CLASSES) events.push(...slimEvents(cfg, cls, await getJson(carsUrl(cfg, cls))));
  out.roads = { events };
  out.sources.roads = { ok: true, fetchedAt: now() };
} catch (e) { out.sources.roads = { ok: false, fetchedAt: now(), error: String(e.message || e) }; }

// NWS alerts
let nwsOk = true;
for (const r of cfg.resorts) {
  try { out.alerts[r.id] = slimAlerts(await getJson(nwsUrl(cfg, r))); }
  catch (e) { nwsOk = false; out.alerts[r.id] = null; }
}
out.sources.alerts = { ok: nwsOk, fetchedAt: now() };

// Cameras: refresh image URLs / broken flags from the live COtrip camera list.
try {
  const json = await getJson(`${cfg.sources.cars}/cameras/map-features`);
  const byId = new Map((json.features || []).map(f => [f.properties.id, f.properties]));
  out.cameras = cfg.cameras.map(c => {
    const p = byId.get(c.id);
    if (!p) return { id: c.id, found: false };
    const still = p.views.find(v => v.type === 'STILL_IMAGE');
    const stream = p.views.find(v => v.type === 'WMP');
    return { id: c.id, found: true, name: p.name, broken: p.views.every(v => v.broken),
      image: still?.url || c.image, stream: stream?.url || null, lastUpdated: p.lastUpdated || null };
  });
  out.sources.cameras = { ok: true, fetchedAt: now() };
} catch (e) { out.sources.cameras = { ok: false, fetchedAt: now(), error: String(e.message || e) }; }

await writeFile(join(dataDir, 'latest.json'), JSON.stringify(out));
console.log(JSON.stringify(out.sources, null, 1), 'events:', out.roads?.events.length ?? 'n/a');
