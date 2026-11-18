// Resort-reported terrain + snow for catalog resorts: base depth, terrain open (acres or trails), lifts, 24 h snow.
// Each provider reads the same public, keyless feed the resort's own website loads, at most once an hour per resort
// (one catalog slice per 15-min cron tick). Values are copied, never estimated: anything a feed does not report is
// null ("Not reported"). Depths/snow are stored in cm. Config: catalog.json resorts[].report.
const UA = 'SkiDay ski-data (followthepowder.com; non-commercial family ski dashboard; hourly)';
const HTML_UA = 'Mozilla/5.0 (compatible; SkiDay-dashboard; +https://followthepowder.com/)';
const DAY = 864e5;

const num = v => { if (v == null || v === '' || v === '--') return null; const n = parseFloat(String(v).replace(/,/g, '')); return Number.isFinite(n) ? n : null; };
const inCm = v => { const n = num(v); return n == null ? null : Math.round(n * 2.54 * 10) / 10; };
const iso = v => { if (!v) return null; const t = typeof v === 'number' ? v : Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString() : null; };
const pair = (open, total) => (num(total) > 0 && num(open) != null) ? { open: num(open), total: num(total) } : null;
const sumPairs = ps => { const ok = ps.filter(Boolean); return ok.length ? ok.reduce((a, p) => ({ open: a.open + p.open, total: a.total + p.total }), { open: 0, total: 0 }) : null; };
const maxIso = (...xs) => xs.filter(Boolean).sort().pop() || null;

