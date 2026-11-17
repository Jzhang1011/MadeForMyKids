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
  hours: 24,
  cfg: null,
  // each source: {data, mode: 'live'|'snapshot'|null, at: ISO, error}
  wx: { data: null, mode: null, at: null }, roads: { data: null, mode: null, at: null }, alerts: { data: null, mode: null, at: null },
  cams: null, refreshing: false, lastLive: 0
};

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const t = (k, ...a) => { let s = STR[state.lang][k] ?? STR.en[k] ?? k; a.forEach((v, i) => { s = s.replace(`{${i}}`, v); }); return s; };
const L = o => (o && typeof o === 'object') ? (o[state.lang] || o.en) : o;
const tz = () => state.cfg?.trip?.timezone || 'America/Denver';
const locale = () => state.lang === 'zh' ? 'zh-CN' : 'en-US';
const resort = () => state.cfg.resorts.find(r => r.id === state.resort) || state.cfg.resorts[0];

function fmtTime(iso) {
  if (!iso) return t('never');
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale(), { timeZone: tz(), month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d) + ' MT';
}
function ago(iso) {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  return t('ago', m < 90 ? t('minutes', Math.max(0, m)) : t('hours', Math.round(m / 60)));
}
// Open-Meteo times are local (America/Denver) strings without zone.
function dayLabel(date) {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', weekday: 'short', month: 'numeric', day: 'numeric' }).format(dt);
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
  const urls = [...new Set(state.cfg.sources.snapshots.map(u => new URL(u, location.href).href))];
  const snaps = (await Promise.allSettled(urls.map(u => getJson(`${u}?v=${Math.floor(Date.now() / 300000)}`)))).filter(r => r.status === 'fulfilled').map(r => r.value);
  if (!snaps.length) return;
  const s = snaps.sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)))[0];
  if (s.sources?.weather?.ok && s.weather && !state.wx.data) state.wx = { data: s.weather, mode: 'snapshot', at: s.sources.weather.fetchedAt };
  if (s.sources?.roads?.ok && s.roads && !state.roads.data) state.roads = { data: s.roads.events, mode: 'snapshot', at: s.sources.roads.fetchedAt };
  if (s.alerts && !state.alerts.data && Object.values(s.alerts).some(v => v)) state.alerts = { data: s.alerts, mode: 'snapshot', at: s.sources.alerts?.fetchedAt };
  if (s.cameras) state.cams = s.cameras;
}

async function loadLive() {
  const cfg = state.cfg;
  const tasks = [
    getJson(openMeteoUrl(cfg)).then(j => { const d = splitOpenMeteo(cfg, j); if (!Object.keys(d).length) throw new Error('empty'); state.wx = { data: d, mode: 'live', at: new Date().toISOString() }; })
      .catch(e => { state.wx.error = String(e.message || e); }),
    Promise.all(EVENT_CLASSES.map(c => getJson(carsUrl(cfg, c), 30000).then(j => slimEvents(cfg, c, j))))
      .then(all => { state.roads = { data: all.flat(), mode: 'live', at: new Date().toISOString() }; })
      .catch(e => { state.roads.error = String(e.message || e); }),
    Promise.all(cfg.resorts.map(r => getJson(nwsUrl(cfg, r)).then(j => [r.id, slimAlerts(j)])))
      .then(all => { state.alerts = { data: Object.fromEntries(all), mode: 'live', at: new Date().toISOString() }; })
      .catch(e => { state.alerts.error = String(e.message || e); })
  ];
  await Promise.all(tasks);
  state.lastLive = Date.now();
}

async function refresh() {
  if (state.refreshing) return;
  state.refreshing = true; $('#btn-refresh').classList.add('spin');
  try { await loadLive(); } finally {
    state.refreshing = false; $('#btn-refresh').classList.remove('spin');
    renderAll();
  }
}

/* ---------- Derived ---------- */

