import { openMeteoUrl, splitOpenMeteo, dailyRows, hourlyRows, weatherEmoji, carsUrl, slimEvents, EVENT_CLASSES,
  nwsUrl, slimAlerts, verdictFor, outfitFor, fmt } from './core.js';
import { STR, PACK_DEFAULT } from './i18n.js';

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
  intel: { data: {}, at: null }, cams: null, refreshing: false, lastLive: 0
};

const $ = s => document.querySelector(s);
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

async function loadSnapshot() {
  const bust = `?v=${Math.floor(Date.now() / 300000)}`;
  const [snap, intel] = await Promise.allSettled([getJson('data/latest.json' + bust), getJson((state.cfg.sources.intel || 'data/intel.json') + bust)]);
  if (snap.status === 'fulfilled') {
    const s = snap.value;
    if (s.sources?.weather?.ok && s.weather && !state.wx.data) state.wx = { data: s.weather, mode: 'snapshot', at: s.sources.weather.fetchedAt };
    if (s.sources?.roads?.ok && s.roads && !state.roads.data) state.roads = { data: s.roads.events, mode: 'snapshot', at: s.sources.roads.fetchedAt };
    if (s.alerts && !state.alerts.data && Object.values(s.alerts).some(v => v)) state.alerts = { data: s.alerts, mode: 'snapshot', at: s.sources.alerts?.fetchedAt };
    if (s.cameras) state.cams = s.cameras;
  }
  if (intel.status === 'fulfilled') {
    for (const [id, v] of Object.entries(intel.value.resorts || {})) state.intel.data[id] = v;
    state.intel.at = intel.value.generatedAt;
  }
}

async function loadLive() {
  const cfg = state.cfg;
  await Promise.all([
    getJson(openMeteoUrl(cfg)).then(j => { const d = splitOpenMeteo(cfg, j); if (!Object.keys(d).length) throw new Error('empty'); state.wx = { data: d, mode: 'live', at: new Date().toISOString() }; })
      .catch(e => { state.wx.error = String(e.message || e); }),
    Promise.all(EVENT_CLASSES.map(c => getJson(carsUrl(cfg, c), 30000).then(j => slimEvents(cfg, c, j))))
      .then(all => { state.roads = { data: all.flat(), mode: 'live', at: new Date().toISOString() }; })
      .catch(e => { state.roads.error = String(e.message || e); }),
    Promise.all(cfg.resorts.map(r => getJson(nwsUrl(cfg, r)).then(j => [r.id, slimAlerts(j)])))
      .then(all => { state.alerts = { data: Object.fromEntries(all), mode: 'live', at: new Date().toISOString() }; })
      .catch(e => { state.alerts.error = String(e.message || e); }),
    // Resort intel comes from the hourly snapshot (data/intel.json); a live browser fetch of the
    // Steamboat feed was intermittently missing CORS headers and spammed the console.
    getJson((state.cfg.sources.intel || 'data/intel.json') + `?v=${Date.now()}`).then(j => { Object.assign(state.intel.data, j.resorts || {}); state.intel.at = j.generatedAt; }).catch(() => {})
  ]);
  state.lastLive = Date.now();
}

async function refresh() {
  if (state.refreshing) return;
  state.refreshing = true; $('#btn-refresh').classList.add('spin');
  try { await loadLive(); } finally { state.refreshing = false; $('#btn-refresh').classList.remove('spin'); renderAll(); }
}

/* ---------- Derived ---------- */