async function get(url, { type = 'json', headers = {} } = {}) {
  const r = await fetch(url, { headers: { 'User-Agent': type === 'json' ? UA : HTML_UA, Accept: type === 'json' ? 'application/json' : 'text/html', ...headers }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${new URL(url).host}`);
  return type === 'json' ? r.json() : r.text();
}

/** Final shape + the rules shared by every provider. */
export function finish(x, srcName, srcUrl) {
  const now = Date.now();
  const out = { at: x.at || null, snowAt: x.snowAt || null, fetchedAt: new Date(now).toISOString(), source: { name: srcName, url: srcUrl },
    status: x.status || null, lifts: x.lifts || null, trails: x.trails || null, acres: x.acres || null, baseCm: x.baseCm ?? null, s24Cm: x.s24Cm ?? null, pct: null, basis: null };
  // Lift counts are the most direct signal; a feed-level "Open" flag with 0 lifts running is not trusted.
  if (out.lifts) out.status = out.lifts.open > 0 ? 'open' : 'closed';
  // Terrain open: prefer acres when the feed reports open acres, else trails/runs.
  if (out.acres) { out.pct = Math.round(out.acres.open / out.acres.total * 100); out.basis = 'acres'; }
  else if (out.trails) { out.pct = Math.round(out.trails.open / out.trails.total * 100); out.basis = 'trails'; }
  if (out.pct === 0 && out.acres?.open > 0) out.pct = 1;
  if (out.pct === 0 && !out.acres && out.trails?.open > 0) out.pct = 1;
  // Snow numbers: only a dated report from the last 14 days (base) / 36 h (24 h snow) counts. Undated feeds are live pages.
  const age = out.snowAt ? now - Date.parse(out.snowAt) : 0;
  if (age > 14 * DAY) out.baseCm = null;
  if (age > 1.5 * DAY) out.s24Cm = null;
  // A 0 base at a resort that is not running is the feed's empty placeholder, not a measurement.
  if (out.baseCm === 0 && out.status !== 'open') out.baseCm = null;
  return out;
}

/* ---- MountainPowder (Alterra and partners) ---- */
async function mtnpowder(c) {
  const ds = await Promise.all(c.ids.map(id => get(`https://mtnpowder.com/feed?resortId=${id}`)));
  const parts = ds.map(d => {
    const sr = d.SnowReport || {}, mid = sr.MidMountainArea || {}, base = sr.BaseArea || {}, top = sr.SummitArea || {};
    if (!d.Name || !num(sr.TotalLifts)) throw new Error('mtnpowder: empty feed');
    const lifts = pair(sr.TotalOpenLifts ?? 0, sr.TotalLifts), trails = pair(sr.TotalOpenTrails ?? 0, sr.TotalTrails);
    const running = lifts?.open > 0;
    const ta = num(sr.TotalTerrainAcres), oa = num(sr.OpenTerrainAcres);
    const acres = ta > 0 ? (oa != null ? { open: oa, total: ta } : (!running ? { open: 0, total: ta } : null)) : null;
    const range = num(sr.SnowBaseRangeIn) != null ? String(sr.SnowBaseRangeIn).split('-').map(num).filter(v => v != null).pop() : null;
    const pick = k => [mid, base, top].map(a => num(a[k])).find(v => v != null) ?? null;
    return { lifts, trails, acres, baseIn: range ?? (running ? pick('BaseIn') : null), s24In: pick('Last24HoursIn'), at: iso(sr.LastUpdatedLift) || iso(d.LastUpdate), snowAt: iso(sr.LastUpdate) };
  });
  const allAcres = parts.every(p => p.acres);
  return finish({ lifts: sumPairs(parts.map(p => p.lifts)), trails: sumPairs(parts.map(p => p.trails)), acres: allAcres ? sumPairs(parts.map(p => p.acres)) : null,
    baseCm: inCm(parts.map(p => p.baseIn).find(v => v != null)), s24Cm: inCm(parts.map(p => p.s24In).find(v => v != null)),
    at: maxIso(...parts.map(p => p.at)), snowAt: maxIso(...parts.map(p => p.snowAt)) }, 'Resort feed (MountainPowder)', `https://mtnpowder.com/feed?resortId=${c.ids[0]}`);
}

/* ---- Vail Resorts: JSON embedded in the terrain and snow-report pages ---- */
function embedded(html, marker, endKey) {
  const i = html.lastIndexOf(marker); if (i < 0) return null;
  const a = html.indexOf('{', i);
  const e = endKey ? html.indexOf('}', html.indexOf(endKey, a)) : html.indexOf('};', a);
  if (a < 0 || e < 0) return null;
  try { return JSON.parse(html.slice(a, e + 1)); } catch { return null; }
}
async function vail(c) {
  const base = `https://${c.host}`;
  const [th, sh] = await Promise.all([get(base + c.terrain, { type: 'html' }), get(base + c.snow, { type: 'html' })]);
  const t = embedded(th, 'FR.TerrainStatusFeed = ', '"IsSuccessful":'), s = embedded(sh, 'FR.snowReportData = ');
  if (!t && !s) throw new Error('vail: embedded data not found');
  const L = t?.Lifts || [];
  const T = (t?.GroomingAreas || []).flatMap(g => g.Trails || []).filter(x => x.TrailType === 'Skiing' || x.TrailType === 1);
  const isOpen = v => v === 'Open' || v === 1;
  const snowAt = s?.LastUpdatedText ? iso(s.LastUpdatedText.replace(/^Updated\s+/i, '').replace(/\s+at\s+/i, ' ')) : null;
  return finish({ lifts: L.length ? { open: L.filter(l => isOpen(l.Status)).length, total: L.length } : null,
    trails: T.length ? { open: T.filter(x => x.IsOpen).length, total: T.length } : null,
    baseCm: num(s?.BaseDepth?.Centimeters), s24Cm: num(s?.TwentyFourHourSnowfall?.Centimeters),
    at: iso(typeof t?.Date === 'string' && !t.Date.startsWith('/') ? t.Date : null), snowAt }, `${c.host.replace(/^www\./, '')} lift, terrain & snow report`, base + c.terrain);
}

/* ---- POWDR "dor" API ---- */
async function powdr(c) {
  const h = { headers: { Origin: c.origin, Referer: c.origin + '/' } };
  const [reports, lifts, trails] = await Promise.all([
    get(`${c.api}/dor/drupal/snow-reports?sort=date&direction=desc`, h), get(`${c.api}/dor/drupal/lifts`, h), get(`${c.api}/dor/drupal/trails`, h)]);
  const winter = x => x.season === 'winter' || x.season === 'all';
  const L = (lifts || []).filter(winter), T = (trails || []).filter(x => winter(x) && x.include && x.type === 'alpine_trail');
  const oT = T.filter(x => x.status === 'open');
  const area = xs => xs.reduce((a, x) => a + (Number(x.properties?.area) || 0), 0);
  const r = Array.isArray(reports) ? reports[0] : null;
  const k = r?.unit_of_measurement === 'cm' ? num : inCm;
  const upd = Math.max(0, ...L.map(x => x.updated || 0), ...T.map(x => x.updated || 0));
  return finish({ lifts: L.length ? { open: L.filter(x => x.status === 'open').length, total: L.length } : null,
    trails: T.length ? { open: oT.length, total: T.length } : null,
    acres: area(T) > 0 ? { open: Math.round(area(oT)), total: Math.round(area(T)) } : null,
    baseCm: r ? k(r.base_depth) : null, s24Cm: r ? k(r.computed?.['24_hour']) : null,
    at: upd ? iso(upd * 1000) : null, snowAt: r?.updated ? iso(r.updated * 1000) : null }, `${new URL(c.origin).host.replace(/^www\./, '')} snow report API`, c.origin);
}

/* ---- Boyne Resorts "reportpal" ---- */
async function reportpal(c) {
  const d = await get(`https://${c.host}/api/reportpal?resortName=${c.code}&useReportPal=true`);
  const w = d.currentConditions?.resortwide || {}, loc = d.currentConditions?.resortLocations?.location?.[0] || {};
  const acres = num(w.totalTrailArea?.acres) > 0 ? pair(w.areaOpen?.acres ?? 0, w.totalTrailArea.acres) : null;
  return finish({ status: /open/i.test(d.operations?.resortStatus || '') ? 'open' : null,
    lifts: pair(w.numLiftsOpen ?? 0, w.numLiftsTotal), trails: pair(w.numTrailsOpen ?? 0, w.numTrailsTotal), acres,
    baseCm: num(loc.base?.centimeters ?? loc.baseMax?.centimeters), s24Cm: num(loc.snow24Hours?.centimeters),
    at: iso(d.liftsUpdated) || iso(d.updated), snowAt: iso(d.updated) }, `${c.host.replace(/^www\./, '')} mountain report`, `https://${c.host}/`);
}

/* ---- Jackson Hole ---- */
async function zaneray(c) {
  const d = await get(c.url);
  const mid = d.snow?.midMountain || {};
  return finish({ lifts: pair(d.liftStatus?.openLifts ?? 0, d.liftStatus?.totalLifts), trails: pair(d.trailStatus?.openTrails ?? 0, d.trailStatus?.totalTrails),
    baseCm: inCm(mid.totalSnowDepth?.value), s24Cm: inCm(mid.newSnowLast24H?.value), at: iso(d.lastModified), snowAt: iso(d.lastModified) }, 'jacksonhole.com mountain report', 'https://www.jacksonhole.com/mountain-report');
}

/* ---- Aspen Snowmass (four mountains) ---- */
function aspenTime(s) { // "10:26 AM Nov 18, 2026" (Mountain time)
  const m = String(s || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s+([A-Za-z]{3})\w*\s+(\d{1,2}),\s*(\d{4})/i); if (!m) return null;
  const t = Date.parse(`${m[4]} ${m[5]}, ${m[6]} ${m[1]}:${m[2]} ${m[3]} MST`); return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
async function aspen(c) {
  const ds = await Promise.all(c.mountains.map(m => get(`https://www.aspensnowmass.com/AspenSnowmass/SnowReport/Feed?mountain=${m}`)));
  const b = ds[c.mountains.indexOf(c.baseFrom)] || ds[0];
  return finish({ lifts: sumPairs(ds.map(d => pair(d.lifts?.openCount, d.lifts?.totalCount))), trails: sumPairs(ds.map(d => pair(d.trails?.openCount, d.trails?.totalCount))),
    acres: sumPairs(ds.map(d => pair(d.acres?.openCount, d.acres?.totalCount))),
    status: ds.some(d => /open/i.test(d.status || '')) ? 'open' : null,
    baseCm: num(b.snowBase?.centimeters), s24Cm: num(b.snow24Hours?.centimeters), at: maxIso(...ds.map(d => aspenTime(d.lastUpdated))), snowAt: aspenTime(b.lastUpdated) },
  'aspensnowmass.com snow report (base: Snowmass)', 'https://www.aspensnowmass.com/four-mountains/snow-report');
}

/* ---- Taos ---- */
async function taos(c) {
  const d = await get(c.url);
  return finish({ lifts: pair(d.liftsOpen, d.liftsTotal), trails: pair(d.trailsOpen, d.trailsTotal), baseCm: inCm(d.snowData?.base), s24Cm: inCm(d.snowData?.last24Hours) },
    'skitaos.com snow report', 'https://www.skitaos.com/snow-reports');
}

/* ---- Sundance ---- */
async function sundance(c) {
  const d = await get(c.url);
  const cnt = k => (d[k] || []).find(x => x.id === 'open-count');
  const sv = id => (d['snow-weather'] || []).find(x => x.id === id)?.status_value;
  const l = cnt('lift-status'), g = cnt('grooming');
  return finish({ lifts: l ? pair(l.open, l.total) : null, trails: g ? pair(g.open, g.total) : null, baseCm: inCm(sv('base_snow')), s24Cm: inCm(sv('24hr_snow')) },
    'sundanceresort.com mountain report', 'https://www.sundanceresort.com/mountain-report/');
}

/* ---- RED Mountain ---- */
async function red(c) {
  const d = (await get(c.url)).MountainReport || {};
  const running = !d.SummerMode && (d.Lifts || []).some(l => /open/i.test(l.Status || ''));
  return finish({ status: d.SummerMode ? null : (running ? 'open' : null), lifts: d.SummerMode ? null : pair((d.Lifts || []).filter(l => /open/i.test(l.Status || '')).length, (d.Lifts || []).length),
    baseCm: num(d.MetricAlpineSnowDepth), s24Cm: num(d.Metric24hours), at: iso(d.DateTime), snowAt: iso(d.DateTime) }, 'redresort.com snow report', 'https://www.redresort.com/report/');
}

/* ---- Sun Valley (mountain.live interactive map: lift + trail status only) ---- */
async function mtnlive(c) {
  const B = 'https://public.mountain.live/interactive-map/v1/map';
  const per = await Promise.all(c.maps.map(async name => {
    const m = await get(`${B}/name/${name}`);
    const [st, dy] = await Promise.all([get(`${B}/${m.id}/staticPoiData?lang=en`), get(`${B}/${m.id}/dynamicPoiData?lang=en`)]);
    const type = new Map((st.items || []).map(x => [x.data?.id, x.data]));
    const L = [], T = [];
    for (const x of dy.items || []) {
      const s = type.get(x.id); if (!s) continue;
      if (s.type === 'LIFT') L.push(x); else if (s.type === 'TRAIL' && (!s.trailType || s.trailType === 'DOWNHILL_SKIING')) T.push(x);
    }
    const op = xs => xs.filter(x => x.openingStatus === 'OPEN').length;
    return { lifts: L.length ? { open: op(L), total: L.length } : null, trails: T.length ? { open: op(T), total: T.length } : null };
  }));
  return finish({ lifts: sumPairs(per.map(p => p.lifts)), trails: sumPairs(per.map(p => p.trails)) }, 'sunvalley.com interactive mountain map', 'https://www.sunvalley.com/mountain-report');
}

const PROVIDERS = { mtnpowder, vail, powdr, reportpal, zaneray, aspen, taos, sundance, red, mtnlive };

/** Fetch one resort's report; on failure keep the previous good one, marked stale. */
export async function fetchReport(r, prev) {
  const fn = PROVIDERS[r.report?.p];
  if (!fn) return null;
  try { return await fn(r.report); }
  catch (e) {
    const error = String(e.message || e).slice(0, 160);
    console.error('[ski-data] report failed', r.id, error);
    return prev ? { ...prev, stale: true, error, attemptAt: new Date().toISOString() } : { error, attemptAt: new Date().toISOString(), failed: true };
  }
}
