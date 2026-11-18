// Resort catalog conditions: Open-Meteo model summaries for every resort in ski/data/catalog.json.
//   Cron: one of BATCHES slices per 15-min tick, so each resort refreshes hourly and every request stays small
//   (one multi-location Open-Meteo call, unixtime, two points per resort: summit + mid-mountain).
//   GET /ski/api/catalog-conditions.json   merged slices (+ resort-reported status where we have a feed)
//   GET /ski/api/forecast.json?r=<id>      7-day hourly/daily forecast for one catalog resort (edge-cached 30 min)
import bundledCatalog from '../../ski/data/catalog.json';

const CAT_URL = 'https://raw.githubusercontent.com/Jzhang1011/MadeForMyKids/main/ski/data/catalog.json';
export const BATCHES = 4;
const OM_FREE = 'https://api.open-meteo.com/v1/forecast';
const OM_PAID = 'https://customer-api.open-meteo.com/v1/forecast';

export async function loadCatalog() {
  try {
    const r = await fetch(CAT_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (r.ok) { const c = await r.json(); if (c?.resorts?.length) return c; }
  } catch { /* bundled copy */ }
  return bundledCatalog;
}
export const catalogIds = () => bundledCatalog.resorts.map(r => r.id);

const midElev = r => Math.round((r.baseElevM + r.summitElevM) / 2);
function omUrl(env, list, params) {
  const lat = [], lon = [], el = [];
  for (const r of list) {
    lat.push(r.summitLat ?? r.lat, r.lat); lon.push(r.summitLon ?? r.lon, r.lon); el.push(r.summitElevM, midElev(r));
  }
  const p = new URLSearchParams({ latitude: lat.join(','), longitude: lon.join(','), elevation: el.join(','), wind_speed_unit: 'kmh', ...params });
  if (env.OPEN_METEO_KEY) p.set('apikey', env.OPEN_METEO_KEY);
  return `${env.OPEN_METEO_KEY ? OM_PAID : OM_FREE}?${p}`;
}
const r1 = v => (v == null || Number.isNaN(v)) ? null : Math.round(v * 10) / 10;

/** Sum hourly snowfall (cm) before / from the current hour. */
function snowSums(pt) {
  const h = pt.hourly || {}, ts = h.time || [], sn = h.snowfall || [];
  const now = pt.current?.time ?? Math.floor(Date.now() / 1000);
  let past = 0, next = 0, np = 0, nn = 0;
  for (let i = 0; i < ts.length; i++) {
    const v = sn[i]; if (typeof v !== 'number') continue;
    if (ts[i] < now - 3599) { past += v; np++; } else { next += v; nn++; }
  }
  return { s24: np ? r1(past) : null, s72: nn ? r1(next) : null };
}

/** Resort reports for one slice. Parsing a resort page costs a few ms of CPU, so the work is fanned out to small
 *  sub-requests of this Worker (each its own invocation and CPU budget) instead of running in the cron invocation. */
const HEAVY = new Set(['vail']);
async function fetchSliceReports(env, list, prev) {
  const groups = [], light = [];
  for (const r of list) (HEAVY.has(r.report.p) ? groups.push([r]) : light.push(r));
  for (let i = 0; i < light.length; i += 3) groups.push(light.slice(i, i + 3));
  const self = env.SELF_RUN_URL || 'https://ski-data.wealthlanding001.workers.dev/api/run';
  const out = [];
  await Promise.all(groups.map(async g => {
    let got = null, error = null;
    try {
      const r = await fetch(`${self}?sources=reports`, { method: 'POST', headers: { Authorization: `Bearer ${env.REFRESH_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ resorts: g.map(x => ({ id: x.id, report: x.report })) }), signal: AbortSignal.timeout(25000) });
      if (!r.ok) throw new Error(`fan-out HTTP ${r.status}`);
      got = new Map((await r.json()).reports || []);
    } catch (e) { error = String(e.message || e); console.error('[ski-data] report fan-out failed', g.map(x => x.id).join(','), error); }
    for (const x of g) {
      let v = got?.get(x.id) || null;
      if (!v || v.failed) { const p = prev[x.id]; v = p && !p.failed ? { ...p, stale: true, error: v?.error || error, attemptAt: new Date().toISOString() } : (v || { failed: true, error }); }
      out.push([x.id, v]);
    }
  }));
  return out;
}

export async function refreshCatalogBatch(env, b, { reports = true } = {}) {
  const cat = await loadCatalog();
  const list = cat.resorts.filter((_, i) => i % BATCHES === b);
  const key = `cat:b${b}`;
  const now = new Date().toISOString();
  const prev = await env.SKI_DATA.get(key, 'json');
  // Resort reports for this slice run alongside the weather call and land in the same KV write (no extra writes).
  const repP = reports ? fetchSliceReports(env, list.filter(x => x.report), prev?.reports || {}) : Promise.resolve(null);
  let rec, result;
  try {
    const r = await fetch(omUrl(env, list, {
      current: 'temperature_2m,wind_speed_10m,wind_gusts_10m,weather_code',
      hourly: 'snowfall', past_hours: '24', forecast_hours: '72', timeformat: 'unixtime', timezone: 'GMT'
    }), { headers: { 'User-Agent': 'SkiDay ski-data (followthepowder.com; non-commercial family dashboard)' } });
    if (!r.ok) throw new Error(`open-meteo HTTP ${r.status}`);
    const arr = await r.json();
    if (!Array.isArray(arr) || arr.length !== list.length * 2) throw new Error('open-meteo: unexpected shape');
    const resorts = {};
    list.forEach((x, i) => {
      const s = arr[i * 2], m = arr[i * 2 + 1];
      const ss = snowSums(s), ms = snowSums(m);
      resorts[x.id] = {
        at: s.current?.time ? new Date(s.current.time * 1000).toISOString() : now,
        summit: { t: r1(s.current?.temperature_2m), wind: r1(s.current?.wind_speed_10m), gust: r1(s.current?.wind_gusts_10m), code: s.current?.weather_code ?? null, ...ss },
        mid: { t: r1(m.current?.temperature_2m), wind: r1(m.current?.wind_speed_10m), ...ms },
        elev: { summit: x.summitElevM, mid: midElev(x) }
      };
    });
    rec = { status: 'ok', fetchedAt: now, error: null, resorts };
    result = { batch: b, status: 'ok', n: list.length };
  } catch (e) {
    const error = String(e.message || e);
    rec = { ...(prev || { resorts: {} }), status: prev?.resorts ? 'stale' : 'failed', attemptAt: now, error };
    console.error('[ski-data] catalog batch failed', b, error);
    result = { batch: b, status: 'failed', error };
  }
  const reps = await repP;
  if (reps) {
    rec.reports = Object.fromEntries(reps.filter(([, v]) => v));
    rec.reportsAt = now;
    result.reports = reps.map(([id, v]) => ({ id, ok: !!v && !v.error, error: v?.error || undefined }));
  } else if (prev?.reports) rec.reports = prev.reports;
  await env.SKI_DATA.put(key, JSON.stringify(rec));
  return result;
}

/** Merged conditions + resort-reported status for resorts that have a live report feed (intel). */
export async function serveCatalogConditions(env) {
  const recs = await Promise.all([...Array(BATCHES).keys()].map(b => env.SKI_DATA.get(`cat:b${b}`, 'json')));
  const intel = await env.SKI_DATA.get('src:intel', 'json');
  const resorts = {}; const batches = [];
  recs.forEach((r, b) => { batches.push({ batch: b, status: r?.status || 'missing', fetchedAt: r?.fetchedAt || null }); Object.assign(resorts, r?.resorts || {}); });
  // Resort reports: catalog feeds first; the full-dashboard intel fills in only where a catalog feed is missing.
  const reports = {};
  for (const [id, v] of Object.entries(intel?.data || {})) {
    if (!v?.ok) continue;
    const t = v.terrain, tr = v.trails;
    const basis = t?.pct != null ? 'acres' : tr?.total ? 'trails' : null;
    reports[id] = { status: v.status || null, lifts: v.lifts || null, trails: tr || null, acres: t?.totalAcres ? { open: t.openAcres, total: t.totalAcres } : null,
      pct: t?.pct ?? (tr?.total ? Math.round(tr.open / tr.total * 100) : null), basis, baseCm: v.baseCm ?? null, s24Cm: v.snow?.h24 ?? null,
      fetchedAt: v.fetchedAt || null, at: v.asOf || null, snowAt: v.snowAsOf || null, source: v.source || null };
  }
  recs.forEach(r => { for (const [id, v] of Object.entries(r?.reports || {})) if (!v.failed) reports[id] = v; });
  const times = batches.map(x => x.fetchedAt).filter(Boolean).sort();
  return {
    generatedAt: times[times.length - 1] || null, oldest: times[0] || null,
    source: { weather: 'Open-Meteo forecast model (summit + mid-mountain grid points, elevation-adjusted)', reports: 'Resort-published lift, terrain and snow reports (only where SkiDay has a public feed; null = not reported)' },
    units: { t: '°C', wind: 'km/h', snow: 'cm', baseCm: 'cm', s24Cm: 'cm' }, batches, resorts, reports
  };
}

/** One resort's 7-day forecast (summit + mid), straight from Open-Meteo. */
export async function fetchForecast(env, id) {
  const cat = await loadCatalog();
  const r = cat.resorts.find(x => x.id === id); if (!r) return null;
  const res = await fetch(omUrl(env, [r], {
    hourly: 'temperature_2m,apparent_temperature,snowfall,wind_speed_10m,wind_gusts_10m,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,snowfall_sum,wind_speed_10m_max,wind_gusts_10m_max,weather_code',
    forecast_days: '7', timezone: 'auto'
  }), { headers: { 'User-Agent': 'SkiDay ski-data (followthepowder.com; non-commercial family dashboard)' } });
  if (!res.ok) throw new Error(`open-meteo HTTP ${res.status}`);
  const arr = await res.json();
  return { resort: id, fetchedAt: new Date().toISOString(), points: { summit: r.summitElevM, mid: midElev(r) }, summit: arr[0], mid: arr[1] };
}