function daysFor(r) { const w = state.wx.data?.[r.id]; try { return w ? dailyRows(w, r) : null; } catch { return null; } }
function verdict(r) {
  return verdictFor(state.cfg, r, {
    roads: state.roads.data ? { ok: true, events: state.roads.data } : { ok: false },
    alerts: state.alerts.data && state.alerts.data[r.id] ? { ok: true, list: state.alerts.data[r.id] } : { ok: false },
    days: daysFor(r)
  });
}

/* ---------- Render ---------- */

function renderChrome() {
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $('#btn-lang').textContent = t('lang');
  $('#btn-units').textContent = state.units === 'imperial' ? t('units_imperial') : t('units_metric');
  const items = [['verdict', 'nav_verdict'], ['weather', 'nav_weather'], ['roads', 'nav_roads'], ['wear', 'nav_wear'], ['resorts', 'nav_resorts'], ['pack', 'nav_pack']];
  if (state.cfg?.shop?.enabled) items.push(['shop', 'nav_shop']);
  $('#nav').innerHTML = items.map(([id, k]) => `<a href="#${id}">${esc(t(k))}</a>`).join('');
}

function renderPicker() {
  $('#resort-picker').innerHTML = state.cfg.resorts.map(r => {
    const v = verdict(r);
    return `<button type="button" role="tab" data-resort="${r.id}" class="${r.id === resort().id ? 'on' : ''}" aria-selected="${r.id === resort().id}">
      <span class="nm">${esc(r.short)}</span><span class="badge lv-${v.level}">${esc(t(v.level))}</span></button>`;
  }).join('');
}

function reasonText(x) {
  const u = state.units;
  const evText = e => e ? (e.tooltip || e.title) : '';
  switch (x.key) {
    case 'r_heavy_snow': case 'r_snow_ok': return t(x.key, fmt.snow(x.val, u));
    case 'r_wind': case 'r_wind_ok': return t(x.key, fmt.wind(x.val, u));
    case 'r_cold': return t(x.key, fmt.temp(x.val, u));
    case 'r_nws': return t(x.key, `${x.alert.event}${x.alert.ends ? ' → ' + fmtTime(x.alert.ends) : ''}`);
    default: return t(x.key, evText(x.ev));
  }
}

function renderVerdict() {
  const r = resort(); const v = verdict(r);
  const order = { nogo: 0, caution: 1, unknown: 2, info: 3, go: 4 };
  const reasons = [...v.reasons].sort((a, b) => order[a.level] - order[b.level]);
  const icon = { go: '✓', caution: '!', nogo: '✕', unknown: '?', info: 'i' };
  const el = $('#verdict');
  el.className = `card verdict-card v-${v.level}`;
  const hasChainKind = reasons.some(x => x.kind === 'chain');
  el.innerHTML = `
    <div class="vhead">
      <div class="vbig lv-${v.level}">${esc(t(v.level))}</div>
      <div class="vmeta">
        <h2>${esc(t('today_for'))} · ${esc(L(r.name))}</h2>
        <p>${esc(t(v.level + '_long'))}</p>
        <p class="muted small">${esc(t('drive', `${Math.floor(r.driveMin / 60)}h${String(r.driveMin % 60).padStart(2, '0')}`))}</p>
      </div>
    </div>
    <h3>${esc(t('why'))}</h3>
    <ul class="reasons">${reasons.map(x => `
      <li><span class="dot lv-${x.level}">${icon[x.level]}</span>
        <span class="txt">${esc(reasonText(x))}
          ${x.seg ? `<span class="seg">${esc(L(state.cfg.segments[x.seg].name))}</span>` : ''}
          ${x.ev?.detail ? `<details><summary>${state.lang === 'zh' ? '详情' : 'Details'}</summary>${esc(x.ev.detail)}</details>` : ''}
        </span></li>`).join('')}
    </ul>
    ${hasChainKind ? `<div class="help">${esc(t('traction_help'))}</div>` : ''}`;
}

