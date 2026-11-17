// Shared, dependency-free logic for the ski dashboard.
// Runs in the browser (ES module) and in Node (scripts/fetch-data.mjs).

export const EVENT_CLASSES = ['chainLaws', 'roadClosures', 'roadReports', 'winterDriving'];

/* ---------------- Weather (Open-Meteo) ---------------- */

const HOURLY = ['temperature_2m', 'apparent_temperature', 'precipitation', 'rain', 'showers', 'snowfall',
  'freezing_level_height', 'wind_speed_10m', 'wind_gusts_10m', 'weather_code', 'visibility',
  'temperature_700hPa', 'temperature_600hPa', 'temperature_500hPa'];
const DAILY = ['temperature_2m_max', 'temperature_2m_min', 'apparent_temperature_min', 'apparent_temperature_max',
  'snowfall_sum', 'precipitation_sum', 'rain_sum', 'showers_sum', 'wind_gusts_10m_max', 'wind_speed_10m_max',
  'weather_code', 'uv_index_max', 'sunrise', 'sunset'];

/** One request for every resort: two points each (base, summit). */
export function openMeteoUrl(cfg) {
  const lat = [], lon = [], elev = [];
  for (const r of cfg.resorts) {
    lat.push(r.lat, r.lat); lon.push(r.lon, r.lon); elev.push(r.baseElevM, r.summitElevM);
  }
  const p = new URLSearchParams({
    latitude: lat.join(','), longitude: lon.join(','), elevation: elev.join(','),
    hourly: HOURLY.join(','), daily: DAILY.join(','),
    timezone: cfg.trip.timezone || 'America/Denver', forecast_days: '7',
    wind_speed_unit: 'kmh', temperature_unit: 'celsius', precipitation_unit: 'mm'
  });
  return `${cfg.sources.weather}?${p}`;
}

/** Map the Open-Meteo array response onto {resortId: {base, summit}}. */
export function splitOpenMeteo(cfg, json) {
  const arr = Array.isArray(json) ? json : [json];
  const out = {};
  cfg.resorts.forEach((r, i) => {
    const base = arr[i * 2], summit = arr[i * 2 + 1];
    if (base && summit && base.hourly && summit.hourly) out[r.id] = { base, summit };
  });
  return out;
}

/**
 * Snow-to-liquid ratio estimate (Kuchera method) from the warmest temperature
 * in the snow-growth column. Open-Meteo's own snowfall uses a fixed ~7:1 ratio,
 * so we estimate a temperature-dependent ratio instead.
 */
export function kucheraRatio(tMaxC) {
  if (tMaxC == null || Number.isNaN(tMaxC)) return null;
  const tK = tMaxC + 273.15;
  const r = tK <= 271.16 ? 12 + 2 * (271.16 - tK) : 12 + (271.16 - tK);
  return Math.max(3, Math.min(25, r));
}

function columnMax(h, i, includeT700) {
  const vals = [h.temperature_2m?.[i], h.temperature_600hPa?.[i], h.temperature_500hPa?.[i]];
  if (includeT700) vals.push(h.temperature_700hPa?.[i]);
  const v = vals.filter(x => typeof x === 'number');
  return v.length ? Math.max(...v) : null;
}

/** Derived hourly rows for one point. */
export function hourlyRows(point, resort) {
  const h = point.hourly; const rows = [];
  const incl700 = resort.baseElevM < 2900;
  for (let i = 0; i < h.time.length; i++) {
    const precip = h.precipitation?.[i] ?? null;
    const liquid = (h.rain?.[i] ?? 0) + (h.showers?.[i] ?? 0);
    const swe = precip == null ? null : Math.max(0, precip - liquid);
    const ratio = swe > 0 ? kucheraRatio(columnMax(h, i, incl700)) : null;
    rows.push({
      time: h.time[i], t: h.temperature_2m?.[i], feels: h.apparent_temperature?.[i],
      precip, swe, snowModel: h.snowfall?.[i] ?? null,
      snowEst: swe != null && ratio != null ? swe * ratio / 10 : (swe === 0 ? 0 : null),
      ratio, fzl: h.freezing_level_height?.[i] ?? null,
      wind: h.wind_speed_10m?.[i], gust: h.wind_gusts_10m?.[i], code: h.weather_code?.[i], vis: h.visibility?.[i]
    });
  }
  return rows;
}

