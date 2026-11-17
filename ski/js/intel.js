// Resort "ski intelligence" providers: lifts/trails/terrain open, hours, season status,
// base depth and resort-reported snow. Config-driven via resorts.json `intel`.
// Every provider returns the same normalized shape; missing fields are null (shown as
// "unavailable"), never guessed. Snow & depth are stored in cm.
//
// Providers:
//   mtnpowder  - Alterra/MountainPowder feed (CORS *), live in the browser too.
//   powdr      - POWDR "dor" API (api.<resort>.com/api/v1), server-side (CORS-restricted).
//   abasin     - arapahoebasin.com server-rendered header widget + operating-hours page.

const IN = v => { const n = parseFloat(v); return Number.isFinite(n) ? n * 2.54 : null; };
const NUM = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const strip = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const blank = v => v == null || v === '' || v === '--';
const pct = (a, b) => (a != null && b) ? Math.round(a / b * 100) : null;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Day of week (0-6) in the resort's time zone. */
export function localDow(tz, d = new Date()) {
  const w = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(d);
  return DAYS.indexOf(w);
}

/** "9A", "3:30P", "5PM", "8:30 AM", "9:00 a.m." -> minutes after midnight */
export function parseClock(s) {
  const m = String(s || '').trim().toLowerCase().replace(/\./g, '').match(/^(\d{1,2})(?::(\d{2}))?\s*(a|p)m?$/);
  if (!m) return null;
  let h = Number(m[1]) % 12; if (m[3] === 'p') h += 12;
  return h * 60 + Number(m[2] || 0);
}
export function clockLabel(min) {
  if (min == null) return null;
  const h = Math.floor(min / 60), m = min % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function spanOf(pairs) {
  const o = pairs.map(p => p[0]).filter(v => v != null), c = pairs.map(p => p[1]).filter(v => v != null);
  if (!o.length || !c.length) return null;
  return { open: clockLabel(Math.min(...o)), close: clockLabel(Math.max(...c)) };
}

function empty(source) {
  return { ok: false, source, asOf: null, fetchedAt: new Date().toISOString(), status: null, note: null,
    lifts: null, trails: null, terrain: null, hours: null, baseCm: null,
    snow: { h24: null, h48: null, d7: null, season: null }, surface: null };
}

/* ---------- MountainPowder (Alterra: Steamboat, Winter Park, ...) ---------- */
export function mtnpowderUrl(cfg) { return `https://mtnpowder.com/feed?resortId=${cfg.resortId}`; }

export function parseMtnpowder(d, cfg, tz) {
  const out = empty({ name: 'MountainPowder resort feed', url: cfg.page || mtnpowderUrl(cfg) });
  const sr = d.SnowReport || {};
  const mid = sr.MidMountainArea || {}, base = sr.BaseArea || {}, top = sr.SummitArea || {};
  out.ok = true;
  out.asOf = d.MountainAreas?.[0]?.LastUpdate || d.LastUpdate || null;
  out.snowAsOf = sr.LastUpdate || null;
  out.status = /open/i.test(d.OperatingStatus) ? 'open' : /closed/i.test(d.OperatingStatus) ? 'closed' : null;
  out.note = blank(sr.Alert) ? null : strip(sr.Alert).slice(0, 220);
  out.lifts = NUM(sr.TotalLifts) ? { open: NUM(sr.TotalOpenLifts) ?? 0, total: NUM(sr.TotalLifts) } : null;
  out.trails = NUM(sr.TotalTrails) ? { open: NUM(sr.TotalOpenTrails) ?? 0, total: NUM(sr.TotalTrails) } : null;
  const ta = NUM(sr.TotalTerrainAcres), oa = blank(sr.OpenTerrainAcres) ? (out.status === 'closed' ? 0 : null) : NUM(sr.OpenTerrainAcres);
  out.terrain = ta ? { openAcres: oa, totalAcres: ta, pct: pct(oa, ta) } : null;
  // Hours: span of today's hours across lifts.
  const dow = DAYS[localDow(tz)];
  const lifts = (d.MountainAreas || []).flatMap(a => a.Lifts || []);
  const openLifts = lifts.filter(l => /open/i.test(l.StatusEnglish || l.Status));
  const src = openLifts.length ? openLifts : lifts;
  const span = spanOf(src.map(l => [parseClock(l.Hours?.[dow]?.Open), parseClock(l.Hours?.[dow]?.Close)]));
  out.hours = span ? { ...span, scheduled: !openLifts.length } : null;
  // Resort-reported snow: prefer mid-mountain (the official snow stake), fall back to base/summit.
  const pickIn = k => [mid, base, top].map(a => blank(a[k]) ? null : IN(a[k])).find(v => v != null) ?? null;
  const live = out.status === 'open' || !blank(sr.SnowBaseRangeIn);
  out.baseCm = blank(sr.SnowBaseRangeIn) ? (live ? pickIn('BaseIn') : null) : IN(String(sr.SnowBaseRangeIn).split('-').pop());
  out.snow = live ? { h24: pickIn('Last24HoursIn'), h48: pickIn('Last48HoursIn'), d7: pickIn('Last7DaysIn'), season: blank(sr.SeasonTotalIn) ? null : IN(sr.SeasonTotalIn) }
    : { h24: null, h48: null, d7: null, season: null };
  out.surface = blank(sr.BaseConditions) ? null : strip(sr.BaseConditions);
  return out;
}

/* ---------- POWDR dor API (Copper, ...) — Node only ---------- */
export async function fetchPowdr(cfg, tz, getJson) {
  const out = empty({ name: 'Copper Mountain snow report API', url: cfg.page });
  const hdr = { Origin: cfg.origin, Referer: cfg.origin + '/' };
  const [reports, lifts, trails] = await Promise.all([
    getJson(`${cfg.api}/dor/drupal/snow-reports?sort=date&direction=desc`, hdr),
    getJson(`${cfg.api}/dor/drupal/lifts`, hdr),
    getJson(`${cfg.api}/dor/drupal/trails`, hdr)
  ]);
  const r = Array.isArray(reports) ? reports[0] : null;
  const winter = x => x.season === 'winter' || x.season === 'all';
  const L = (lifts || []).filter(winter);
  const T = (trails || []).filter(x => winter(x) && x.include && x.type === 'alpine_trail');
  const openL = L.filter(x => x.status === 'open');
  const openT = T.filter(x => x.status === 'open');
  out.ok = true;
  const upd = Math.max(...L.map(x => x.updated || 0), ...T.map(x => x.updated || 0));
  out.asOf = upd ? new Date(upd * 1000).toISOString() : null;
  out.snowAsOf = r?.updated ? new Date(r.updated * 1000).toISOString() : null;
  out.status = openL.length ? 'open' : 'closed';
  out.lifts = L.length ? { open: openL.length, total: L.length } : null;
  out.trails = T.length ? { open: openT.length, total: T.length } : null;
  const area = xs => xs.reduce((a, x) => a + (Number(x.properties?.area) || 0), 0);
  const ta = area(T);
  out.terrain = ta ? { openAcres: Math.round(area(openT)), totalAcres: Math.round(ta), pct: pct(area(openT), ta) } : null;
  const parseRange = s => { const [a, b] = String(s || '').split('-'); return [parseClock(a), parseClock(b)]; };
  const span = spanOf((openL.length ? openL : L).map(x => parseRange(x.hours)));
  out.hours = span ? { ...span, scheduled: !openL.length } : null;
  if (r) {
    const k = r.unit_of_measurement === 'cm' ? (v => NUM(v)) : IN;
    out.baseCm = k(r.base_depth);
    out.snow = { h24: k(r.computed?.['24_hour']), h48: k(r.computed?.['48_hour']), d7: k(r.computed?.['7_day']), season: k(r.computed?.total) };
  }
  return out;
}

/* ---------- Arapahoe Basin (server-rendered HTML) — Node only ---------- */
export async function fetchAbasin(cfg, tz, getText) {
  const out = empty({ name: 'arapahoebasin.com snow report', url: cfg.page });
  const h = await getText(cfg.page);
  const text = strip(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' '));
  const m = re => { const x = text.match(re); return x ? x.slice(1) : null; };
  const runs = m(/(\d+)\s*\/\s*(\d+)\s*Open Runs/i), lifts = m(/(\d+)\s*\/\s*(\d+)\s*Open Lifts/i);
  const s24 = m(/(\d+(?:\.\d+)?)"\s*Past 24HRS/i), s48 = m(/(\d+(?:\.\d+)?)"\s*Past 48HRS/i), base = m(/(\d+(?:\.\d+)?)"\s*Base\b/i);
  if (!runs && !lifts && !s24) throw new Error('A-Basin report markup not found');
  out.ok = true;
  out.asOf = null; // page carries no timestamp; UI shows the fetch time
  out.lifts = lifts ? { open: +lifts[0], total: +lifts[1] } : null;
  out.trails = runs ? { open: +runs[0], total: +runs[1] } : null;
  out.status = out.lifts ? (out.lifts.open > 0 ? 'open' : 'closed') : null;
  out.baseCm = base ? IN(base[0]) : null;
  out.snow = { h24: s24 ? IN(s24[0]) : null, h48: s48 ? IN(s48[0]) : null, d7: null, season: null };
  if (cfg.hoursPage) {
    try {
      const hh = strip(await getText(cfg.hoursPage));
      const winter = hh.slice(hh.search(/WINTER/i));
      const wk = winter.match(/Mon\s*-\s*Fri\s*:\s*([\d:]+\s*[ap]\.?m\.?)\s*-\s*([\d:]+\s*[ap]\.?m\.?)/i);
      const we = winter.match(/Sat\s*-\s*Sun[^:]*:\s*([\d:]+\s*[ap]\.?m\.?)\s*-\s*([\d:]+\s*[ap]\.?m\.?)/i);
      const dow = localDow(tz);
      const pick = (dow === 0 || dow === 6) ? we : wk;
      if (pick) out.hours = { open: clockLabel(parseClock(pick[1])), close: clockLabel(parseClock(pick[2])), scheduled: out.status !== 'open' };
    } catch { /* hours stay null */ }
  }
  return out;
}

/** Node-side: fetch every resort's intel. */
export async function fetchAllIntel(cfg, { getJson, getText }) {
  const tz = cfg.trip.timezone;
  const res = {};
  for (const r of cfg.resorts) {
    const c = r.intel; if (!c) continue;
    try {
      if (c.provider === 'mtnpowder') res[r.id] = parseMtnpowder(await getJson(mtnpowderUrl(c)), c, tz);
      else if (c.provider === 'powdr') res[r.id] = await fetchPowdr(c, tz, getJson);
      else if (c.provider === 'abasin') res[r.id] = await fetchAbasin(c, tz, getText);
      res[r.id].fetchedAt = new Date().toISOString();
    } catch (e) {
      res[r.id] = { ...empty({ name: c.provider, url: c.page }), error: String(e.message || e) };
    }
  }
  return res;
}
