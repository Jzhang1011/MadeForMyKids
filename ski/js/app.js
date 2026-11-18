import { openMeteoUrl, splitOpenMeteo, dailyRows, hourlyRows, weatherEmoji, carsUrl, slimEvents, EVENT_CLASSES,
  nwsUrl, slimAlerts, verdictFor, outfitFor, fmt } from './core.js?v=1edcd309c1';
import { STR, PACK_DEFAULT } from './i18n.js?v=1edcd309c1';
import { selectCameras, routeSegments, inCO } from './route.js?v=1edcd309c1';
import { loadStart, saveStart, isDefaultStart, getRoute, mountStartUI } from './start.js?v=1edcd309c1';
import { initDiscover, loadCatalog, loadConditions, renderDiscover, resolveResort, addRecent, showBasic, renderBasic } from './discover.js?v=1edcd309c1';

const LS = {
  get: (k, d) => { try { const v = localStorage.getItem('ski.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('ski.' + k, JSON.stringify(v)); } catch {} }
};
const state = {
  lang: LS.get('lang', (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'),
  units: LS.get('units', 'imperial'),
  resort: LS.get('resort', null),
  point: LS.get('point', 'summit'),
  cfg: null,
  wx: { data: null, mode: null, at: null }, roads: { data: null, mode: null, at: null }, alerts: { data: null, mode: null, at: null },
  intel: { data: {}, at: null, mode: null }, cams: null, camsAt: null, start: null, routes: {}, camsAll: null, startUI: null, map: null, refreshing: false, lastLive: 0
};

const $ = s => document.querySelector(s);
/** Anonymous usage count (allowlisted event + label, no IDs/cookies). Production host only; never throws. */
function track(e, v) {
  try {
    if (!/(^|\.)madeformykids\.com$/.test(location.hostname) || !navigator.sendBeacon) return;
    navigator.sendBeacon('api/event', new Blob([JSON.stringify({ e, v: String(v ?? '') })], { type: 'text/plain' }));
  } catch { /* stats are optional */ }
}
// Null-safe element lookup for optional page parts (an older cached index.html may lack them).
const $$ = s => document.querySelector(s) || document.createElement('div');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const t = (k, ...a) => { let s = STR[state.lang][k] ?? STR.en[k] ?? k; a.forEach((v, i) => { s = s.replace(`{${i}}`, v); }); return s; };
const L = o => (o && typeof o === 'object') ? (o[state.lang] || o.en) : o;
const tz = () => state.cfg?.trip?.timezone || 'America/Denver';
const locale = () => state.lang === 'zh' ? 'zh-CN' : 'en-US';
const resort = () => state.cfg.resorts.find(r => r.id === state.resort) || state.cfg.resorts[0];
const U = () => state.units;

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(String(iso).replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  if (isNaN(d)) return '—';
  return new Intl.DateTimeFormat(locale(), { timeZone: tz(), month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d) + ' MT';
}
function dayLabel(date, opts = { weekday: 'short' }) {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', ...opts }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
function hourLabel(iso) {
  const h = Number(iso.slice(11, 13));
  if (state.lang === 'zh') return `${h}时`;
  return h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`;
}
function denverNowKey() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = k => p.find(x => x.type === k).value;
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:00`;
}
const snowVal = cm => cm == null ? null : (U() === 'imperial' ? cm / 2.54 : cm);
const snowUnit = () => U() === 'imperial' ? '″' : 'cm';

async function getJson(url, ms = 20000) {
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(tm); }
}

/* ---------- Data loading ---------- */

// Data comes from the ski-data Worker (api/ = /ski/api/*: refreshed on a schedule into KV, cached 60 s),
// falling back to the git snapshot (data/*.json, GitHub Action backup). The browser only calls the
// upstream APIs itself when neither copy is fresh enough (see LIMIT), so visitors share one fetch.
const API = 'api/';
const LIMIT = { wx: 180, roads: 30, alerts: 30, intel: 120 }; // minutes before a copy counts as stale
const ageMin = at => { if (!at) return Infinity; const ms = typeof at === 'number' ? at : new Date(String(at).replace(/([+-]\d{2})(\d{2})$/, '$1:$2')).getTime(); return isNaN(ms) ? Infinity : (Date.now() - ms) / 60000; };
const isStale = slot => !state[slot].data || ageMin(state[slot].at) > LIMIT[slot];

async function getFirst(urls) {
  let err;
  for (const u of urls) { try { return { j: await getJson(u, 15000), from: u.startsWith(API) ? 'server' : 'snapshot' }; } catch (e) { err = e; } }
  throw err;
}
/** Keep the newest copy of a source. */
function take(slot, data, at, mode, status) {
  if (data == null) return;
  const cur = state[slot];
  if (cur.data && cur.at && at && ageMin(at) > ageMin(cur.at)) return;
  state[slot] = { data, mode, at, status: status || 'ok' };
}
async function loadServer() {
  const bust = `?v=${Math.floor(Date.now() / 60000)}`;
  const [snap, intel] = await Promise.allSettled([
    getFirst([`${API}latest.json${bust}`, `data/latest.json${bust}`]),
    getFirst([`${API}intel.json${bust}`, `${state.cfg.sources.intel || 'data/intel.json'}${bust}`])
  ]);
  if (snap.status === 'fulfilled') {
    const s = snap.value.j, from = snap.value.from, src = s.sources || {};
    if (src.weather?.ok && s.weather) take('wx', s.weather, src.weather.fetchedAt, from, src.weather.status);
    if (src.roads?.ok && s.roads) take('roads', s.roads.events, src.roads.fetchedAt, from, src.roads.status);
    if (s.alerts && src.alerts?.ok !== false && Object.values(s.alerts).some(v => v)) take('alerts', s.alerts, src.alerts?.fetchedAt, from, src.alerts?.status);
    if (s.cameras) state.cams = s.cameras;
  }
  if (intel.status === 'fulfilled') {
    const j = intel.value.j;
    if (!state.intel.at || ageMin(j.generatedAt) <= ageMin(state.intel.at)) {
      for (const [id, v] of Object.entries(j.resorts || {})) state.intel.data[id] = v;
      state.intel.at = j.generatedAt; state.intel.mode = intel.value.from;
    }
  }
}

/** Last resort: fetch upstream directly, only for sources with no fresh copy. */
async function loadLiveFallback() {
  const cfg = state.cfg; const jobs = [];
  if (isStale('wx')) jobs.push(getJson(openMeteoUrl(cfg)).then(j => { const d = splitOpenMeteo(cfg, j); if (!Object.keys(d).length) throw new Error('empty'); state.wx = { data: d, mode: 'live', at: new Date().toISOString(), status: 'ok' }; })
    .catch(e => { state.wx.error = String(e.message || e); }));
  if (isStale('roads')) jobs.push(Promise.all(EVENT_CLASSES.map(c => getJson(carsUrl(cfg, c), 30000).then(j => slimEvents(cfg, c, j))))
    .then(all => { state.roads = { data: all.flat(), mode: 'live', at: new Date().toISOString(), status: 'ok' }; })
    .catch(e => { state.roads.error = String(e.message || e); }));
  if (isStale('alerts')) jobs.push(Promise.all(cfg.resorts.map(r => getJson(nwsUrl(cfg, r)).then(j => [r.id, slimAlerts(j)])))
    .then(all => { state.alerts = { data: Object.fromEntries(all), mode: 'live', at: new Date().toISOString(), status: 'ok' }; })
    .catch(e => { state.alerts.error = String(e.message || e); }));
  await Promise.all(jobs);
}

async function refresh() {
  if (state.refreshing) return;
  state.refreshing = true; $('#btn-refresh').classList.add('spin');
  try { await Promise.allSettled([loadServer(), loadCams()]); await loadLiveFallback(); state.lastLive = Date.now(); if (Object.values(state.routes).some(x => x.status === 'fail')) { for (const k in state.routes) if (state.routes[k].status === 'fail') delete state.routes[k]; routeAll(); } } finally { state.refreshing = false; $('#btn-refresh').classList.remove('spin'); renderAll(); }
}

/* ---------- Derived ---------- */

function daysFor(r) { const w = state.wx.data?.[r.id]; try { return w ? dailyRows(w, r) : null; } catch { return null; } }
function intelFor(r) { return state.intel.data[r.id] || null; }
const ctxMemo = new Map();
/** Dynamic route context for a resort: synthetic segments/legs, matched events and picked cameras. */
function ctxFor(r) {
  const rs = state.routes[r.id];
  if (!rs || rs.status !== 'ok') return null;
  const key = `${rs.key}|${state.roads.at}|${state.camsAll ? state.camsAll.length : 0}`;
  if (ctxMemo.get(r.id)?.key === key) return ctxMemo.get(r.id);
  const route = rs.route;
  const dyn = routeSegments(route, state.roads.data || []);
  const cams = state.camsAll ? selectCameras(route, state.camsAll, { max: 15, maxDist: 1500 }) : null;
  // Does the route leave Colorado after entering it (e.g. Fort Collins → Steamboat via Wyoming)?
  const e = Math.max(0, route.coEntry);
  const leaves = route.coEntry >= 0 && route.pts.slice(e).some(p => !inCO(p));
  const c = { key, route, ...dyn, cams, leaves };
  ctxMemo.set(r.id, c);
  return c;
}
function verdict(r) {
  const c = ctxFor(r);
  const cfg = c ? { ...state.cfg, segments: { ...state.cfg.segments, ...c.segments } } : state.cfg;
  return verdictFor(cfg, c ? { ...r, route: c.legs } : r, {
    roads: state.roads.data ? { ok: true, events: c ? c.events : state.roads.data } : { ok: false },
    alerts: state.alerts.data && state.alerts.data[r.id] ? { ok: true, list: state.alerts.data[r.id] } : { ok: false },
    days: daysFor(r), intel: intelFor(r)
  });
}
function nowRow(r, point = 'base') {
  const w = state.wx.data?.[r.id]; if (!w) return null;
  const rows = hourlyRows(w[point], r); const k = denverNowKey();
  return rows.find(x => x.time >= k) || rows[0];
}

/* ---------- SVG charts ---------- */

function barChart(vals, labels, { h = 90, color = '#5b8db8', unit = '', fmtV = v => v.toFixed(1), barW = 26, gap = 6, labelEvery = 1, hi = null } = {}) {
  const max = Math.max(0.0001, ...vals.map(v => v ?? 0));
  const W = vals.length * (barW + gap);
  const top = 16, bot = 18, ch = h - top - bot;
  const bars = vals.map((v, i) => {
    const x = i * (barW + gap); const bh = v ? Math.max(2, v / max * ch) : 0; const y = top + ch - bh;
    const show = v && v >= max * 0.15;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="3" fill="${hi && hi(i) ? '#14283F' : color}"/>`
      + (show ? `<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" class="cv">${esc(fmtV(v))}</text>` : '')
      + (i % labelEvery === 0 ? `<text x="${x + barW / 2}" y="${h - 4}" text-anchor="middle" class="cl">${esc(labels[i])}</text>` : '');
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img">${bars}<line x1="0" x2="${W}" y1="${top + ch}" y2="${top + ch}" class="axis"/></svg>`;
}

function hourlyChart(rows) {
  const n = rows.length, bw = 9, gap = 3, W = n * (bw + gap), h = 150, top = 18, bot = 20, ch = h - top - bot;
  const sv = rows.map(r => snowVal(r.snowModel) || 0);
  const tv = rows.map(r => r.t == null ? null : (U() === 'imperial' ? r.t * 9 / 5 + 32 : r.t));
  const smax = Math.max(0.2, ...sv);
  const tt = tv.filter(v => v != null); const tmin = Math.min(...tt), tmax = Math.max(...tt), tr = Math.max(1, tmax - tmin);
  const ty = v => top + 6 + (1 - (v - tmin) / tr) * (ch - 12);
  let s = '';
  rows.forEach((r, i) => {
    const x = i * (bw + gap); const bh = sv[i] ? Math.max(2, sv[i] / smax * ch * 0.85) : 0;
    if (bh) s += `<rect x="${x}" y="${top + ch - bh}" width="${bw}" height="${bh}" rx="2" fill="#5b8db8"/>`;
    if (r.time.slice(11, 13) % 6 === 0) s += `<text x="${x + bw / 2}" y="${h - 5}" text-anchor="middle" class="cl">${esc(r.time.slice(11, 13) === '00' ? dayLabel(r.time.slice(0, 10)) : hourLabel(r.time))}</text><line x1="${x + bw / 2}" x2="${x + bw / 2}" y1="${top}" y2="${top + ch}" class="grid"/>`;
  });
  const pts = tv.map((v, i) => v == null ? null : `${i * (bw + gap) + bw / 2},${ty(v).toFixed(1)}`).filter(Boolean).join(' ');
  s += `<polyline points="${pts}" fill="none" stroke="#F28C38" stroke-width="2"/>`;
  const iMax = tv.indexOf(tmax), iMin = tv.indexOf(tmin);
  for (const i of [iMax, iMin]) s += `<text x="${i * (bw + gap) + bw / 2}" y="${ty(tv[i]) - 5}" text-anchor="middle" class="ct">${Math.round(tv[i])}°</text>`;
  const iS = sv.indexOf(Math.max(...sv));
  if (sv[iS] > 0) s += `<text x="${iS * (bw + gap) + bw / 2}" y="${top + ch - sv[iS] / smax * ch * 0.85 - 4}" text-anchor="middle" class="cv">${sv[iS].toFixed(1)}${snowUnit()}/h</text>`;
  return `<svg class="chart" viewBox="-16 0 ${W + 32} ${h}" width="${W + 32}" height="${h}" role="img">${s}<line x1="0" x2="${W}" y1="${top + ch}" y2="${top + ch}" class="axis"/></svg>`;
}

const meter = (open, total) => {
  if (open == null || !total) return `<div class="meter"><span style="width:0"></span></div>`;
  return `<div class="meter"><span style="width:${Math.min(100, open / total * 100).toFixed(1)}%"></span></div>`;
};

/* ---------- Render ---------- */

const PILL = { go: 'pass', caution: 'watch', nogo: 'fail', unknown: 'unk', info: 'info' };

function renderChrome() {
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.title = `SkiDay · ${t('q_title')}`;
  $('#btn-lang').textContent = t('lang');
  $('#btn-units').textContent = U() === 'imperial' ? '°F · in' : '°C · cm';
  const items = [['verdict', 'nav_verdict'], ['intel', 'nav_intel'], ['outlook', 'nav_outlook'], ['weather', 'nav_weather'], ['roads', 'nav_roads'], ['wear', 'nav_wear'], ['resorts', 'nav_resorts'], ['pack', 'nav_pack']];
  if (state.cfg?.shop?.enabled) items.push(['shop', 'nav_shop']);
  $('#nav').innerHTML = items.map(([id, k]) => `<a href="#${id}">${esc(t(k))}</a>`).join('');
  const BN = [['hero', '🎯', 'nav_verdict'], ['intel', '🏔️', 'nav_intel'], ['weather', '❄️', 'nav_weather'], ['roads', '🚗', 'nav_roads'], ['wear', '🧥', 'nav_wear']];
  $$('#bnav').innerHTML = BN.map(([id, ic, k]) => `<a href="#${id}"><i aria-hidden="true">${ic}</i><span>${esc(t(k))}</span></a>`).join('');
}

function reasonText(x) {
  const u = U(); const ev = x.ev ? (x.ev.tooltip || x.ev.title) : '';
  switch (x.key) {
    case 'r_heavy_snow': case 'r_snow_ok': return t(x.key, fmt.snow(x.val, u));
    case 'r_wind': case 'r_wind_ok': return t(x.key, fmt.wind(x.val, u));
    case 'r_cold': return t(x.key, fmt.temp(x.val, u));
    case 'r_nws': return t(x.key, x.alert.event);
    case 'r_resort_closed': return t(x.key, x.note ? ` · ${x.note}` : '');
    case 'r_limited': case 'r_lifts_ok': return t(x.key, `${x.val.open}/${x.val.total}`);
    default: return t(x.key, ev) + (x.ev?.oppDir ? ` (${t('opp_dir')})` : '');
  }
}

function renderVerdict() {
  const r = resort(); const v = verdict(r); const u = U();
  const intel = intelFor(r); const days = daysFor(r); const now = nowRow(r, 'base');
  const order = { nogo: 0, caution: 1, unknown: 2, info: 3, go: 4 };
  const reasons = [...v.reasons].sort((a, b) => order[a.level] - order[b.level]);
  const snow24 = intel?.ok && intel.snow?.h24 != null ? { v: fmt.snow(intel.snow.h24, u), k: 'st_newsnow' }
    : { v: days ? fmt.snow(days[0].summit.snow, u) : '—', k: 'st_newsnow_fc' };
  const lifts = intel?.ok && intel.lifts ? `${intel.lifts.open}<small>/${intel.lifts.total}</small>` : '—';
  const dm = driveMin(r);
  const drive = dm == null ? '—' : `${Math.floor(dm / 60)}h${String(dm % 60).padStart(2, '0')}`;
  const today = new Intl.DateTimeFormat(locale(), { timeZone: tz(), weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  const row = x => `<li class="rrow">
      <span class="pill-s p-${PILL[x.level]}">${esc(t(PILL[x.level]))}</span>
      ${x.ev?.detail || x.seg ? `<details><summary>${esc(reasonText(x))}</summary><p>${x.seg ? `<b>${esc(segName(r, x.seg))}</b><br>` : ''}${esc(x.ev?.detail || '')}</p></details>` : `<span>${esc(reasonText(x))}</span>`}
    </li>`;
  const bad = reasons.filter(x => x.level !== 'go'), good = reasons.filter(x => x.level === 'go');
  const hero = $$('#hero'); if (r.photo?.src) hero.style.setProperty('--hero-img', `url('${new URL(r.photo.src, location.href).href}')`);
  $$('#hero-credit').innerHTML = r.photo ? `📷 ${esc(r.photo.credit)} · <a href="${esc(r.photo.page)}" target="_blank" rel="noopener">${esc(r.photo.license)}</a>` : '';
  $('#verdict').innerHTML = `
    <div class="vpanel">
    <div class="banner">
      <span class="vbadge b-${v.level}">${esc(t(v.level))}</span>
      <div class="bmeta"><b>${esc(L(r.name))}</b><span>${esc(today)}</span></div>
    </div>
    <div class="tiles">
      <div class="tile"><span class="ti">❄️</span><b>${snow24.v}</b><span>${esc(t(snow24.k))}</span></div>
      <div class="tile"><span class="ti">🌡️</span><b>${now ? fmt.temp(now.t, u) : '—'}</b><span>${esc(t('st_basetemp'))}</span></div>
      <div class="tile"><span class="ti">🚡</span><b>${lifts}</b><span>${esc(t('st_lifts'))}</span>${intel?.ok && freshness('intel', r).cls === 'stale' ? `<small class="dnote stale">${esc(freshness('intel', r).text)}</small>` : ''}</div>
      <div class="tile"><span class="ti">🚗</span><b>${drive}</b><span>${esc(driveLabel(r))}</span><small class="dnote">${esc(t('drive_note'))} · <a href="https://www.cotrip.org/trip-planner" target="_blank" rel="noopener">COtrip ↗</a></small></div>
    </div>
    </div>
    <div class="why"><h3 class="ov">${esc(t('why_h'))}</h3>
    <ul class="rlist">${bad.map(row).join('')}${good.length ? `<li class="rrow"><span class="pill-s p-pass">${good.length}× ${esc(t('pass'))}</span><details><summary>${good.map(x => esc(t('k_' + x.kind) !== 'k_' + x.kind ? t('k_' + x.kind) : reasonText(x))).join(' · ')}</summary><ul class="evs">${good.map(x => `<li>✓ ${esc(reasonText(x))}</li>`).join('')}</ul></details></li>` : ''}</ul>
    ${reasons.some(x => x.kind === 'chain') ? `<details class="more"><summary>ⓘ ${esc(t('more_info'))}</summary><p class="small muted">${esc(t('traction_help'))}</p></details>` : ''}</div>`;
}

function renderResortCards() {
  const u = U();
  $('#resort-cards').innerHTML = state.cfg.resorts.map(r => {
    const v = verdict(r); const i = intelFor(r); const d = daysFor(r);
    const wk = d ? d.slice(0, 7).reduce((a, x) => a + (x.summit.snow || 0), 0) : null;
    const dm = driveMin(r);
    const today = d?.[0];
    return `<button type="button" class="rcard ${r.id === resort().id ? 'on' : ''}" data-resort="${r.id}" aria-pressed="${r.id === resort().id}">
      <span class="rphoto" style="background-image:url('${esc(r.photo?.src || '')}')">
        <span class="badge-v b-${v.level}">${esc(t(v.level))}</span>
        <span class="rname">${esc(r.short)}</span>
      </span>
      <span class="rbody">
        <span class="elev"><span><small>${esc(t('summit'))}</small><b>${today ? fmt.temp(today.summit.tMax, u) : '—'}</b></span><span><small>${esc(t('base'))}</small><b>${today ? fmt.temp(today.base.tMax, u) : '—'}</b></span></span>
        <span class="rstats">
          <span><i>🚡</i><b>${i?.ok && i.lifts ? `${i.lifts.open}/${i.lifts.total}` : '—'}</b><small>${esc(t('lifts'))}</small></span>
          <span><i>❄️</i><b>${i?.ok && i.snow?.h24 != null ? fmt.snow(i.snow.h24, u) : '—'}</b><small>24h</small></span>
          <span><i>📈</i><b>${wk != null ? fmt.snow(wk, u) : '—'}</b><small>${esc(t('fcst_7'))}</small></span>
          <span><i>🚗</i><b>${dm == null ? '—' : `${Math.floor(dm / 60)}h${String(dm % 60).padStart(2, '0')}`}</b><small>${esc(t('drive'))}*</small></span>
        </span>
      </span>
    </button>`;
  }).join('');
}

function renderIntel() {
  const r = resort(); const i = intelFor(r); const u = U(); const el = $('#intel');
  const head = `<div class="sec-h"><h2>${esc(t('intel_h'))} · ${esc(r.short)}</h2>${badge('intel', r)}</div>`;
  if (!i || !i.ok) {
    el.innerHTML = `${head}<p class="muted">${esc(t('intel_unavailable'))}${i?.error ? ` <span class="small">(${esc(i.error)})</span>` : ''} · <a href="${esc(r.links.report)}" target="_blank" rel="noopener">${esc(t('report'))} ↗</a></p>`;
    return;
  }
  const na = `<span class="na">${esc(t('unavailable_short'))}</span>`;
  const frac = o => o ? `${o.open}<small>/${o.total}</small>` : na;
  const status = i.status ? `<span class="pill-s p-${i.status === 'open' ? 'pass' : 'fail'}">${esc(t('status_' + i.status))}</span>` : na;
  const sn = i.snow || {};
  const snowTiles = [['h24', sn.h24], ['h48', sn.h48], ['d7', sn.d7], ['season_total', sn.season]];
  const smax = Math.max(0.1, ...snowTiles.map(x => x[1] ?? 0));
  const when = i.asOf ? t('as_of', fmtTime(i.asOf)) : t('checked', fmtTime(i.fetchedAt));
  el.innerHTML = `${head}
    <div class="igrid">
      <div class="itile"><span class="il">🚡 ${esc(t('lifts'))}</span><b>${frac(i.lifts)}</b>${i.lifts ? meter(i.lifts.open, i.lifts.total) : ''}</div>
      <div class="itile"><span class="il">⛷️ ${esc(t('runs'))}</span><b>${frac(i.trails)}</b>${i.trails ? meter(i.trails.open, i.trails.total) : ''}</div>
      <div class="itile"><span class="il">🗺️ ${esc(t('terrain'))}</span><b>${i.terrain?.pct != null ? `${i.terrain.pct}<small>%</small>` : na}</b>${i.terrain?.pct != null ? meter(i.terrain.pct, 100) : ''}${i.terrain?.totalAcres ? `<span class="sub">${i.terrain.openAcres ?? '—'} / ${i.terrain.totalAcres} ac</span>` : ''}</div>
      <div class="itile"><span class="il">🕘 ${esc(t('hours'))}</span><b class="sm">${i.hours ? esc(`${i.hours.open}–${i.hours.close}`.replace(/:00/g, '').replace(/ ?([AP])\.?M\.?/gi, (m, a) => a.toLowerCase() + 'm')) : na}</b>${i.hours?.scheduled ? `<span class="sub">${esc(t('hours_sched'))}</span>` : ''}</div>
      <div class="itile"><span class="il">📅 ${esc(t('season'))}</span><b class="sm">${status}</b>${i.note ? `<span class="sub">${esc(i.note)}</span>` : ''}</div>
      <div class="itile"><span class="il">📏 ${esc(t('base_depth'))}</span><b>${i.baseCm != null ? esc(fmt.snow(i.baseCm, u)) : na}</b>${i.surface ? `<span class="sub">${esc(t('surface'))}: ${esc(i.surface)}</span>` : ''}</div>
    </div>
    <h3>${esc(t('reported'))}</h3>
    <div class="sbars">${snowTiles.map(([k, v]) => `<div class="sbar"><div class="sb"><span style="height:${v ? Math.max(4, v / smax * 100) : 0}%"></span></div><b>${v != null ? esc(fmt.snow(v, u)) : na}</b><span>${esc(t(k))}</span></div>`).join('')}</div>
    <p class="note">${esc(t('source'))}: <a href="${esc(i.source?.url || r.links.report)}" target="_blank" rel="noopener">${esc(i.source?.name || r.short)}</a> · ${esc(when)}${i.snowAsOf ? ` · ❄️ ${esc(t('as_of', fmtTime(i.snowAsOf)))}` : ''}${!i.surface ? ` · ${esc(t('surface'))}: ${esc(t('unavailable'))}` : ''}</p>`;
}

function renderOutlook() {
  const u = U();
  const rows = state.cfg.resorts.map(r => {
    const i = intelFor(r); const d = daysFor(r);
    if (!d) return `<div class="orow"><b>${esc(r.short)}</b><span class="muted">${esc(t('r_wx_unavailable'))}</span></div>`;
    const sv = d.map(x => snowVal(x.summit.snow) || 0);
    const lab = d.map(x => dayLabel(x.date, { weekday: 'narrow' }));
    const a = sv.slice(0, 5), b = sv.slice(5, 10);
    const sum = arr => arr.reduce((x, y) => x + y, 0);
    const f = v => `${v.toFixed(v >= 10 ? 0 : 1)}${snowUnit()}`;
    const mx = Math.max(...sv, 0.1);
    const mini = (arr, labs) => `<div class="mini">${arr.map((v, k) => `<span title="${f(v)}"><i style="height:${v ? Math.max(6, v / mx * 100) : 0}%"></i><em>${esc(labs[k])}</em></span>`).join('')}</div>`;
    return `<div class="orow" data-resort="${r.id}">
      <div class="oname"><b>${esc(r.short)}</b><span class="small muted">${esc(t('last24'))}</span><b class="big">${i?.ok && i.snow?.h24 != null ? esc(fmt.snow(i.snow.h24, u)) : '—'}</b></div>
      <div class="oblk"><span class="small muted">${esc(t('next15'))} · <b>${f(sum(a))}</b></span>${mini(a, lab.slice(0, 5))}</div>
      <div class="oblk"><span class="small muted">${esc(t('next610'))} · <b>${f(sum(b))}</b></span>${mini(b, lab.slice(5, 10))}</div>
    </div>`;
  }).join('');
  $('#outlook').innerHTML = `<h2>${esc(t('outlook_h'))}</h2>${rows}<p class="note">Open-Meteo · ${esc(t('summit'))}</p>`;
}

function segCtl(name, opts, cur) {
  return `<div class="seg-ctl" data-ctl="${name}">${opts.map(([v, label]) => `<button type="button" data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${esc(label)}</button>`).join('')}</div>`;
}

function renderWeather() {
  const r = resort(); const u = U(); const el = $('#weather');
  const wx = state.wx.data?.[r.id];
  if (!wx) { el.innerHTML = `<h2>${esc(t('weather_h'))}</h2><p class="muted">${esc(t('r_wx_unavailable'))}</p>`; return; }
  const days = dailyRows(wx, r);
  const rows = hourlyRows(state.point === 'base' ? wx.base : wx.summit, r);
  const k = denverNowKey(); let s0 = rows.findIndex(x => x.time >= k); if (s0 < 0) s0 = 0;
  const hs = rows.slice(s0, s0 + 48);
  const sv = days.map(d => snowVal(d.summit.snow) || 0);
  const elev = state.point === 'base' ? fmt.elev(r.baseElevM, u) : fmt.elev(r.summitElevM, u);
  el.innerHTML = `<div class="sec-h"><h2>${esc(t('weather_h'))} · ${esc(r.short)}</h2>${badge('wx')}</div>
    <div class="row-sb"><h3>${esc(t('hourly_chart'))} · ${esc(elev)}</h3>${segCtl('point', [['summit', t('summit')], ['base', t('base')]], state.point)}</div>
    <div class="legend"><span class="lg-s"></span>${esc(t('legend_snow'))} <span class="lg-t"></span>${esc(t('legend_temp'))}</div>
    <div class="scroll">${hourlyChart(hs)}</div>
    <h3>${esc(t('daily_chart'))}</h3>
    <div class="scroll">${barChart(sv, days.map(d => dayLabel(d.date, { weekday: 'short' })), { h: 110, barW: 34, gap: 8, fmtV: v => v.toFixed(v >= 10 ? 0 : 1) + snowUnit(), hi: i => i === 0 })}</div>
    <div class="scroll"><div class="dchips">${days.map(d => `<div class="dchip"><b>${esc(dayLabel(d.date, { weekday: 'short' }))}</b><span>${weatherEmoji(d.code)}</span><span>${fmt.temp(d.summit.tMax, u)}</span><span class="muted">${fmt.temp(d.summit.tMin, u)}</span><span title="${esc(t('ratio'))}">${fmt.ratio(d.ratio)}</span><span class="muted" title="${esc(t('snowline'))}">⛰ ${fmt.elevRange(d.snowLineMin, d.snowLineMax, u)}</span></div>`).join('')}</div></div>
    <details class="more"><summary>ⓘ ${esc(t('more_info'))}</summary><p class="small muted">${esc(t('ratio_note'))}</p></details>`;
}

function ago(at) {
  const m = ageMin(at);
  if (!isFinite(m)) return '—';
  if (m < 1.5) return t('just_now');
  if (m < 90) return t('ago_min', Math.round(m));
  if (m < 48 * 60) return t('ago_h', Math.round(m / 60));
  return t('ago_d', Math.round(m / 1440));
}
function mtParts(d) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz(), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const g = k => p.find(x => x.type === k)?.value;
  return { day: `${g('year')}-${g('month')}-${g('day')}`, min: Number(g('hour')) * 60 + Number(g('minute')) };
}
/** Freshness of one section: cls ok | stale | na, plus a label (live / forecast / resort report / cached Xh ago / unavailable). */
function freshness(kind, r) {
  if (kind === 'intel') {
    const i = r && intelFor(r);
    if (!i || !i.ok) return { cls: 'na', text: t('b_na') };
    const at = i.fetchedAt || state.intel.at, m = ageMin(at), now = mtParts(new Date());
    const opHours = now.min >= 7 * 60 && now.min <= 16 * 60 + 30;
    const prevDay = isFinite(m) && mtParts(new Date(Date.now() - m * 60000)).day !== now.day && now.min >= 6 * 60; // yesterday's report, after 6 AM MT
    const stale = i.stale || (opHours && m > LIMIT.intel) || prevDay;
    return { cls: stale ? 'stale' : 'ok', text: stale ? t('b_cached', ago(at)) : t('b_report', ago(at)) };
  }
  const slot = state[kind];
  if (!slot?.data) return { cls: 'na', text: t('b_na') };
  if (ageMin(slot.at) > LIMIT[kind] || slot.status === 'stale') return { cls: 'stale', text: t('b_cached', ago(slot.at)) };
  return { cls: 'ok', text: t(kind === 'wx' ? 'b_forecast' : 'b_live', ago(slot.at)) };
}
const badge = (kind, r) => { const f = freshness(kind, r); return `<span class="age age-${f.cls}">${esc(f.text)}</span>`; };
/** One camera tile: visible "camera unavailable" on a broken/failed image, and the image's age. */
function camTile({ href, img, name, ts, broken, extra = '', title = '' }) {
  const m = ageMin(ts), old = isFinite(m) && m > 60;
  const age = isFinite(m) ? `<em class="cage${old ? ' old' : ''}">${esc(old ? `${t('cam_old')} ${ago(ts)}` : ago(ts))}</em>` : '';
  return `<a class="thumb${broken || !img ? ' na' : ''}" data-na="${esc(t('cam_na'))}" href="${esc(href)}" target="_blank" rel="noopener"${title ? ` title="${esc(title)}"` : ''}>
      ${img && !broken ? `<img loading="lazy" alt="${esc(name)}" src="${esc(camImg(img))}" onerror="this.parentNode.classList.add('na')">` : ''}${extra}${broken || !img ? '' : age}<span>${esc(name)}</span></a>`;
}
function camImg(src) { return src + (src.includes('?') ? '&' : '?') + 't=' + Math.floor(Date.now() / 120000); }

function segName(r, id) {
  const c = ctxFor(r);
  const seg = (c && c.segments[id]) || state.cfg.segments[id];
  return seg ? (seg.key ? `${seg.key} · ${km(seg.km * 1000)}` : L(seg.name)) : id;
}
function driveMin(r) {
  const rs = state.routes[r.id];
  if (rs?.status === 'ok') return Math.round(rs.route.durS / 60);
  if (isDefaultStart(state.cfg, state.start)) return r.driveMin;
  return null;
}
function driveLabel(r) {
  const rs = state.routes[r.id];
  if (rs?.status === 'ok') return t('st_drive_from');
  if (rs?.status === 'loading') return t('route_loading');
  return isDefaultStart(state.cfg, state.start) ? t('st_drive') : t('st_drive_from');
}
const km = (m, u = U()) => u === 'imperial' ? `${Math.round(m / 1609.34)} mi` : `${Math.round(m / 1000)} km`;
const camShort = n => n.replace(/^((?:I|US|CO|SH)[- ]\d+) MP [\d.]+ ?(?:[NSEW]B)? ?[:]? ?/, '$1 ');

function routeNoteHtml(r) {
  const rs = state.routes[r.id]; const c = ctxFor(r);
  if (!rs || rs.status === 'loading') return `<p class="rnote">${esc(t('route_loading'))}</p>`;
  if (rs.status === 'fail') return `<p class="rnote warn">⚠️ ${esc(t('route_fail'))}</p>`;
  const bits = [];
  if (!c.route.startsInCO) bits.push(`<p class="rnote warn">🗺️ ${esc(t('outside_co', km(c.route.coEntryAlongM || 0)))}</p>`);
  if (c.leaves) bits.push(`<p class="rnote warn">🗺️ ${esc(t('leaves_co'))}</p>`);
  return bits.join('');
}

function renderRoads() {
  const r = resort(); const cfg = state.cfg; const evs = state.roads.data; const el = $('#roads');
  const c = ctxFor(r);
  const segs = c ? c.segments : cfg.segments;
  const routeLegs = c ? c.legs : r.route;
  const evList = c ? c.events : evs;
  const allR = verdict(r).reasons;
  const icon = e => e.cls === 'chainLaws' ? '⛓️' : e.cls === 'roadClosures' ? '⛔' : e.cls === 'roadReports' ? '⚠️' : '❄️';
  const legs = routeLegs.map(leg => {
    const seg = segs[leg.seg];
    const list = evList ? evList.filter(e => e.segs.includes(leg.seg)) : [];
    const segR = allR.filter(x => x.seg === leg.seg);
    const lvl = !evs || seg.outside ? 'unknown' : !segR.length ? 'go' : segR.some(x => x.level === 'nogo') ? 'nogo' : segR.some(x => x.level === 'caution') ? 'caution' : 'info';
    const nm = c ? `${esc(seg.key)} <small class="muted">· ${km(seg.km * 1000)}</small>` : esc(L(seg.name));
    const name = `${nm}${seg.outside ? ` <small class="tag">${esc(t('outside_tag'))}</small>` : ''}${leg.alt ? ` <small class="muted">(${esc(t('alt'))})</small>` : ''}`;
    return `<li class="rrow"><span class="pill-s p-${PILL[lvl]}">${esc(t(PILL[lvl]))}</span>${list.length
      ? `<details><summary>${name} <small class="muted">· ${list.length}</small></summary><ul class="evs">${list.map(e => `<li>${icon(e)} ${esc(e.tooltip || e.title)}${e.oppDir ? ` <small class="tag">${esc(t('opp_dir'))}</small>` : ''}<br><small class="muted">${esc(e.detail)}</small></li>`).join('')}</ul></details>`
      : `<span>${name}</span>`}</li>`;
  }).join('');

  let camsHtml, camCount;
  if (c && c.cams) {
    camCount = c.cams.length;
    camsHtml = c.cams.length ? c.cams.map((m, i) => camTile({ href: `https://www.cotrip.org/camera/${m.id}`, img: m.img, name: camShort(m.name), title: m.name, ts: m.ts, broken: m.broken,
      extra: `<i class="num">${i + 1}</i><em class="km">${km(m.along)}</em>` })).join('')
      : `<p class="muted">${esc(t('cams_none'))}</p>`;
  } else {
    const meta = new Map((state.cams || []).map(x => [x.id, x]));
    const onRoute = new Set(r.route.map(x => x.seg));
    const list = cfg.cameras.filter(x => onRoute.has(x.seg));
    camCount = list.length;
    camsHtml = list.map(x => { const mm = meta.get(x.id); return camTile({ href: `https://www.cotrip.org/camera/${x.id}`, img: mm?.image || x.image, name: camShort(x.name), title: x.name, ts: mm?.ts, broken: mm?.broken }); }).join('');
  }
  const from = c ? L(state.start.name) : L(state.cfg.trip.origin.name);
  el.innerHTML = `<div class="sec-h"><h2>${esc(t('roads_h'))}</h2><span class="sub-h">${esc(from)} → ${esc(r.short)}${c ? ` · ${km(c.route.distM)}` : ''}</span>${badge('roads')}</div>
    ${routeNoteHtml(r)}
    ${c ? '' : `<details class="more"><summary>🧭 ${esc(t('route'))}</summary><p class="small">${esc(L(r.routeNote))}</p></details>`}
    <ul class="rlist">${legs}</ul>
    ${c ? `<div id="route-map" class="rmap" role="img" aria-label="${esc(t('map_label'))}"></div>` : ''}
    <h3>📷 ${esc(c ? t('cams_route') : t('cameras'))} <small class="muted">(${camCount})</small></h3>
    <div class="thumbs">${camsHtml}</div>
    <p class="note">🚗 ${esc(t('drive_note_long'))} <a href="https://www.cotrip.org/trip-planner" target="_blank" rel="noopener">${esc(t('cotrip_tt'))} ↗</a></p>
    <p class="note">CDOT COtrip · ${state.roads.data ? `${esc(fmtTime(state.roads.at))} (${esc(ago(state.roads.at))})` : esc(t('unavailable'))}${c ? ` · ${esc(t('route_src'))} <a href="https://project-osrm.org/" target="_blank" rel="noopener">OSRM</a> (© OpenStreetMap)` : ''} · <a href="https://www.cotrip.org/" target="_blank" rel="noopener">${esc(t('open_cotrip'))} ↗</a> · <a href="https://www.cotrip.org/road-conditions" target="_blank" rel="noopener">${esc(t('cotrip_cond'))} ↗</a></p>`;
  if (c) mountMap(c);
}

/* ---------- Route map (Leaflet + OSM tiles), lazy-loaded when the roads section is near ---------- */
let leafletP = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletP) return leafletP;
  leafletP = new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'vendor/leaflet/leaflet.css'; document.head.appendChild(css);
    const js = document.createElement('script'); js.src = 'vendor/leaflet/leaflet.js'; js.onload = () => res(window.L); js.onerror = rej; document.head.appendChild(js);
  });
  return leafletP;
}
let mapObserver = null;
function mountMap(c) {
  const el = document.getElementById('route-map'); if (!el) return;
  const draw = () => loadLeaflet().then(Lf => {
    if (!document.body.contains(el)) return;
    if (state.map) { try { state.map.remove(); } catch {} }
    const m = Lf.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
    state.map = m;
    // Tile provider is config (resorts.json sources.tiles / tilesAttribution), so a keyed commercial provider can replace OSM's servers.
    const fix = ' · <a href="https://www.openstreetmap.org/fixthemap">Report a map error</a>';
    Lf.tileLayer(state.cfg.sources.tiles || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 15, attribution: (state.cfg.sources.tilesAttribution || '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors') + fix }).addTo(m);
    const line = Lf.polyline(c.route.pts.map(p => [p[1], p[0]]), { color: '#14283F', weight: 4, opacity: .85 }).addTo(m);
    const a = c.route.pts[0], b = c.route.pts[c.route.pts.length - 1];
    Lf.circleMarker([a[1], a[0]], { radius: 7, color: '#fff', weight: 2, fillColor: '#25845A', fillOpacity: 1 }).addTo(m).bindTooltip(L(state.start.name));
    Lf.circleMarker([b[1], b[0]], { radius: 8, color: '#fff', weight: 2, fillColor: '#F28C38', fillOpacity: 1 }).addTo(m).bindTooltip(resort().short);
    (c.cams || []).forEach((x, i) => Lf.marker([x.lat, x.lon], { icon: Lf.divIcon({ className: 'cam-pin', html: `<b>${i + 1}</b>`, iconSize: [20, 20] }) })
      .addTo(m).bindPopup(`<b>${esc(x.name)}</b><br><img src="${esc(camImg(x.img))}" width="200" alt="">`));
    m.fitBounds(line.getBounds(), { padding: [16, 16] });
  }).catch(() => { el.innerHTML = `<p class="muted small">${esc(t('unavailable'))}</p>`; });
  mapObserver?.disconnect();
  if (!('IntersectionObserver' in window)) { draw(); return; }
  mapObserver = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { mapObserver.disconnect(); draw(); } }, { rootMargin: '300px' });
  mapObserver.observe(el);
}

/* ---------- Start location + routing ---------- */
let routeGen = 0;
async function routeAll() {
  const gen = ++routeGen; const start = state.start;
  const order = [resort(), ...state.cfg.resorts.filter(r => r.id !== resort().id)];
  for (const r of order) {
    const key = `${start.lat.toFixed(3)},${start.lon.toFixed(3)}>${r.id}`;
    if (state.routes[r.id]?.key === key && state.routes[r.id].status === 'ok') continue;
    state.routes[r.id] = { status: 'loading', key };
    if (r.id === resort().id) { safe('verdict', renderVerdict); safe('roads', renderRoads); safe('start', updateStartMsg); }
    try {
      const route = await getRoute(state.cfg, start, r);
      if (gen !== routeGen) return;
      state.routes[r.id] = { status: 'ok', key, route };
    } catch (e) {
      if (gen !== routeGen) return;
      state.routes[r.id] = { status: 'fail', key, error: String(e.message || e) };
    }
    renderAll();
  }
}
function updateStartMsg() {
  if (!state.startUI) return;
  const r = resort(); const rs = state.routes[r.id];
  let h = '';
  if (rs?.status === 'ok') { const dm = Math.round(rs.route.durS / 60); h = `→ <b>${esc(r.short)}</b> · ${km(rs.route.distM)} · ~${Math.floor(dm / 60)}h${String(dm % 60).padStart(2, '0')} <span class="muted">${esc(t('route_est'))}</span>`; }
  else if (rs?.status === 'loading') h = `<span class="muted">${esc(t('route_loading'))}</span>`;
  else if (rs?.status === 'fail') h = `<span class="warn">⚠️ ${esc(t('route_fail'))}</span>`;
  state.startUI.setMsg(h);
}
function setStart(s) {
  state.start = s; saveStart(s); track('start_select', s.kind === 'preset' ? s.id : 'custom'); /* never the address or coordinates */ state.routes = {}; ctxMemo.clear();
  state.startUI?.relabel();
  if (state.view === 'dash') { renderAll(); routeAll(); } else renderView();
}
async function loadCams() {
  try {
    const bust = `?v=${Math.floor(Date.now() / 300e3)}`;
    const { j } = await getFirst([`${API}cameras.json${bust}`, `${state.cfg.sources.cameras}${bust}`]);
    if (!j.cameras?.length) throw new Error('empty');
    state.camsAll = j.cameras; state.camsAt = j.generatedAt;
  } catch {
    try { // fallback: the live statewide list (CORS-enabled)
      const j = await getJson(`${state.cfg.sources.cars}/cameras/map-features`, 30000);
      state.camsAll = (j.features || []).filter(f => f.properties?.public).map(f => { const p = f.properties, v = p.views.find(x => !x.broken) || p.views[0];
        return { id: p.id, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], name: p.name, route: p.route, local: !!p.location?.localRoad, img: v && (v.type === 'STILL_IMAGE' ? v.url : v.videoPreviewUrl), broken: p.views.every(x => x.broken), ts: v?.imageTimestamp || null }; });
    } catch { state.camsAll = null; }
  }
  ctxMemo.clear();
}

const WICON = { w_base_light: '👕', w_base_mid: '👕', w_base_heavy: '👕', w_mid_fleece_opt: '🧶', w_mid_fleece: '🧶', w_mid_puffy: '🧥', w_shell: '🧥', w_jacket_insulated: '🧥',
  w_gaiter: '🧣', w_balaclava: '🥷', w_facemask: '😷', w_gloves: '🧤', w_gloves_warm: '🧤', w_mittens: '🧤', w_handwarmers: '🔥', w_toewarmers: '🔥', w_socks: '🧦', w_helmet_goggles: '🥽', w_spare_gloves: '🎒' };
const NICON = { n_kid_breaks: '☕', n_frostbite: '👃', n_wind: '💨', n_snow_lens: '🟡', n_sun_lens: '🕶️', n_sunscreen: '🧴', n_warm_vent: '🌤️' };
const BAND = { mild: '🙂', cold: '🥶', verycold: '❄️', extreme: '🧊', unknown: '?' };
const LAYER = k => /^w_base/.test(k) ? 'base' : /^w_mid/.test(k) ? 'mid' : /^w_(shell|jacket)/.test(k) ? 'outer' : 'extra';

function outfitCol(keys, who) {
  const g = { base: [], mid: [], outer: [], extra: [] };
  keys.forEach(k => g[LAYER(k)].push(k));
  const chip = k => `<span class="wi" title="${esc(t(k))}"><i>${WICON[k] || '•'}</i>${esc(t('s_' + k))}</span>`;
  return `<div class="wcol"><div class="who">${who}</div>
    ${['base', 'mid', 'outer'].map(l => `<div class="layer l-${l}"><span class="ln">${esc(t('wear_layers_' + l))}</span>${g[l].map(chip).join('') || '<span class="muted small">—</span>'}</div>`).join('')}
    <div class="extras">${g.extra.map(chip).join('')}</div></div>`;
}

function renderWear() {
  const r = resort(); const u = U(); const days = daysFor(r); const el = $('#wear');
  if (!days) { el.innerHTML = `<h2>${esc(t('wear_h'))}</h2><p class="muted">${esc(t('r_wx_unavailable'))}</p>`; return; }
  const card = (d, i) => {
    const o = outfitFor(d);
    return `<article class="wcard band-${o.band}">
      <header><b>${i === 0 ? esc(t('wear_today')) : esc(dayLabel(d.date, { weekday: 'short', month: 'numeric', day: 'numeric' }))}</b>
        <span class="wtemp">${BAND[o.band]} ${fmt.temp(d.summit.feelsMin, u)}</span><span class="badge band-${o.band}">${esc(t('band_' + o.band))}</span></header>
      <div class="wcols">${outfitCol(o.adult, '👩 ' + esc(t('adults')))}${outfitCol(o.kid, '🧒 ' + esc(t('kids')))}</div>
      <div class="wnotes">${o.notes.map(k => `<span class="wi n" title="${esc(t(k))}"><i>${NICON[k] || '•'}</i>${esc(t('s_' + k))}</span>`).join('')}</div>
    </article>`;
  };
  el.innerHTML = `<h2>${esc(t('wear_h'))} · ${esc(r.short)}</h2>
    <div class="scroll"><div class="wtrack">${days.slice(0, 7).map(card).join('')}</div></div>
    <p class="note">°=${esc(t('feels_top', '').replace(/\s+/g, ' ').trim())} · ${esc(t('wear_kid_plus'))}</p>`;
}

function renderResorts() {
  const sel = resort(); const others = state.cfg.resorts.filter(r => r.id !== sel.id);
  const block = r => `<div class="links"><b>${esc(L(r.name))}</b>
      <a href="${esc(r.links.webcams)}" target="_blank" rel="noopener">${esc(t('official'))} ↗</a>
      <a href="${esc(r.links.report)}" target="_blank" rel="noopener">${esc(t('report'))} ↗</a></div>
    <div class="thumbs">${r.webcams.map(w => w.youtube
      ? `<div class="thumb yt" data-yt="${esc(w.youtube)}" role="button" tabindex="0" aria-label="${esc(t('play'))}"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/${esc(w.youtube)}/hqdefault_live.jpg"><b class="play">▶</b><span>${esc(L(w.name))}</span></div>`
      : camTile({ href: w.live || r.links.webcams, img: w.image, name: L(w.name), extra: w.live ? '<b class="play">▶</b>' : '' })).join('')}</div>`;
  $('#resorts').innerHTML = `<h2>${esc(t('cams_h'))}</h2>${block(sel)}
    <details class="more"><summary>${esc(t('show_all'))}</summary>${others.map(block).join('')}</details>`;
}

/* ---------- Packing ---------- */
function packItems() {
  let items = LS.get('pack', null);
  if (!Array.isArray(items)) items = PACK_DEFAULT.map((x, i) => ({ id: 'd' + i, def: i, done: false }));
  return items;
}
function renderPack() {
  const items = packItems();
  const text = it => it.def != null && PACK_DEFAULT[it.def] ? PACK_DEFAULT[it.def][state.lang] : it.text;
  $('#pack').innerHTML = `<h2>🎒 ${esc(t('pack_h'))} <small class="muted">${items.filter(i => i.done).length}/${items.length}</small></h2>
    <details class="more" open><summary class="small muted">${esc(t('pack_sub'))}</summary>
    <ul class="pack-list">${items.map(it => `<li class="${it.done ? 'done' : ''}" data-id="${esc(it.id)}"><input type="checkbox" id="pk-${esc(it.id)}" ${it.done ? 'checked' : ''}><label for="pk-${esc(it.id)}">${esc(text(it))}</label><button class="x" type="button" aria-label="Remove">×</button></li>`).join('')}</ul>
    <form class="pack-add" id="pack-form"><input id="pack-input" maxlength="140" placeholder="${esc(t('add_item'))}"><button class="btn primary" type="submit">${esc(t('add'))}</button></form>
    <p><button class="btn small" type="button" id="pack-reset">${esc(t('reset'))}</button></p></details>`;
}
function bindPack() {
  const body = $('#pack');
  body.addEventListener('change', e => {
    if (e.target.type !== 'checkbox') return;
    const id = e.target.closest('li').dataset.id; const items = packItems();
    const it = items.find(x => x.id === id); if (it) it.done = e.target.checked; LS.set('pack', items); renderPack();
  });
  body.addEventListener('click', e => {
    if (e.target.classList.contains('x')) { const id = e.target.closest('li').dataset.id; LS.set('pack', packItems().filter(x => x.id !== id)); renderPack(); }
    else if (e.target.id === 'pack-reset') { LS.set('pack', null); renderPack(); }
  });
  body.addEventListener('submit', e => {
    e.preventDefault(); const v = $('#pack-input').value.trim(); if (!v) return;
    const items = packItems(); items.push({ id: 'u' + Date.now(), text: v, done: false }); LS.set('pack', items); renderPack();
  });
}

function renderSources() {
  const via = m => t(m === 'live' ? 'via_live' : m === 'server' ? 'via_server' : 'via_snapshot');
  const cls = f => f.cls === 'ok' ? 'ok' : f.cls === 'stale' ? 'snap' : 'bad';
  const item = (k, slot) => { const f = freshness(slot), s = state[slot];
    return `<span class="${cls(f)}">${esc(t(k))}: ${esc(f.text)}${s.data ? ` · ${esc(fmtTime(s.at))} · ${esc(via(s.mode))}` : ''}</span>`; };
  const fi = freshness('intel', resort());
  $('#sources').innerHTML = item('src_roads', 'roads') + item('src_weather', 'wx') + item('src_alerts', 'alerts')
    + `<span class="${cls(fi)}">${esc(t('intel_h'))}: ${esc(fi.text)}${state.intel.at ? ` · ${esc(fmtTime(state.intel.at))} · ${esc(via(state.intel.mode))}` : ''}</span>`
    + (state.camsAt ? `<span class="${ageMin(state.camsAt) > 60 ? 'snap' : 'ok'}">${esc(t('cameras'))}: ${esc(t('cam_list'))} ${esc(ago(state.camsAt))}</span>` : '');
  $('#credits').innerHTML = state.cfg.resorts.filter(r => r.photo).map(r => `${esc(r.short)} ${esc(t('photo_by', r.photo.credit))}, <a href="${esc(r.photo.page)}" target="_blank" rel="noopener">Wikimedia Commons</a>, <a href="${esc(r.photo.licenseUrl)}" target="_blank" rel="noopener">${esc(r.photo.license)}</a>`).join(' · ');
}

/** Run one section renderer; a failure shows a short note in that section instead of breaking the page. */
function safe(id, fn) {
  try { fn(); }
  catch (e) {
    console.warn(`[ski] ${id} failed:`, e);
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<p class="muted small">${esc(t('unavailable'))} (${esc(id)})</p>`;
  }
}
function renderAll() {
  safe('nav', renderChrome);
  safe('start', () => { state.startUI?.relabel(); updateStartMsg(); });
  safe('verdict', renderVerdict); safe('mountains', renderResortCards); safe('intel', renderIntel); safe('outlook', renderOutlook);
  safe('weather', renderWeather); safe('roads', renderRoads); safe('wear', renderWear); safe('resorts', renderResorts);
  safe('pack', renderPack); safe('sources', renderSources);
}