/** Daily summary combining base + summit points. */
export function dailyRows(wx, resort) {
  const { base, summit } = wx;
  const bh = hourlyRows(base, resort), sh = hourlyRows(summit, resort);
  const days = base.daily.time.map((date, d) => {
    const pick = rows => rows.filter(r => r.time.startsWith(date));
    const bs = pick(bh), ss = pick(sh);
    const sum = (rows, k) => rows.reduce((a, r) => a + (r[k] ?? 0), 0);
    const fz = ss.map(r => r.fzl).filter(v => v != null);
    const swe = sum(ss, 'swe');
    const est = sum(ss, 'snowEst');
    return {
      date,
      code: summit.daily.weather_code?.[d] ?? base.daily.weather_code?.[d],
      base: {
        tMax: base.daily.temperature_2m_max?.[d], tMin: base.daily.temperature_2m_min?.[d],
        feelsMin: base.daily.apparent_temperature_min?.[d], feelsMax: base.daily.apparent_temperature_max?.[d],
        snow: base.daily.snowfall_sum?.[d], precip: base.daily.precipitation_sum?.[d],
        gust: base.daily.wind_gusts_10m_max?.[d]
      },
      summit: {
        tMax: summit.daily.temperature_2m_max?.[d], tMin: summit.daily.temperature_2m_min?.[d],
        feelsMin: summit.daily.apparent_temperature_min?.[d], feelsMax: summit.daily.apparent_temperature_max?.[d],
        snow: summit.daily.snowfall_sum?.[d], precip: summit.daily.precipitation_sum?.[d],
        gust: summit.daily.wind_gusts_10m_max?.[d], wind: summit.daily.wind_speed_10m_max?.[d]
      },
      uv: summit.daily.uv_index_max?.[d],
      fzlMin: fz.length ? Math.min(...fz) : null,
      fzlMax: fz.length ? Math.max(...fz) : null,
      // Snow line is typically ~300 m below the freezing level.
      snowLineMin: fz.length ? Math.max(0, Math.min(...fz) - 300) : null,
      snowLineMax: fz.length ? Math.max(0, Math.max(...fz) - 300) : null,
      swe, snowEst: est,
      ratio: swe > 0.2 ? est * 10 / swe : null,
      ratioModel: swe > 0.2 && summit.daily.snowfall_sum?.[d] != null ? summit.daily.snowfall_sum[d] * 10 / swe : null
    };
  });
  return days;
}

export function weatherEmoji(code) {
  if (code == null) return '·';
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code === 85 || code === 86) return '❄️';
  if (code >= 95) return '⛈️';
  return '·';
}

/* ---------------- Roads (CDOT COtrip / CARS) ---------------- */

export function carsUrl(cfg, cls) {
  return `${cfg.sources.cars}/events/map-features?eventClassifications=${cls}`;
}

function stripHtml(s) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