function renderSources() {
  const item = (k, s) => {
    const cls = s.mode === 'live' ? 'ok' : s.mode === 'snapshot' ? 'snap' : 'bad';
    const label = s.mode ? `${t(s.mode === 'live' ? 'live' : 'snapshot')} · ${fmtTime(s.at)}` : t('unavailable');
    return `<span class="${cls}" title="${esc(s.error || '')}">${esc(t(k))}: ${esc(label)}</span>`;
  };
  $('#sources').innerHTML = `<span>${esc(t('updated'))}:</span>` + item('src_roads', state.roads) + item('src_weather', state.wx) + item('src_alerts', state.alerts);
}

function segCtl(name, opts, cur) {
  return `<div class="seg-ctl" data-ctl="${name}">${opts.map(([v, label]) => `<button type="button" data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${esc(label)}</button>`).join('')}</div>`;
}

function renderWeather() {
  const r = resort(); const u = state.units; const body = $('#weather-body');
  const wx = state.wx.data?.[r.id];
  if (!wx) { body.innerHTML = `<p class="muted">${esc(t('r_wx_unavailable'))}</p>`; return; }
  const days = dailyRows(wx, r);
  const pt = state.point === 'base' ? wx.base : wx.summit;
  const rows = hourlyRows(pt, r);
  const nowKey = denverNowKey();
  let start = rows.findIndex(x => x.time >= nowKey); if (start < 0) start = 0;
  const hs = rows.slice(start, start + state.hours);
  const elevLabel = state.point === 'base' ? `${t('base')} ${fmt.elev(r.baseElevM, u)}` : `${t('summit')} ${fmt.elev(r.summitElevM, u)}`;
  const line = (lab, f, cls) => `<tr><td class="l">${esc(lab)}</td>${hs.map(x => `<td class="${cls ? cls(x) : ''}">${f(x)}</td>`).join('')}</tr>`;
  body.innerHTML = `
    <h3>${esc(t('seven_day'))} · ${esc(L(r.name))}</h3>
    <div class="scroll"><div class="daygrid">${days.map(d => `
      <div class="day">
        <div class="d">${esc(dayLabel(d.date))} <span class="em">${weatherEmoji(d.code)}</span></div>
        <div class="big">${fmt.snow(d.summit.snow, u)}</div>
        <dl>
          <dt>${esc(t('base'))}</dt><dd>${fmt.snow(d.base.snow, u)}</dd>
          <dt>${esc(t('est_snow'))}</dt><dd>${fmt.snow(d.snowEst, u)}</dd>
          <dt>${esc(t('ratio'))}</dt><dd>${fmt.ratio(d.ratio)}</dd>
          <dt>${esc(t('swe'))}</dt><dd>${fmt.liquid(d.swe, u)}</dd>
          <dt>${esc(t('snowline'))}</dt><dd>${fmt.elevRange(d.snowLineMin, d.snowLineMax, u)}</dd>
          <dt>${esc(t('fzl'))}</dt><dd>${fmt.elevRange(d.fzlMin, d.fzlMax, u)}</dd>
          <dt>${esc(t('hi_lo'))}</dt><dd>${fmt.temp(d.summit.tMax, u)} / ${fmt.temp(d.summit.tMin, u)}</dd>
          <dt>${esc(t('gust'))}</dt><dd>${fmt.wind(d.summit.gust, u)}</dd>
        </dl>
      </div>`).join('')}
    </div></div>
    <h3>${esc(t('hourly'))} · ${esc(elevLabel)}</h3>
    ${segCtl('point', [['summit', t('summit')], ['base', t('base')]], state.point)}
    ${segCtl('hours', [[24, t('next', 24)], [48, t('next', 48)], [72, t('next', 72)]], state.hours)}
    <div class="scroll"><table class="hourly">
      <tr><th class="l"></th>${hs.map(x => `<th>${x.time.slice(11, 13) === '00' ? esc(dayLabel(x.time.slice(0, 10))) + '<br>' : ''}${esc(hourLabel(x.time))}</th>`).join('')}</tr>
      ${line('', x => weatherEmoji(x.code))}
      ${line(t('t'), x => fmt.temp(x.t, u))}
      ${line(t('feels'), x => fmt.temp(x.feels, u))}
      ${line(t('snow'), x => x.snowModel ? fmt.snow(x.snowModel, u) : '·', x => x.snowModel > 0 ? 'snowy' : '')}
      ${line(t('ratio'), x => x.ratio ? fmt.ratio(x.ratio) : '·')}
      ${line(t('wind'), x => fmt.wind(x.wind, u))}
      ${line(t('gust'), x => fmt.wind(x.gust, u))}
      ${line(t('fzl'), x => fmt.elev(x.fzl, u))}
    </table></div>
    <p class="note">${esc(t('ratio_note'))} · Open-Meteo · ${esc(state.wx.mode ? t(state.wx.mode === 'live' ? 'live' : 'snapshot') + ' ' + fmtTime(state.wx.at) : '')}</p>`;
}

