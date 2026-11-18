// Starting location: input with Photon autocomplete, presets, browser geolocation; OSRM routing with cache + throttle.
import { buildRoute, osrmRouteUrl } from './route.js?v=1edcd309c1';

const LSK = 'ski.start', RCK = 'ski.routes';
const round = (v, n = 3) => +(+v).toFixed(n); // ~100 m: enough for routing, kinder to privacy

export function loadStart(cfg) {
  try { const s = JSON.parse(localStorage.getItem(LSK)); if (s && isFinite(s.lat) && isFinite(s.lon)) return s; } catch {}
  const d = cfg.trip.presets?.[0] || cfg.trip.origin;
  return { id: d.id, name: d.name, lat: d.lat, lon: d.lon, kind: 'preset' };
}
export function saveStart(s) { try { localStorage.setItem(LSK, JSON.stringify(s)); } catch {} }
export const isDefaultStart = (cfg, s) => s.id === (cfg.trip.presets?.[0]?.id || 'DEN');

/* ---------- routing (OSRM demo: ≤1 req/s, non-commercial; cached 3 days in localStorage) ---------- */
let lastCall = 0;
const inflight = new Map();
async function throttle() {
  const wait = Math.max(0, lastCall + 1100 - Date.now());
  lastCall = Date.now() + wait;
  if (wait) await new Promise(r => setTimeout(r, wait));
}
function readCache() { try { return JSON.parse(localStorage.getItem(RCK)) || {}; } catch { return {}; } }
function writeCache(c) {
  const keys = Object.keys(c).sort((a, b) => c[b].at - c[a].at).slice(0, 8);
  const out = Object.fromEntries(keys.map(k => [k, c[k]]));
  try { localStorage.setItem(RCK, JSON.stringify(out)); } catch { try { localStorage.removeItem(RCK); } catch {} }
}
export async function getRoute(cfg, start, resort) {
  const from = { lat: round(start.lat), lon: round(start.lon) };
  const to = resort.parking || { lat: resort.lat, lon: resort.lon };
  const key = `${from.lat},${from.lon}>${resort.id}`;
  const cache = readCache();
  if (cache[key] && Date.now() - cache[key].at < 3 * 864e5) return cache[key].route;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    await throttle();
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 15000);
    try {
      const res = await fetch(osrmRouteUrl(cfg.sources.osrm, from, to), { signal: ctl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const route = buildRoute(await res.json());
      // Store a compact copy (rounded coordinates).
      route.pts = route.pts.map(p => [round(p[0], 5), round(p[1], 5)]);
      route.cum = route.cum.map(v => Math.round(v));
      const c = readCache(); c[key] = { at: Date.now(), route }; writeCache(c);
      return route;
    } finally { clearTimeout(tm); inflight.delete(key); }
  })();
  inflight.set(key, p);
  return p;
}

/* ---------- geocoding (Photon / komoot: fair use, debounced, min 3 chars) ---------- */
function photonLabel(f) {
  const p = f.properties || {};
  const line1 = [p.housenumber && p.street ? `${p.housenumber} ${p.street}` : (p.street || ''), p.name && p.name !== p.street ? p.name : ''].filter(Boolean);
  const where = [p.city || p.town || p.village || p.county, p.state, p.countrycode && p.countrycode !== 'US' ? p.country : ''].filter(Boolean);
  const main = line1.length ? line1.reverse().join(', ') : (where.shift() || p.name || '?');
  return { main, sub: where.filter(w => w !== main).join(', ') };
}