function bind() {
  $('#btn-lang').onclick = () => { state.lang = state.lang === 'zh' ? 'en' : 'zh'; LS.set('lang', state.lang); renderView(); track('lang_toggle', state.lang); };
  $('#btn-units').onclick = () => { state.units = U() === 'imperial' ? 'metric' : 'imperial'; LS.set('units', state.units); renderView(); track('unit_toggle', state.units); };
  $('#btn-refresh').onclick = () => { if (state.view === 'dash') refresh(); else { const b = $('#btn-refresh'); b.classList.add('spin'); loadConditions(true).finally(() => { b.classList.remove('spin'); renderView(); }); } };
  document.addEventListener('click', e => {
    const rc = e.target.closest('[data-resort]');
    if (rc && !e.target.closest('details')) { state.resort = rc.dataset.resort; LS.set('resort', state.resort); track('resort_select', state.resort); try { addRecent(state.resort); history.replaceState({ resort: state.resort }, '', `?resort=${encodeURIComponent(state.resort)}`); } catch {} renderAll(); routeAll(); if (rc.classList.contains('orow') || rc.classList.contains('rcard')) $('#verdict').scrollIntoView({ behavior: 'smooth' }); return; }
    const b = e.target.closest('.seg-ctl button');
    if (b && !b.closest('#basic')) { if (b.parentElement.dataset.ctl === 'point') { state.point = b.dataset.v; LS.set('point', state.point); } renderWeather(); return; }
    const yt = e.target.closest('.yt[data-yt]');
    if (yt && !yt.querySelector('iframe')) yt.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt.dataset.yt)}?autoplay=1&mute=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="live"></iframe>`;
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.yt[data-yt]')) { e.preventDefault(); e.target.click(); } });
  bindPack();
  const tick = () => { if (state.view === 'dash') refresh(); else loadConditions(true).then(() => { if (state.view !== 'dash') renderView(); }); };
  setInterval(() => { if (!document.hidden) tick(); }, 10 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - state.lastLive > 10 * 60 * 1000) { state.lastLive = Date.now(); tick(); } });
}

/* ---------- Views: discovery (default) | full dashboard (?resort=<full id>) | basic resort view ---------- */
let dashLoaded = false;
function setBodyView(v) {
  state.view = v;
  document.body.classList.remove('v-disc', 'v-dash', 'v-basic');
  document.body.classList.add(`v-${v}`);
  if (v !== 'disc') document.body.classList.remove('dmap-full');
}
function renderView() {
  safe('nav', renderChrome);
  if (state.view === 'dash') renderAll();
  else if (state.view === 'basic') safe('basic', renderBasic);
  else safe('discover', renderDiscover);
}
async function showDash(id) {
  setBodyView('dash');
  if (state.resort !== id) { state.resort = id; LS.set('resort', id); }
  safe('nav', renderChrome);
  if (!dashLoaded) {
    dashLoaded = true;
    $$('#verdict').innerHTML = '<div class="skeleton"></div>';
    await Promise.allSettled([loadServer(), loadCams()]);
    renderAll();
    routeAll().catch(e => console.warn('[ski] routing failed:', e));
    try { await loadLiveFallback(); } catch (e) { console.warn('[ski] live fallback failed:', e); }
    state.lastLive = Date.now();
    renderAll();
  } else { renderAll(); routeAll().catch(() => {}); }
}
/** Route from the URL (?resort=<id|name>); push=true adds a history entry. */
async function route(push) {
  const q = new URLSearchParams(location.search).get('resort');
  const full = q && state.cfg.resorts.find(r => r.id === q);
  const cr = !full && q ? resolveResort(q) : null;
  window.scrollTo(0, 0);
  if (full || cr?.detail === 'full') { const id = full ? full.id : cr.id; addRecent(id); await showDash(id); }
  else if (cr) { addRecent(cr.id); setBodyView('basic'); safe('nav', renderChrome); await showBasic(cr.id); }
  else { setBodyView('disc'); safe('nav', renderChrome); renderDiscover(); }
}
function openResort(id) {
  track('resort_select', id);
  try { history.pushState({ resort: id }, '', `?resort=${encodeURIComponent(id)}`); } catch { location.search = `?resort=${encodeURIComponent(id)}`; return; }
  route();
}
function goHome() {
  try { history.pushState({}, '', location.pathname); } catch {}
  route();
}

(async function main() {
  try { state.cfg = await getJson(`data/resorts.json?v=${Math.floor(Date.now() / 600000)}`); }
  catch { window.__skiReady = true; $$('#verdict').innerHTML = `<div class="why"><p>${esc(t('unavailable'))}: resorts.json · <a href="" onclick="location.reload();return false">↻</a></p></div>`; return; }
  if (!state.cfg.resorts.some(r => r.id === state.resort)) state.resort = state.cfg.resorts[0].id;
  try { state.start = loadStart(state.cfg); } catch { state.start = { ...state.cfg.trip.origin, kind: 'preset' }; }
  try { if ($('#start')) state.startUI = mountStartUI($('#start'), { cfg: state.cfg, t, L, getStart: () => state.start, onChange: setStart }); }
  catch (e) { console.warn('[ski] start UI failed:', e); }
  initDiscover({ state, L, getJson, track, loadLeaflet, getStart: () => state.start, setStart, open: openResort, home: goHome, view: () => state.view });
  try { bind(); } catch (e) { console.warn('[ski] bind failed:', e); }
  document.querySelector('.brand')?.addEventListener('click', e => { e.preventDefault(); goHome(); });
  $$('#dash-back').addEventListener('click', e => { e.preventDefault(); goHome(); });
  window.addEventListener('popstate', () => route());
  safe('nav', renderChrome);
  const q = new URLSearchParams(location.search).get('resort');
  const isFull = q && state.cfg.resorts.some(r => r.id === q);
  // Discovery needs the catalog; the full dashboard can start without it.
  const catP = loadCatalog().catch(e => { console.warn('[ski] catalog failed:', e); });
  const condP = loadConditions().catch(() => {});
  if (!isFull) await Promise.all([catP, condP]);
  await route();
  window.__skiReady = true;
  track('page_view', state.lang);
  if (isFull) { await Promise.all([catP, condP]); }
})();