function camImg(src) {
  const bust = Math.floor(Date.now() / 120000);
  return src + (src.includes('?') ? '&' : '?') + 't=' + bust;
}

function renderRoads() {
  const r = resort(); const body = $('#roads-body'); const cfg = state.cfg;
  const evs = state.roads.data;
  const onRoute = new Set(r.route.map(x => x.seg));
  const legs = r.route.map(leg => {
    const seg = cfg.segments[leg.seg];
    const list = evs ? evs.filter(e => e.segs.includes(leg.seg)) : null;
    const v = verdictFor(cfg, { ...r, route: [leg] }, { roads: evs ? { ok: true, events: evs } : { ok: false }, alerts: { ok: true, list: [] }, days: [] });
    const segR = v.reasons.filter(x => x.seg);
    const lvl = !evs ? 'unknown' : !segR.length ? 'go' : segR.some(x => x.level !== 'info') ? ['caution', 'nogo'].reduce((a, l) => segR.some(x => x.level === l) ? l : a, 'caution') : 'info';
    const label = !evs ? t('unavailable') : list.length ? t('seg_events', list.length) : '✓';
    return `<div class="leg">
      <div class="lh"><span>${esc(L(seg.name))}${leg.alt ? ` <span class="muted small">(${esc(t('alt'))})</span>` : ''}</span><span class="badge lv-${lvl}">${esc(label)}</span></div>
      ${!evs ? '' : list.length ? `<ul>${list.map(e => `<li><b>${esc(e.cls === 'chainLaws' ? '⛓️' : e.cls === 'roadClosures' ? '⛔' : e.cls === 'roadReports' ? '⚠️' : '❄️')}</b> ${esc(e.tooltip || e.title)}<br><span class="muted small">${esc(e.detail)}</span></li>`).join('')}</ul>` : `<p class="muted small" style="margin:4px 0 0">${esc(t('no_events'))}</p>`}
    </div>`;
  }).join('');
  const camsMeta = new Map((state.cams || []).map(c => [c.id, c]));
  const cams = cfg.cameras.map(c => {
    const m = camsMeta.get(c.id) || {};
    const img = m.image || c.image;
    const off = !onRoute.has(c.seg);
    return `<figure class="cam ${off ? 'off' : ''}">
      <span class="tag">${esc(c.seg.split('-')[0].toUpperCase())}</span>
      <a href="https://www.cotrip.org/camera/${c.id}" target="_blank" rel="noopener"><img loading="lazy" alt="${esc(c.name)}" src="${esc(camImg(img))}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'fail',textContent:'${esc(t('img_fail'))}'}))"></a>
      <figcaption>${esc(c.name)}${m.broken ? ' · ⚠︎' : ''}</figcaption>
    </figure>`;
  }).join('');
  body.innerHTML = `
    <p class="small"><b>${esc(t('route'))}:</b> ${esc(L(r.routeNote))}</p>
    ${legs}
    <p class="note">${esc(t('events_note'))} ${state.roads.mode ? '· ' + esc(t(state.roads.mode === 'live' ? 'live' : 'snapshot')) + ' ' + esc(fmtTime(state.roads.at)) : ''} · <a href="https://www.cotrip.org/" target="_blank" rel="noopener">${esc(t('open_cotrip'))}</a></p>
    <h3>${esc(t('cameras'))} (${cfg.cameras.length})</h3>
    <div class="cams">${cams}</div>`;
}