function daysFor(r) { const w = state.wx.data?.[r.id]; try { return w ? dailyRows(w, r) : null; } catch { return null; } }
function intelFor(r) { return state.intel.data[r.id] || null; }
function verdict(r) {
  return verdictFor(state.cfg, r, {
    roads: state.roads.data ? { ok: true, events: state.roads.data } : { ok: false },
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

function barChart(vals, labels, { h = 90, color = '#3b82f6', unit = '', fmtV = v => v.toFixed(1), barW = 26, gap = 6, labelEvery = 1, hi = null } = {}) {
  const max = Math.max(0.0001, ...vals.map(v => v ?? 0));
  const W = vals.length * (barW + gap);
  const top = 16, bot = 18, ch = h - top - bot;
  const bars = vals.map((v, i) => {
    const x = i * (barW + gap); const bh = v ? Math.max(2, v / max * ch) : 0; const y = top + ch - bh;
    const show = v && v >= max * 0.15;
    return `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="3" fill="${hi && hi(i) ? '#1d4ed8' : color}"/>`
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
    if (bh) s += `<rect x="${x}" y="${top + ch - bh}" width="${bw}" height="${bh}" rx="2" fill="#60a5fa"/>`;
    if (r.time.slice(11, 13) % 6 === 0) s += `<text x="${x + bw / 2}" y="${h - 5}" text-anchor="middle" class="cl">${esc(r.time.slice(11, 13) === '00' ? dayLabel(r.time.slice(0, 10)) : hourLabel(r.time))}</text><line x1="${x + bw / 2}" x2="${x + bw / 2}" y1="${top}" y2="${top + ch}" class="grid"/>`;
  });
  const pts = tv.map((v, i) => v == null ? null : `${i * (bw + gap) + bw / 2},${ty(v).toFixed(1)}`).filter(Boolean).join(' ');
  s += `<polyline points="${pts}" fill="none" stroke="#f97316" stroke-width="2"/>`;
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
    default: return t(x.key, ev);
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
  const drive = `${Math.floor(r.driveMin / 60)}h${String(r.driveMin % 60).padStart(2, '0')}`;
  const today = new Intl.DateTimeFormat(locale(), { timeZone: tz(), weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  const row = x => `<li class="rrow">
      <span class="pill-s p-${PILL[x.level]}">${esc(t(PILL[x.level]))}</span>
      ${x.ev?.detail || x.seg ? `<details><summary>${esc(reasonText(x))}</summary><p>${x.seg ? `<b>${esc(L(state.cfg.segments[x.seg].name))}</b><br>` : ''}${esc(x.ev?.detail || '')}</p></details>` : `<span>${esc(reasonText(x))}</span>`}
    </li>`;
  const bad = reasons.filter(x => x.level !== 'go'), good = reasons.filter(x => x.level === 'go');
  $('#verdict').innerHTML = `
    <div class="banner b-${v.level}">
      <div class="bword">${esc(t(v.level))}</div>
      <div class="bmeta"><b>${esc(L(r.name))}</b><span>${esc(today)}</span></div>
    </div>
    <div class="tiles">
      <div class="tile"><span class="ti">❄️</span><b>${snow24.v}</b><span>${esc(t(snow24.k))}</span></div>
      <div class="tile"><span class="ti">🌡️</span><b>${now ? fmt.temp(now.t, u) : '—'}</b><span>${esc(t('st_basetemp'))}</span></div>
      <div class="tile"><span class="ti">🚡</span><b>${lifts}</b><span>${esc(t('st_lifts'))}</span></div>
      <div class="tile"><span class="ti">🚗</span><b>${drive}</b><span>${esc(t('st_drive'))}</span></div>
    </div>
    <ul class="rlist">${bad.map(row).join('')}${good.length ? `<li class="rrow"><span class="pill-s p-pass">${good.length}× ${esc(t('pass'))}</span><details><summary>${good.map(x => esc(t('k_' + x.kind) !== 'k_' + x.kind ? t('k_' + x.kind) : reasonText(x))).join(' · ')}</summary><ul class="evs">${good.map(x => `<li>✓ ${esc(reasonText(x))}</li>`).join('')}</ul></details></li>` : ''}</ul>
    ${reasons.some(x => x.kind === 'chain') ? `<details class="more"><summary>ⓘ ${esc(t('more_info'))}</summary><p class="small muted">${esc(t('traction_help'))}</p></details>` : ''}`;
}

function renderResortCards() {
  const u = U();
  $('#resort-cards').innerHTML = state.cfg.resorts.map(r => {
    const v = verdict(r); const i = intelFor(r); const d = daysFor(r);
    const wk = d ? d.slice(0, 7).reduce((a, x) => a + (x.summit.snow || 0), 0) : null;
    return `<button type="button" class="rcard ${r.id === resort().id ? 'on' : ''}" data-resort="${r.id}" style="background-image:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(0,0,0,.72)),url('${esc(r.photo?.src || '')}')">
      <span class="badge-v b-${v.level}">${esc(t(v.level))}</span>
      <span class="rname">${esc(r.short)}</span>
      <span class="rchips">
        <span>🚡 ${i?.ok && i.lifts ? `${i.lifts.open}/${i.lifts.total}` : '—'}</span>
        <span>❄️ ${i?.ok && i.snow?.h24 != null ? fmt.snow(i.snow.h24, u) : '—'} <small>24h</small></span>
        <span>📈 ${wk != null ? fmt.snow(wk, u) : '—'} <small>${esc(t('fcst_7'))}</small></span>
      </span>
    </button>`;
  }).join('');
}

function renderIntel() {
  const r = resort(); const i = intelFor(r); const u = U(); const el = $('#intel');
  const head = `<h2>${esc(t('intel_h'))} · ${esc(r.short)}</h2>`;
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
  el.innerHTML = `<h2>${esc(t('weather_h'))} · ${esc(r.short)}</h2>
    <div class="row-sb"><h3>${esc(t('hourly_chart'))} · ${esc(elev)}</h3>${segCtl('point', [['summit', t('summit')], ['base', t('base')]], state.point)}</div>
    <div class="legend"><span class="lg-s"></span>${esc(t('legend_snow'))} <span class="lg-t"></span>${esc(t('legend_temp'))}</div>
    <div class="scroll">${hourlyChart(hs)}</div>
    <h3>${esc(t('daily_chart'))}</h3>
    <div class="scroll">${barChart(sv, days.map(d => dayLabel(d.date, { weekday: 'short' })), { h: 110, barW: 34, gap: 8, fmtV: v => v.toFixed(v >= 10 ? 0 : 1) + snowUnit(), hi: i => i === 0 })}</div>
    <div class="scroll"><div class="dchips">${days.map(d => `<div class="dchip"><b>${esc(dayLabel(d.date, { weekday: 'short' }))}</b><span>${weatherEmoji(d.code)}</span><span>${fmt.temp(d.summit.tMax, u)}</span><span class="muted">${fmt.temp(d.summit.tMin, u)}</span><span title="${esc(t('ratio'))}">${fmt.ratio(d.ratio)}</span><span class="muted" title="${esc(t('snowline'))}">⛰ ${fmt.elevRange(d.snowLineMin, d.snowLineMax, u)}</span></div>`).join('')}</div></div>
    <details class="more"><summary>ⓘ ${esc(t('more_info'))}</summary><p class="small muted">${esc(t('ratio_note'))}</p></details>`;
}

function camImg(src) { return src + (src.includes('?') ? '&' : '?') + 't=' + Math.floor(Date.now() / 120000); }

function renderRoads() {
  const r = resort(); const cfg = state.cfg; const evs = state.roads.data; const el = $('#roads');
  const allR = verdict(r).reasons;
  const legs = r.route.map(leg => {
    const seg = cfg.segments[leg.seg];
    const list = evs ? evs.filter(e => e.segs.includes(leg.seg)) : [];
    const segR = allR.filter(x => x.seg === leg.seg);
    const lvl = !evs ? 'unknown' : !segR.length ? 'go' : segR.some(x => x.level === 'nogo') ? 'nogo' : segR.some(x => x.level === 'caution') ? 'caution' : 'info';
    const icon = e => e.cls === 'chainLaws' ? '⛓️' : e.cls === 'roadClosures' ? '⛔' : e.cls === 'roadReports' ? '⚠️' : '❄️';
    const name = `${esc(L(seg.name))}${leg.alt ? ` <small class="muted">(${esc(t('alt'))})</small>` : ''}`;
    return `<li class="rrow"><span class="pill-s p-${PILL[lvl]}">${esc(t(PILL[lvl]))}</span>${list.length
      ? `<details><summary>${name} <small class="muted">· ${list.length}</small></summary><ul class="evs">${list.map(e => `<li>${icon(e)} ${esc(e.tooltip || e.title)}<br><small class="muted">${esc(e.detail)}</small></li>`).join('')}</ul></details>`
      : `<span>${name}</span>`}</li>`;
  }).join('');
  const meta = new Map((state.cams || []).map(c => [c.id, c]));
  const onRoute = new Set(r.route.map(x => x.seg));
  const cams = cfg.cameras.filter(c => onRoute.has(c.seg)).concat(cfg.cameras.filter(c => !onRoute.has(c.seg))).map(c => {
    const img = meta.get(c.id)?.image || c.image;
    return `<a class="thumb ${onRoute.has(c.seg) ? '' : 'off'}" href="https://www.cotrip.org/camera/${c.id}" target="_blank" rel="noopener" title="${esc(c.name)}">
      <img loading="lazy" alt="${esc(c.name)}" src="${esc(camImg(img))}" onerror="this.style.visibility='hidden'"><span>${esc(c.name.replace(/^(I-70|US \d+|CO \d+) MP [\d.]+ /, '$1 '))}</span></a>`;
  }).join('');
  el.innerHTML = `<h2>${esc(t('roads_h'))} → ${esc(r.short)}</h2>
    <details class="more"><summary>🧭 ${esc(t('route'))}</summary><p class="small">${esc(L(r.routeNote))}</p></details>
    <ul class="rlist">${legs}</ul>
    <h3>📷 ${esc(t('cameras'))} <small class="muted">(${cfg.cameras.length})</small></h3>
    <div class="thumbs">${cams}</div>
    <p class="note">CDOT COtrip · ${esc(state.roads.mode ? fmtTime(state.roads.at) : t('unavailable'))} · <a href="https://www.cotrip.org/" target="_blank" rel="noopener">${esc(t('open_cotrip'))} ↗</a></p>`;
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
      : `<a class="thumb" href="${esc(w.live || r.links.webcams)}" target="_blank" rel="noopener"><img loading="lazy" alt="${esc(L(w.name))}" src="${esc(camImg(w.image))}" onerror="this.style.visibility='hidden'">${w.live ? '<b class="play">▶</b>' : ''}<span>${esc(L(w.name))}</span></a>`).join('')}</div>`;
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
  const item = (k, s) => `<span class="${s.mode === 'live' ? 'ok' : s.mode ? 'snap' : 'bad'}">${esc(t(k))}: ${esc(s.mode ? `${t(s.mode === 'live' ? 'live' : 'snapshot')} ${fmtTime(s.at)}` : t('unavailable'))}</span>`;
  $('#sources').innerHTML = item('src_roads', state.roads) + item('src_weather', state.wx) + item('src_alerts', state.alerts)
    + `<span class="${state.intel.at ? 'snap' : 'bad'}">${esc(t('intel_h'))}: ${esc(state.intel.at ? fmtTime(state.intel.at) : t('unavailable'))}</span>`;
  $('#credits').innerHTML = state.cfg.resorts.filter(r => r.photo).map(r => `${esc(r.short)} ${esc(t('photo_by', r.photo.credit))}, <a href="${esc(r.photo.page)}" target="_blank" rel="noopener">Wikimedia Commons</a>, <a href="${esc(r.photo.licenseUrl)}" target="_blank" rel="noopener">${esc(r.photo.license)}</a>`).join(' · ');
}

function renderAll() {
  renderChrome(); renderVerdict(); renderResortCards(); renderIntel(); renderOutlook(); renderWeather(); renderRoads(); renderWear(); renderResorts(); renderPack(); renderSources();
}

function bind() {
  $('#btn-lang').onclick = () => { state.lang = state.lang === 'zh' ? 'en' : 'zh'; LS.set('lang', state.lang); renderAll(); };
  $('#btn-units').onclick = () => { state.units = U() === 'imperial' ? 'metric' : 'imperial'; LS.set('units', state.units); renderAll(); };
  $('#btn-refresh').onclick = () => refresh();
  document.addEventListener('click', e => {
    const rc = e.target.closest('[data-resort]');
    if (rc && !e.target.closest('details')) { state.resort = rc.dataset.resort; LS.set('resort', state.resort); renderAll(); if (rc.classList.contains('orow') || rc.classList.contains('rcard')) $('#verdict').scrollIntoView({ behavior: 'smooth' }); return; }
    const b = e.target.closest('.seg-ctl button');
    if (b) { if (b.parentElement.dataset.ctl === 'point') { state.point = b.dataset.v; LS.set('point', state.point); } renderWeather(); return; }
    const yt = e.target.closest('.yt[data-yt]');
    if (yt && !yt.querySelector('iframe')) yt.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt.dataset.yt)}?autoplay=1&mute=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="live"></iframe>`;
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.yt[data-yt]')) { e.preventDefault(); e.target.click(); } });
  bindPack();
  setInterval(() => { if (!document.hidden) refresh(); }, 10 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - state.lastLive > 10 * 60 * 1000) refresh(); });
}

(async function main() {
  try { state.cfg = await getJson('data/resorts.json'); }
  catch { $('#verdict').innerHTML = `<p>${esc(t('unavailable'))}: resorts.json</p>`; return; }
  if (!state.cfg.resorts.some(r => r.id === state.resort)) state.resort = state.cfg.resorts[0].id;
  bind(); renderChrome();
  await loadSnapshot(); renderAll();
  await refresh();
})();
