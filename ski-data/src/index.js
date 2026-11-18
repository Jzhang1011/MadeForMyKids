// ski-data: scheduled data refresh + JSON API for madeformykids.com/ski.
//   Cron -> fetch upstream (Open-Meteo, CDOT COtrip, NWS, resort feeds) -> merge with last good -> KV.
//   GET  /ski/api/latest.json | intel.json | cameras.json | status.json   (served via madeformykids-landing)
//   POST /ski/api/run?sources=weather,roads   Authorization: Bearer <REFRESH_TOKEN>
import { DurableObject } from 'cloudflare:workers';
import bundledCfg from '../../ski/data/resorts.json';
import STATS_HTML from './stats.html';
import { SOURCES, runSources, toLatest, toIntel, toCameras } from '../../ski/scripts/collect.mjs';
import { BATCHES, refreshCatalogBatch, serveCatalogConditions, fetchForecast, catalogIds } from './catalog.js';

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
const PLAN = { cron: '*/15 * * * *', every15min: ['roads', 'alerts', 'cameras', 'catalog (1 of 4 slices; each resort hourly)'], hourly: ['weather'], hourly_12_23_utc: ['intel'], daily_12_30_utc: SOURCES };
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

/* ---------- Anonymous usage counters ---------- */
// Allowlist: event -> allowed labels. Nothing outside this list is ever stored.
const RESORT_IDS = [...new Set([...bundledCfg.resorts.map(r => r.id), ...catalogIds()])];
const PRESET_IDS = (bundledCfg.trip.presets || []).map(p => p.id);
const EVENTS = {
  page_view: ['en', 'zh'],
  resort_select: RESORT_IDS,
  start_select: [...PRESET_IDS, 'custom'],
  lang_toggle: ['en', 'zh'],
  unit_toggle: ['imperial', 'metric'],
  disc_tab: ['near', 'fav', 'best', 'explore'],
  disc_view: ['list', 'map'],
  disc_search: ['used'],          // never the search text
  disc_fav: ['add', 'remove'],
  disc_compare: ['open']
};
const SITE_HOSTS = ['madeformykids.com', 'www.madeformykids.com'];
const denverDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export class SkiCounter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS counts (day TEXT NOT NULL, event TEXT NOT NULL, label TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, event, label))');
    // Abuse guard, memory only (never written to storage): per-client hits in the current minute,
    // keyed by a hash that is discarded when the minute ends, plus a hard daily cap.
    this.minute = 0; this.perClient = new Map(); this.day = ''; this.dayTotal = 0;
  }
  hit(clientKey, event, label) {
    const m = Math.floor(Date.now() / 60000);
    if (m !== this.minute) { this.minute = m; this.perClient.clear(); }
    const c = (this.perClient.get(clientKey) || 0) + 1; this.perClient.set(clientKey, c);
    if (c > 30) return false;
    const day = denverDay();
    if (day !== this.day) {
      this.day = day;
      this.dayTotal = this.sql.exec('SELECT COALESCE(SUM(n), 0) AS t FROM counts WHERE day = ?', day).one().t;
    }
    if (this.dayTotal >= 50000) return false;
    this.dayTotal++;
    this.sql.exec('INSERT INTO counts (day, event, label, n) VALUES (?, ?, ?, 1) ON CONFLICT (day, event, label) DO UPDATE SET n = n + 1', day, event, label);
    return true;
  }
  stats(days) {
    const since = denverDay(new Date(Date.now() - (days - 1) * 86400000));
    const rows = this.sql.exec('SELECT day, event, label, n FROM counts WHERE day >= ? ORDER BY day DESC, event, label', since).toArray();
    const byDay = {}; const totals = {};
    for (const r of rows) {
      const d = (byDay[r.day] ||= {});
      const e = (d[r.event] ||= { total: 0 }); e.total += r.n; if (r.label) e[r.label] = (e[r.label] || 0) + r.n;
      const t = (totals[r.event] ||= { total: 0 }); t.total += r.n; if (r.label) t[r.label] = (t[r.label] || 0) + r.n;
    }
    return { since, timezone: 'America/Denver', totals, days: Object.entries(byDay).map(([day, events]) => ({ day, ...events })) };
  }
}

