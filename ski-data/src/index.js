// ski-data: scheduled data refresh + JSON API for madeformykids.com/ski.
//   Cron -> fetch upstream (Open-Meteo, CDOT COtrip, NWS, resort feeds) -> merge with last good -> KV.
//   GET  /ski/api/latest.json | intel.json | cameras.json | status.json   (served via madeformykids-landing)
//   POST /ski/api/run?sources=weather,roads   Authorization: Bearer <REFRESH_TOKEN>
import bundledCfg from '../../ski/data/resorts.json';
import { SOURCES, runSources, toLatest, toIntel, toCameras } from '../../ski/scripts/collect.mjs';

const CFG_URL = 'https://raw.githubusercontent.com/Jzhang1011/MadeForMyKids/main/ski/data/resorts.json';
const KEYS = ['weather', 'roads', 'alerts', 'cameras', 'camsall', 'intel', 'cotrip'];
/** What a cron tick (every 15 min, UTC) refreshes. */
function plan(d) {
  const h = d.getUTCHours(), q = Math.floor(d.getUTCMinutes() / 15);
  if (h === 12 && q === 2) return SOURCES;                     // 12:30 UTC = 5:30 AM MST: everything
  const out = ['roads', 'alerts', 'cameras'];                  // every 15 min
  if (q === 0) { out.push('weather'); if (h >= 12 && h <= 23) out.push('intel'); } // hourly; intel 5 AM–4 PM MST
  return out;
}
const PLAN = { cron: '*/15 * * * *', every15min: ['roads', 'alerts', 'cameras'], hourly: ['weather'], hourly_12_23_utc: ['intel'], daily_12_30_utc: SOURCES };
const TTL = 60; // seconds: browsers and the edge re-check every minute; data itself changes every 15–60 min

async function loadCfg() {
  try {
    const r = await fetch(CFG_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (r.ok) { const c = await r.json(); if (c?.resorts?.length) return c; }
  } catch { /* fall back to the copy bundled at deploy time */ }
  return bundledCfg;
}

async function readAll(env, names = KEYS) {
  const vals = await Promise.all(names.map(k => env.SKI_DATA.get(`src:${k}`, 'json')));
  return Object.fromEntries(names.map((k, i) => [k, vals[i]]));
}

/** Optional: CDOT official data-sharing API (needs COTRIP_API_KEY). Stored raw-ish for the UI to adopt. */
async function collectCotrip(env) {
  const base = env.COTRIP_API_BASE || 'https://data.cotrip.org/api/v1';
  const out = {};
  for (const feed of ['destinations', 'incidents', 'roadConditions']) {
    const r = await fetch(`${base}/${feed}?apiKey=${encodeURIComponent(env.COTRIP_API_KEY)}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`cotrip ${feed}: HTTP ${r.status}`);
    out[feed] = await r.json();
  }
  return out;
}

async function refresh(env, names) {
  const started = Date.now();
  const cfg = await loadCfg();
  const want = names.filter(n => n !== 'cotrip');
  const prev = await readAll(env, [...new Set([...want, ...(want.includes('cameras') ? ['camsall'] : [])])]);
  const { rec, failures } = await runSources(want, cfg, prev, { openMeteoKey: env.OPEN_METEO_KEY });
  if (env.COTRIP_API_KEY && (names.includes('cotrip') || names.includes('roads'))) {
    const p = await env.SKI_DATA.get('src:cotrip', 'json');
    try { rec.cotrip = { status: 'ok', ok: true, fetchedAt: new Date().toISOString(), attemptAt: new Date().toISOString(), error: null, data: await collectCotrip(env) }; }
    catch (e) { const error = String(e.message || e); failures.push(error); rec.cotrip = { ...(p || {}), status: p?.data ? 'stale' : 'failed', attemptAt: new Date().toISOString(), error }; }
  }
  await Promise.all(Object.entries(rec).map(([k, v]) => env.SKI_DATA.put(`src:${k}`, JSON.stringify(v))));
  const summary = { ms: Date.now() - started, sources: Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, { status: v.status, fetchedAt: v.fetchedAt, error: v.error || null }])), failures };
  if (failures.length) console.error('[ski-data] refresh failures', JSON.stringify(summary));
  else console.log('[ski-data] refresh ok', JSON.stringify(summary));
  return summary;
}

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': status === 200 ? `public, max-age=${TTL}, stale-while-revalidate=300` : 'no-store',
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
    ...extra
  }
});

async function serve(name, env) {
  if (name === 'latest') {
    const rec = await readAll(env, ['weather', 'roads', 'alerts', 'cameras']);
    if (!Object.values(rec).some(Boolean)) return json({ error: 'no data yet' }, 503);
    return json(toLatest(rec, 'ski-data-worker'));
  }
  if (name === 'intel') {
    const r = await env.SKI_DATA.get('src:intel', 'json');
    return r ? json(toIntel(r, 'ski-data-worker')) : json({ error: 'no data yet' }, 503);
  }
  if (name === 'cameras') {
    const r = await env.SKI_DATA.get('src:camsall', 'json');
    return r?.data?.length ? json(toCameras(r, bundledCfg, 'ski-data-worker')) : json({ error: 'no data yet' }, 503);
  }
  if (name === 'status') {
    const rec = await readAll(env);
    const sources = Object.fromEntries(Object.entries(rec).filter(([, v]) => v).map(([k, v]) => [k, { status: v.status, fetchedAt: v.fetchedAt, attemptAt: v.attemptAt, error: v.error || null }]));
    return json({ now: new Date().toISOString(), schedule: PLAN, keys: { openMeteo: !!env.OPEN_METEO_KEY, cotrip: !!env.COTRIP_API_KEY }, sources });
  }
  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/(?:ski\/)?api\/([a-z]+)(?:\.json)?$/);
    if (!m) return json({ error: 'not found', endpoints: ['/ski/api/latest.json', '/ski/api/intel.json', '/ski/api/cameras.json', '/ski/api/status.json'] }, 404);
    const name = m[1];
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Authorization' } });
    if (name === 'run') {
      if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
      const auth = request.headers.get('Authorization') || '';
      if (!env.REFRESH_TOKEN || auth !== `Bearer ${env.REFRESH_TOKEN}`) return json({ error: 'unauthorized' }, 401);
      const names = (url.searchParams.get('sources') || SOURCES.join(',')).split(',').filter(n => SOURCES.includes(n) || n === 'cotrip');
      return json(await refresh(env, names), 200, { 'Cache-Control': 'no-store' });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'GET only' }, 405);
    // Edge cache (per data centre) so KV is read at most once a minute per location.
    const cache = caches.default;
    const key = new Request(`https://ski-data.cache/${name}`);
    if (name !== 'status') {
      const hit = await cache.match(key);
      // Re-wrap: a cache-API hit carries cf-cache-status, and the zone's 4 h Browser Cache TTL would
      // then rewrite our 60 s Cache-Control. A fresh Response keeps the short TTL.
      if (hit) return new Response(hit.body, { status: 200, headers: { ...Object.fromEntries(json({}).headers), 'X-Ski-Cache': 'edge' } });
    }
    const res = await serve(name, env);
    if (res.status === 200 && name !== 'status') ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refresh(env, plan(new Date(event.scheduledTime))));
  }
};