function renderWear() {
  const r = resort(); const u = state.units; const body = $('#wear-body');
  const days = daysFor(r);
  if (!days) { body.innerHTML = `<p class="muted">${esc(t('r_wx_unavailable'))}</p>`; return; }
  const card = d => {
    const o = outfitFor(d);
    const chips = ks => `<div class="chips">${ks.map(k => `<span>${esc(t(k))}</span>`).join('')}</div>`;
    return `<div class="wday">
      <div class="wh"><b>${esc(dayLabel(d.date))} ${weatherEmoji(d.code)}</b><span class="badge band-${o.band}">${esc(t('band_' + o.band))}</span></div>
      <div class="small muted">${esc(t('feels_top', fmt.temp(d.summit.feelsMin, u)))} · ${esc(t('base'))} ${fmt.temp(d.base.tMax, u)} · ${esc(t('gust'))} ${fmt.wind(d.summit.gust, u)} · ${esc(t('snow'))} ${fmt.snow(d.summit.snow, u)}</div>
      <h4>👩 ${esc(t('adults'))}</h4>${chips(o.adult)}
      <h4>🧒 ${esc(t('kids'))}</h4>${chips(o.kid)}
      <div class="notes">${o.notes.map(k => `• ${esc(t(k))}`).join('<br>')}</div>
    </div>`;
  };
  body.innerHTML = `<p class="small muted">${esc(L(r.name))}</p>
    <div class="wear-grid">${days.slice(0, 3).map(card).join('')}</div>
    <details class="more"><summary>${esc(t('more_days'))}</summary><div class="wear-grid">${days.slice(3).map(card).join('')}</div></details>`;
}

function renderResorts() {
  const body = $('#resorts-body'); const sel = resort();
  const order = [sel, ...state.cfg.resorts.filter(r => r.id !== sel.id)];
  body.innerHTML = order.map(r => `
    <div class="resort-block">
      <h3>${esc(L(r.name))}</h3>
      <div class="links">
        <a href="${esc(r.links.webcams)}" target="_blank" rel="noopener">${esc(t('official'))} ↗</a>
        <a href="${esc(r.links.report)}" target="_blank" rel="noopener">${esc(t('report'))} ↗</a>
        ${r.links.youtube ? `<a href="${esc(r.links.youtube)}" target="_blank" rel="noopener">YouTube ↗</a>` : ''}
      </div>
      ${r.webcams.some(w => w.youtube) ? `<p class="note" style="margin-top:0">${esc(t('yt_note'))}</p>` : ''}
      <div class="cams">${r.webcams.map(w => w.youtube ? `
        <figure class="cam"><div class="yt" data-yt="${esc(w.youtube)}" role="button" tabindex="0" aria-label="${esc(t('play'))}: ${esc(L(w.name))}">
          <img loading="lazy" alt="" src="https://i.ytimg.com/vi/${esc(w.youtube)}/hqdefault_live.jpg"><span class="play">▶</span></div>
          <figcaption>${esc(L(w.name))}</figcaption></figure>` : `
        <figure class="cam"><a href="${esc(w.live || r.links.webcams)}" target="_blank" rel="noopener"><img loading="lazy" alt="${esc(L(w.name))}" src="${esc(camImg(w.image))}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'fail',textContent:'${esc(t('img_fail'))}'}))"></a>
          <figcaption>${esc(L(w.name))}${w.live ? ` · <a href="${esc(w.live)}" target="_blank" rel="noopener">${esc(t('watch_live'))} ↗</a>` : ''}</figcaption></figure>`).join('')}
      </div>
    </div>`).join('');
}

/* ---------- Packing list ---------- */