async function handleEvent(request, env) {
  const ok = () => new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': 'https://madeformykids.com', 'Cache-Control': 'no-store' } });
  // Only the site itself (sendBeacon sends Origin); anything else is ignored silently.
  const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
  let host = ''; try { host = new URL(origin).hostname; } catch {}
  if (!SITE_HOSTS.includes(host)) return ok();
  const text = await request.text();
  if (text.length > 200) return ok();
  let body; try { body = JSON.parse(text); } catch { return ok(); }
  const event = String(body?.e || ''), label = String(body?.v ?? '');
  if (!EVENTS[event] || !EVENTS[event].includes(label)) return ok();
  // Rate-limit key: a hash of IP + user agent + the current minute, used in memory only.
  const raw = `${request.headers.get('CF-Connecting-IP') || ''}|${request.headers.get('User-Agent') || ''}|${Math.floor(Date.now() / 60000)}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const key = [...new Uint8Array(digest).slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
  await env.COUNTER.get(env.COUNTER.idFromName('ski')).hit(key, event, label);
  return ok();
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/ski/api/stats.html' || url.pathname === '/api/stats.html') {
      return new Response(STATS_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' } });
    }
    const m = url.pathname.match(/^\/(?:ski\/)?api\/([a-z-]+)(?:\.json)?$/);
    if (!m) return json({ error: 'not found', endpoints: ['/ski/api/latest.json', '/ski/api/intel.json', '/ski/api/cameras.json', '/ski/api/status.json'] }, 404);
    const name = m[1];
    if (name === 'event') return request.method === 'POST' ? handleEvent(request, env) : json({ error: 'POST only' }, 405);
    if (name === 'stats') {
      const auth = request.headers.get('Authorization') || '';
      if (!env.REFRESH_TOKEN || auth !== `Bearer ${env.REFRESH_TOKEN}`) return json({ error: 'unauthorized' }, 401);
      const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10) || 30));
      return json(await env.COUNTER.get(env.COUNTER.idFromName('ski')).stats(days), 200, { 'Cache-Control': 'no-store' });
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Authorization' } });
    if (name === 'run') {
      if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
      const auth = request.headers.get('Authorization') || '';
      if (!env.REFRESH_TOKEN || auth !== `Bearer ${env.REFRESH_TOKEN}`) return json({ error: 'unauthorized' }, 401);
      const want = (url.searchParams.get('sources') || SOURCES.join(',')).split(',');
      const out = {};
      if (want.includes('catalog')) { out.catalog = []; for (let b = 0; b < BATCHES; b++) out.catalog.push(await refreshCatalogBatch(env, b)); }
      const names = want.filter(n => SOURCES.includes(n) || n === 'cotrip');
      if (names.length) Object.assign(out, await refresh(env, names));
      return json(out, 200, { 'Cache-Control': 'no-store' });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'GET only' }, 405);
    // Edge cache (per data centre) so KV is read at most once a minute per location.
    const cache = caches.default;
    if (name === 'forecast') {
      const id = url.searchParams.get('r') || '';
      if (!catalogIds().includes(id)) return json({ error: 'unknown resort' }, 404);
      const fkey = new Request(`https://ski-data.cache/forecast/${id}`);
      const hit = await cache.match(fkey);
      if (hit) return new Response(hit.body, { status: 200, headers: { ...Object.fromEntries(json({}, 200, { 'Cache-Control': 'public, max-age=600' }).headers), 'X-Ski-Cache': 'edge' } });
      try {
        const body = await fetchForecast(env, id);
        if (!body) return json({ error: 'unknown resort' }, 404);
        ctx.waitUntil(cache.put(fkey, json(body, 200, { 'Cache-Control': 'public, max-age=1800' })));
        return json(body, 200, { 'Cache-Control': 'public, max-age=600' });
      } catch (e) { return json({ error: String(e.message || e) }, 502); }
    }
    const key = new Request(`https://ski-data.cache/${name}`);
    if (name !== 'status') {
      const hit = await cache.match(key);
      // Re-wrap: a cache-API hit carries cf-cache-status, and the zone's 4 h Browser Cache TTL would
      // then rewrite our 60 s Cache-Control. A fresh Response keeps the short TTL.
      if (hit) return new Response(hit.body, { status: 200, headers: { ...Object.fromEntries(json({}).headers), 'X-Ski-Cache': 'edge' } });
    }
    const res = name === 'catalog-conditions' ? json(await serveCatalogConditions(env)) : await serve(name, env);
    if (res.status === 200 && name !== 'status') ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  },
  async scheduled(event, env, ctx) {
    const d = new Date(event.scheduledTime);
    ctx.waitUntil(refresh(env, plan(d)));
    // Catalog conditions: one slice per quarter-hour -> every resort hourly, small requests.
    ctx.waitUntil(refreshCatalogBatch(env, Math.floor(d.getUTCMinutes() / 15) % BATCHES));
  }
};