function boundsOf(f) {
  const b = f.properties?.eventReport?.bounds;
  if (b && b.minLat != null) return [b.minLon, b.minLat, b.maxLon, b.maxLat];
  // fall back to geometry
  const pts = [];
  const walk = c => { if (typeof c[0] === 'number') pts.push(c); else c.forEach(walk); };
  if (f.geometry?.coordinates) walk(f.geometry.coordinates);
  if (!pts.length) return null;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Keep only the fields the UI needs; tag each event with the segments it touches. */
export function slimEvents(cfg, cls, json) {
  const out = [];
  for (const f of (json?.features || [])) {
    const p = f.properties || {};
    const bb = boundsOf(f);
    const route = p.route || (p.title || '').split(':')[0];
    const segs = [];
    for (const [id, s] of Object.entries(cfg.segments)) {
      if (!bb) continue;
      const routeOk = s.routes.some(r => route && route.replace(/-/g, ' ').toUpperCase() === r.replace(/-/g, ' ').toUpperCase());
      const hit = bb[0] <= s.bbox[2] && bb[2] >= s.bbox[0] && bb[1] <= s.bbox[3] && bb[3] >= s.bbox[1];
      if (routeOk && hit) segs.push(id);
    }
    if (!segs.length) continue;
    const er = p.eventReport?.eventDescription || {};
    out.push({
      id: p.id, cls, segs, route,
      title: p.title || er.descriptionHeader || p.tooltip,
      tooltip: p.tooltip || '',
      detail: stripHtml(p.description || er.descriptionFull).slice(0, 600),
      eventType: p.eventType || null, priority: p.priority ?? null, icon: p.icon || null,
      updated: p.updated || null, start: p.startTime?.time || null
    });
  }
  return out;
}

/** Classify a chain-law event. */
export function chainLevel(ev) {
  const s = `${ev.title} ${ev.tooltip} ${ev.detail}`.toLowerCase();
  if (/code\s*16|passenger vehicle chain law|chain law for all/.test(s)) return 'nogo';
  if (/code\s*15|traction law/.test(s)) return 'caution';
  if (/commercial|code\s*1[89]/.test(s)) return 'info';
  return 'caution';
}

const WINTER_BAD = /(icy|ice|snow ?packed|snow covered|blowing snow|drifting|poor visibility|slushy|black ice|whiteout|closed)/i;

/* ---------------- NWS alerts ---------------- */

export function nwsUrl(cfg, r) { return `${cfg.sources.nws}?point=${r.lat.toFixed(4)},${r.lon.toFixed(4)}`; }

export function slimAlerts(json) {
  return (json?.features || []).map(f => ({
    event: f.properties?.event, headline: f.properties?.headline, severity: f.properties?.severity,
    onset: f.properties?.onset, ends: f.properties?.ends || f.properties?.expires
  }));
}

/* ---------------- Verdict ---------------- */

const RANK = { go: 0, info: 0, unknown: 1, caution: 2, nogo: 3 };
export function worst(levels) {
  let w = 'go';
  for (const l of levels) if ((RANK[l] ?? 0) > RANK[w]) w = l;
  return w;
}

/**
 * Build itemized reasons for a resort. Each reason: {level, kind, text:{key, args}, seg?, ev?}.
 * `roads` = {ok, events[]}, `alerts` = {ok, list[]}, `days` = dailyRows or null.
 */
export function verdictFor(cfg, resort, { roads, alerts, days, now = Date.now() }) {
  const reasons = [];
  const future = e => e.start && e.start > now + 2 * 3600e3;
  const rules = cfg.rules;
  const segIds = resort.route.map(r => r.seg);

  if (!roads || !roads.ok) {
    reasons.push({ level: 'unknown', kind: 'roads', key: 'r_roads_unavailable' });
  } else {
    for (const leg of resort.route) {
      const evs = roads.events.filter(e => e.segs.includes(leg.seg));
      const chains = evs.filter(e => e.cls === 'chainLaws');
      const closures = evs.filter(e => e.cls === 'roadClosures');
      const incidents = evs.filter(e => e.cls === 'roadReports');
      const cond = evs.filter(e => e.cls === 'winterDriving' && WINTER_BAD.test(`${e.title} ${e.tooltip}`));
      for (const e of closures) {
        const full = /closed|closure/i.test(e.title) && !/lane closed|lanes closed|shoulder|ramp/i.test(e.title);
        const lvl = leg.alt || future(e) ? 'info' : (full ? leg.closure : 'caution');
        reasons.push({ level: lvl, kind: 'closure', seg: leg.seg, ev: e, key: future(e) ? 'r_scheduled' : (full ? 'r_closure' : 'r_partial_closure') });
      }
      for (const e of chains) {
        const lvl = leg.alt ? 'info' : chainLevel(e);
        reasons.push({ level: lvl, kind: 'chain', seg: leg.seg, ev: e, key: lvl === 'nogo' ? 'r_chain_law' : (lvl === 'info' ? 'r_chain_commercial' : 'r_traction_law') });
      }
      for (const e of incidents) {
        const routine = future(e) || e.eventType === 'routine' || /maintenance|road work|construction/i.test(e.title);
        reasons.push({ level: leg.alt || routine ? 'info' : 'caution', kind: 'incident', seg: leg.seg, ev: e, key: 'r_incident' });
      }
      for (const e of cond) {
        reasons.push({ level: leg.alt ? 'info' : 'caution', kind: 'conditions', seg: leg.seg, ev: e, key: 'r_conditions' });
      }
    }
    const main = reasons.filter(r => r.seg && r.level !== 'info');
    if (!main.some(r => r.kind === 'chain')) reasons.push({ level: 'go', kind: 'chain', key: 'r_no_chain' });
    if (!main.some(r => r.kind === 'closure')) reasons.push({ level: 'go', kind: 'closure', key: 'r_no_closure' });
    if (!main.some(r => r.kind === 'incident')) reasons.push({ level: 'go', kind: 'incident', key: 'r_no_incident' });
  }

  if (!alerts || !alerts.ok) {
    reasons.push({ level: 'unknown', kind: 'nws', key: 'r_nws_unavailable' });
  } else if (!alerts.list.length) {
    reasons.push({ level: 'go', kind: 'nws', key: 'r_nws_none' });
  } else {
    for (const a of alerts.list) {
      const lvl = rules.nwsNoGo.includes(a.event) ? 'nogo' : (rules.nwsCaution.includes(a.event) ? 'caution' : 'info');
      reasons.push({ level: lvl, kind: 'nws', key: 'r_nws', alert: a });
    }
  }

  if (!days || !days.length) {
    reasons.push({ level: 'unknown', kind: 'weather', key: 'r_wx_unavailable' });
  } else {
    const d = days[0];
    const snow = Math.max(d.base.snow ?? 0, d.summit.snow ?? 0, d.snowEst ?? 0);
    if (snow >= rules.snowCautionCm) reasons.push({ level: 'caution', kind: 'snow', key: 'r_heavy_snow', val: snow });
    else reasons.push({ level: 'go', kind: 'snow', key: 'r_snow_ok', val: snow });
    const g = d.summit.gust ?? 0;
    if (g >= rules.gustCautionKmh) reasons.push({ level: 'caution', kind: 'wind', key: 'r_wind', val: g });
    else reasons.push({ level: 'go', kind: 'wind', key: 'r_wind_ok', val: g });
    const f = d.summit.feelsMin;
    if (f != null && f <= rules.feelsLikeCautionC) reasons.push({ level: 'caution', kind: 'cold', key: 'r_cold', val: f });
  }

  // Unknown road data means we can't say "Go" with confidence.
  let level = worst(reasons.map(r => r.level));
  if (level === 'unknown') level = 'caution';
  return { level, reasons, segIds };
}

/* ---------------- What to wear ---------------- */

/** Returns {band, adult:[keys], kid:[keys], notes:[keys]} for one day. Temps in °C, wind km/h. */
export function outfitFor(day) {
  const feels = Math.min(day.summit.feelsMin ?? 99, day.base.feelsMin ?? 99);
  const warm = Math.max(day.base.feelsMax ?? -99, day.base.tMax ?? -99);
  const snow = Math.max(day.summit.snow ?? 0, day.base.snow ?? 0);
  const gust = day.summit.gust ?? 0;
  const sunny = day.code != null && day.code <= 2;
  let band;
  if (feels === 99) band = 'unknown';
  else if (feels >= -4) band = 'mild';      // ≥ 25°F
  else if (feels >= -12) band = 'cold';     // 10–25°F
  else if (feels >= -20) band = 'verycold'; // -4–10°F
  else band = 'extreme';                    // < -4°F
  const A = { mild: ['w_base_light', 'w_mid_fleece_opt', 'w_shell', 'w_gloves', 'w_socks', 'w_helmet_goggles'],
    cold: ['w_base_mid', 'w_mid_fleece', 'w_jacket_insulated', 'w_gaiter', 'w_gloves_warm', 'w_socks', 'w_helmet_goggles'],
    verycold: ['w_base_heavy', 'w_mid_puffy', 'w_jacket_insulated', 'w_balaclava', 'w_mittens', 'w_handwarmers', 'w_socks', 'w_helmet_goggles'],
    extreme: ['w_base_heavy', 'w_mid_puffy', 'w_jacket_insulated', 'w_facemask', 'w_mittens', 'w_handwarmers', 'w_toewarmers', 'w_socks', 'w_helmet_goggles'],
    unknown: [] }[band];
  const K = { mild: ['w_base_mid', 'w_mid_fleece', 'w_jacket_insulated', 'w_mittens', 'w_socks', 'w_helmet_goggles', 'w_spare_gloves'],
    cold: ['w_base_heavy', 'w_mid_fleece', 'w_jacket_insulated', 'w_balaclava', 'w_mittens', 'w_handwarmers', 'w_socks', 'w_helmet_goggles', 'w_spare_gloves'],
    verycold: ['w_base_heavy', 'w_mid_puffy', 'w_jacket_insulated', 'w_facemask', 'w_mittens', 'w_handwarmers', 'w_toewarmers', 'w_socks', 'w_helmet_goggles', 'w_spare_gloves'],
    extreme: ['w_base_heavy', 'w_mid_puffy', 'w_jacket_insulated', 'w_facemask', 'w_mittens', 'w_handwarmers', 'w_toewarmers', 'w_socks', 'w_helmet_goggles', 'w_spare_gloves'],
    unknown: [] }[band];
  const notes = [];
  if (band === 'extreme' || band === 'verycold') notes.push('n_kid_breaks');
  if (band === 'extreme') notes.push('n_frostbite');
  if (gust >= 50) notes.push('n_wind');
  if (snow >= 5) notes.push('n_snow_lens');
  else if (sunny) notes.push('n_sun_lens');
  notes.push('n_sunscreen');
  if (warm >= 4) notes.push('n_warm_vent');
  return { band, feels, adult: A, kid: K, notes };
}

/* ---------------- Units ---------------- */

export const fmt = {
  temp: (c, u) => c == null ? '—' : (u === 'imperial' ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`),
  snow: (cm, u) => cm == null ? '—' : cm < 0.05 ? (u === 'imperial' ? '0″' : '0 cm') : (u === 'imperial' ? `${(cm / 2.54).toFixed(cm >= 25.4 ? 0 : 1)}″` : `${cm.toFixed(cm >= 10 ? 0 : 1)} cm`),
  liquid: (mm, u) => mm == null ? '—' : (u === 'imperial' ? `${(mm / 25.4).toFixed(2)}″` : `${mm.toFixed(1)} mm`),
  elev: (m, u) => m == null ? '—' : (u === 'imperial' ? `${Math.round(m * 3.28084 / 10) * 10} ft` : `${Math.round(m / 10) * 10} m`),
  elevRange: (a, b, u) => {
    if (a == null || b == null) return '—';
    if (u === 'imperial') { const k = m => (m * 3.28084 / 1000).toFixed(1); return `${k(a)}–${k(b)}k ft`; }
    return `${Math.round(a / 10) * 10}–${Math.round(b / 10) * 10} m`;
  },
  wind: (k, u) => k == null ? '—' : (u === 'imperial' ? `${Math.round(k / 1.609)} mph` : `${Math.round(k)} km/h`),
  ratio: r => r == null ? '—' : `${Math.round(r)}:1`
};