function packItems() {
  let items = LS.get('pack', null);
  if (!Array.isArray(items)) items = PACK_DEFAULT.map((x, i) => ({ id: 'd' + i, def: i, done: false }));
  return items;
}
function renderPack() {
  const items = packItems();
  const text = it => it.def != null && PACK_DEFAULT[it.def] ? PACK_DEFAULT[it.def][state.lang] : it.text;
  $('#pack-body').innerHTML = `
    <p class="small muted">${esc(t('pack_sub'))}</p>
    <ul class="pack-list">${items.map(it => `
      <li class="${it.done ? 'done' : ''}" data-id="${esc(it.id)}">
        <input type="checkbox" id="pk-${esc(it.id)}" ${it.done ? 'checked' : ''}>
        <label for="pk-${esc(it.id)}">${esc(text(it))}</label>
        <button class="x" type="button" aria-label="Remove">×</button>
      </li>`).join('')}</ul>
    <form class="pack-add" id="pack-form"><input id="pack-input" maxlength="140" placeholder="${esc(t('add_item'))}"><button class="btn primary" type="submit">${esc(t('add'))}</button></form>
    <p><button class="btn small" type="button" id="pack-reset">${esc(t('reset'))}</button> <span class="small muted">${items.filter(i => i.done).length}/${items.length}</span></p>`;
}
function bindPack() {
  const body = $('#pack-body');
  body.addEventListener('change', e => {
    if (e.target.type !== 'checkbox') return;
    const id = e.target.closest('li').dataset.id; const items = packItems();
    const it = items.find(x => x.id === id); if (it) it.done = e.target.checked;
    LS.set('pack', items); renderPack();
  });
  body.addEventListener('click', e => {
    if (e.target.classList.contains('x')) {
      const id = e.target.closest('li').dataset.id; LS.set('pack', packItems().filter(x => x.id !== id)); renderPack();
    } else if (e.target.id === 'pack-reset') { LS.set('pack', null); renderPack(); }
  });
  body.addEventListener('submit', e => {
    e.preventDefault(); const v = $('#pack-input').value.trim(); if (!v) return;
    const items = packItems(); items.push({ id: 'u' + Date.now(), text: v, done: false }); LS.set('pack', items); renderPack();
  });
}

function renderAll() {
  renderChrome(); renderPicker(); renderVerdict(); renderSources(); renderWeather(); renderRoads(); renderWear(); renderResorts(); renderPack();
}

/* ---------- Events ---------- */

function bind() {
  $('#btn-lang').onclick = () => { state.lang = state.lang === 'zh' ? 'en' : 'zh'; LS.set('lang', state.lang); renderAll(); };
  $('#btn-units').onclick = () => { state.units = state.units === 'imperial' ? 'metric' : 'imperial'; LS.set('units', state.units); renderAll(); };
  $('#btn-refresh').onclick = () => refresh();
  $('#resort-picker').addEventListener('click', e => {
    const b = e.target.closest('[data-resort]'); if (!b) return;
    state.resort = b.dataset.resort; LS.set('resort', state.resort); renderAll();
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('.seg-ctl button'); if (b) {
      const ctl = b.parentElement.dataset.ctl;
      if (ctl === 'point') { state.point = b.dataset.v; LS.set('point', state.point); }
      if (ctl === 'hours') state.hours = Number(b.dataset.v);
      renderWeather(); return;
    }
    const yt = e.target.closest('.yt[data-yt]');
    if (yt && !yt.querySelector('iframe')) {
      yt.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt.dataset.yt)}?autoplay=1&mute=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="live"></iframe>`;
    }
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.yt[data-yt]')) { e.preventDefault(); e.target.click(); } });
  bindPack();
  // Keep fresh while open: every 10 minutes, and when the tab comes back after 10+ minutes.
  setInterval(() => { if (!document.hidden) refresh(); }, 10 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - state.lastLive > 10 * 60 * 1000) refresh(); });
}

(async function main() {
  try {
    state.cfg = await getJson('data/resorts.json');
  } catch (e) {
    $('#verdict').innerHTML = `<p>${esc(t('unavailable'))}: resorts.json</p>`; return;
  }
  if (!state.cfg.resorts.some(r => r.id === state.resort)) state.resort = state.cfg.resorts[0].id;
  bind();
  renderChrome();
  await loadSnapshot();
  renderAll();
  await refresh();
})();