export function mountStartUI(root, { cfg, t, L, getStart, onChange }) {
  const presets = cfg.trip.presets || [];
  root.innerHTML = `
    <div class="start-row">
      <label class="start-l" for="start-input"></label>
      <div class="start-box">
        <span class="pin" aria-hidden="true">📍</span>
        <input id="start-input" type="text" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="start-list">
        <button type="button" class="geo" id="start-geo" title=""><span aria-hidden="true">◎</span><span class="geo-t"></span></button>
        <ul id="start-list" class="ac" role="listbox" hidden></ul>
      </div>
    </div>
    <div class="presets" id="start-presets"></div>
    <p class="start-msg" id="start-msg" aria-live="polite"></p>`;
  const input = root.querySelector('#start-input'), list = root.querySelector('#start-list'), msg = root.querySelector('#start-msg');
  let items = [], active = -1, timer = null, ctl = null; const memo = new Map();

  const label = () => { const s = getStart(); return L(s.name) || ''; };
  function relabel() {
    root.querySelector('.start-l').textContent = t('start_label');
    input.placeholder = t('start_ph');
    root.querySelector('.geo-t').textContent = t('use_loc');
    root.querySelector('#start-geo').title = t('use_loc');
    if (document.activeElement !== input) input.value = label();
    const cur = getStart();
    root.querySelector('#start-presets').innerHTML = presets.map(p => `<button type="button" data-p="${p.id}" class="${cur.id === p.id ? 'on' : ''}">${L(p.name)}</button>`).join('');
  }
  function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; }
  function show() {
    if (!items.length) { list.innerHTML = `<li class="none">${t('no_results')}</li>`; }
    else list.innerHTML = items.map((it, i) => `<li role="option" id="ac-${i}" data-i="${i}" class="${i === active ? 'on' : ''}"><b>${esc(it.main)}</b>${it.sub ? `<span>${esc(it.sub)}</span>` : ''}</li>`).join('')
      + `<li class="attr">Search © <a href="https://photon.komoot.io" target="_blank" rel="noopener">Photon</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a></li>`;
    list.hidden = false; input.setAttribute('aria-expanded', 'true');
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  async function search(q) {
    if (memo.has(q)) { items = memo.get(q); active = -1; show(); return; }
    ctl?.abort(); ctl = new AbortController();
    try {
      const u = `${cfg.sources.photon}/api/?q=${encodeURIComponent(q)}&limit=6&lang=en&lat=39.74&lon=-104.99`;
      const r = await fetch(u, { signal: ctl.signal });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      items = (j.features || []).map(f => ({ ...photonLabel(f), lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }));
      memo.set(q, items); active = -1; show();
    } catch (e) { if (e.name !== 'AbortError') { items = []; list.innerHTML = `<li class="none">${t('geo_fail')}</li>`; list.hidden = false; } }
  }
  function choose(it) {
    const s = { id: 'custom', name: it.sub ? `${it.main}, ${it.sub}` : it.main, lat: it.lat, lon: it.lon, kind: it.kind || 'search' };
    close(); input.value = s.name; input.blur(); onChange(s);
  }
  input.addEventListener('input', () => {
    clearTimeout(timer); const q = input.value.trim();
    if (q.length < 3) { close(); return; }
    timer = setTimeout(() => search(q), 350);
  });
  input.addEventListener('keydown', e => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; show(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[active >= 0 ? active : 0]) choose(items[active >= 0 ? active : 0]); }
    else if (e.key === 'Escape') { close(); input.value = label(); }
  });
  input.addEventListener('focus', () => input.select());
  input.addEventListener('blur', () => setTimeout(() => { close(); input.value = label(); }, 200));
  list.addEventListener('mousedown', e => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); choose(items[+li.dataset.i]); } });
  root.querySelector('#start-presets').addEventListener('click', e => {
    const b = e.target.closest('button[data-p]'); if (!b) return;
    const p = presets.find(x => x.id === b.dataset.p); onChange({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, kind: 'preset' });
  });
  root.querySelector('#start-geo').addEventListener('click', () => {
    if (!navigator.geolocation) { msg.textContent = t('loc_unsupported'); return; }
    msg.textContent = t('loc_finding');
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = round(pos.coords.latitude), lon = round(pos.coords.longitude);
      let name = t('my_location');
      try {
        const r = await fetch(`${cfg.sources.photon}/reverse?lat=${lat}&lon=${lon}&lang=en`);
        const f = (await r.json()).features?.[0]; if (f) { const l = photonLabel(f); name = `${t('my_location')} · ${l.sub || l.main}`; }
      } catch {}
      msg.textContent = '';
      onChange({ id: 'geo', name, lat, lon, kind: 'geo' });
    }, err => { msg.textContent = err.code === 1 ? t('loc_denied') : t('loc_fail'); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  });
  return { relabel, setMsg: s => { msg.innerHTML = s; } };
}
