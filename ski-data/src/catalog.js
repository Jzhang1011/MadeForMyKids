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

export async function refreshCatalogBatch(env, b) {
  const cat = await loadCatalog();
  const list = cat.resorts.filter((_, i) => i % BATCHES === b);
  const key = `cat:b${b}`;
  const now = new Date().toISOString();
  try {
    const r = await fetch(omUrl(env, list, {
      current: 'temperature_2m,wind_speed_10m,wind_gusts_10m,weather_code',
      hourly: 'snowfall', past_hours: '24', forecast_hours: '72', timeformat: 'unixtime', timezone: 'GMT'
    }), { headers: { 'User-Agent': 'madeformykids.com ski-data (non-commercial family dashboard)' } });
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
    const rec = { status: 'ok', fetchedAt: now, error: null, resorts };
    await env.SKI_DATA.put(key, JSON.stringify(rec));
    return { batch: b, status: 'ok', n: list.length };
  } catch (e) {
    const prev = await env.SKI_DATA.get(key, 'json');
    const error = String(e.message || e);
    await env.SKI_DATA.put(key, JSON.stringify({ ...(prev || { resorts: {} }), status: prev?.resorts ? 'stale' : 'failed', attemptAt: now, error }));
    console.error('[ski-data] catalog batch failed', b, error);
    return { batch: b, status: 'failed', error };
  }
}

/** Merged conditions + resort-reported status for resorts that have a live report feed (intel). */
export async function serveCatalogConditions(env) {
  const recs = await Promise.all([...Array(BATCHES).keys()].map(b => env.SKI_DATA.get(`cat:b${b}`, 'json')));
  const intel = await env.SKI_DATA.get('src:intel', 'json');
  const resorts = {}; const batches = [];
  recs.forEach((r, b) => { batches.push({ batch: b, status: r?.status || 'missing', fetchedAt: r?.fetchedAt || null }); Object.assign(resorts, r?.resorts || {}); });
  const reports = {};
  for (const [id, v] of Object.entries(intel?.data || {})) {
    if (!v?.ok) continue;
    reports[id] = { status: v.status || null, lifts: v.lifts || null, trails: v.trails || null, snow24: v.snow?.h24 ?? null, fetchedAt: v.fetchedAt || null, asOf: v.snowAsOf || v.asOf || null, source: v.source || null };
  }
  const times = batches.map(x => x.fetchedAt).filter(Boolean).sort();
  return {
    generatedAt: times[times.length - 1] || null, oldest: times[0] || null,
    source: { weather: 'Open-Meteo forecast model (summit + mid-mountain grid points, elevation-adjusted)', reports: 'Resort snow reports (only where SkiDay has a feed)' },
    units: { t: '°C', wind: 'km/h', snow: 'cm' }, batches, resorts, reports
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
  }), { headers: { 'User-Agent': 'madeformykids.com ski-data (non-commercial family dashboard)' } });
  if (!res.ok) throw new Error(`open-meteo HTTP ${res.status}`);
  const arr = await res.json();
  return { resort: id, fetchedAt: new Date().toISOString(), points: { summit: r.summitElevM, mid: midElev(r) }, summit: arr[0], mid: arr[1] };
}
