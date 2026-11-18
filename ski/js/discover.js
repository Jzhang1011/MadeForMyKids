// Resort discovery (default home) + basic resort view for catalog resorts without a full dashboard.
// Data: data/catalog.json (static, verified) + api/catalog-conditions.json (Open-Meteo model, refreshed hourly by
// the ski-data Worker; resort-published base depth / terrain open / lifts / 24 h snow where SkiDay reads a public feed) + api/forecast.json?r=<id> (basic view).
import { fmt, weatherEmoji } from './core.js?v=a51aa11193';
import { getRoute } from './start.js?v=a51aa11193';

const S = {
  en: {
    d_title: 'Where do you want to ski?', d_sub: 'Find your mountain and check today’s conditions.',
    d_search: 'Search resort, town, state, range or pass…', d_near: 'Near Me', d_fav: 'Favorites', d_best: 'Best Conditions', d_explore: 'Explore',
    d_recent: 'Recently viewed', d_from: 'Distances from', d_useloc: 'Use my location', d_locating: 'Finding you…', d_loc_fail: 'Location unavailable; using your starting point.',
    d_filters: 'Filters', d_region: 'Region', d_pass: 'Pass', d_status: 'Status', d_dist: 'Distance', d_sort: 'Sort', d_all: 'All', d_allr: 'All regions', d_allp: 'All passes', d_other: 'Other', d_any: 'Any',
    d_open_only: 'Open (reported)', d_hide_closed: 'Hide reported closed', d_within: 'Within {0}', d_list: 'List', d_map: 'Map',
    s_score: 'Best overall', s_snow: 'Most new snow (24 h)', s_close: 'Closest', s_fcst: 'Most snowfall (next 72 h)', s_base: 'Deepest base', s_terrain: 'Most terrain open', s_open: 'Open first',
    d_view: 'View conditions', d_addfav: 'Add to favorites', d_remfav: 'Remove from favorites', d_compare: 'Compare', d_compare_n: 'Compare {0}', d_clear: 'Clear',
    d_temp: 'summit now', d_new: 'new 24 h', d_fc72: 'next 72 h', d_drive: 'drive', d_nt: 'no traffic', d_straight: 'straight-line', d_wind: 'summit wind',
    d_open: 'Open', d_closed: 'Closed', d_lifts: '{0}/{1} lifts', d_nolift: 'Lifts not reported', d_upd: 'Updated {0}', d_model: 'Snowfall forecast, temperature and wind: Open-Meteo model estimate. Base depth, terrain open, lifts and ✓ new snow: the resort’s own published report; “Not reported” when it doesn’t publish one SkiDay can read.',
    d_base: 'base depth', d_terrain: 'terrain open', d_nr: 'Not reported', d_acres: '{0}/{1} acres open', d_trails: '{0}/{1} trails open', d_rep_src: 'Resort report: {0}', d_dist_start: 'Distance from start', d_rep: 'resort-reported',
    d_fav_empty: 'No favorites yet. Tap ☆ on any resort to save it here.', d_none: 'No resorts match these filters.', d_results: 'Results for “{0}”', d_nearby: 'Near {0}',
    d_cond_na: 'Conditions are temporarily unavailable. Resort details still work.', d_nresorts: '{0} resorts', d_full: 'Full dashboard', d_basic: 'Basic',
    d_score: 'Ski-day score', d_score_help: 'Score out of 100. Snow up to 35 pts (new 24 h snow ×4 + next-72 h forecast ×1.5, in inches; the resort’s reported 24 h snow when it has one, otherwise the model). Base depth up to 15 and terrain open up to 20, both resort-reported and scored against the deepest base and the most terrain open that any resort reports today (so early-season 9% open can earn full points). Weather up to 15: summit wind up to 10 (full under 10 mph, zero at 40 mph+) and summit temperature up to 5 (best 15–30°F); temperature is no longer on the card but still counts a little. Distance from your starting point up to 15 (straight-line: full within 100 km / 60 mi, zero beyond 800 km / 500 mi). If a resort doesn’t report base depth or terrain, that part gets half points, so missing data neither lifts nor sinks it. A resort that reports itself closed is scored ×0.3.',
    d_best_near: 'Best ski options today', d_near_h: 'Closest to you', d_drive_note: 'Sorted by straight-line distance from {0}. Open a resort for the drive time from there.',
    d_best_note: 'Ranked by ski-day score (snow, base depth, terrain open, weather and distance from {0}). Tap ⓘ Ski-day score for how it works.',
    d_explore_h: 'Explore by region', d_back: 'All resorts', d_cmp_h: 'Compare resorts', d_close: 'Close', d_score_s: 'score',
    b_limited: 'Basic view: weather-model forecast only. SkiDay can’t read a published lift, terrain or snow report for this resort, and has no road data here. Always check the official snow report before you go.',
    b_limited_rep: 'Basic view: base depth, terrain open, lifts and ✓ new snow come from the resort’s own report ({0}); forecasts are Open-Meteo model estimates. No road data here. Always check the official snow report before you go.',
    b_now: 'Now', b_mid: 'mid-mountain', b_summit: 'summit', b_48: 'Next 48 hours', b_7d: '7-day forecast', b_day: 'Day', b_snow: 'Snow', b_hilo: 'High / low', b_wind: 'Wind',
    b_get: 'Getting there', b_links: 'Official links', b_site: 'Resort website', b_report: 'Snow report, lifts & webcams (official site)', b_dir: 'Directions (Google Maps)',
    b_loading: 'Loading forecast…', b_fc_fail: 'Forecast unavailable right now.', b_route_loading: 'Estimating drive…', b_route_fail: 'Drive estimate unavailable.',
    b_elev: 'Elevation', b_pass: 'Pass', b_range: 'Range', b_src: 'Coordinates/elevation source', b_fc_src: 'Forecast: Open-Meteo, {0} grid point at {1}.', b_drive_from: 'from {0}',
    b_snow_bars: 'Snow (bars)', b_temp_line: 'Temperature (line)'
  },
  zh: {
    d_title: '你想去哪里滑雪？', d_sub: '找到你的雪场，查看今天的雪况。',
    d_search: '搜索雪场、城镇、州、山脉或雪票…', d_near: '附近', d_fav: '收藏', d_best: '最佳雪况', d_explore: '探索',
    d_recent: '最近浏览', d_from: '距离起点', d_useloc: '使用我的位置', d_locating: '定位中…', d_loc_fail: '无法定位，改用你的出发地。',
    d_filters: '筛选', d_region: '地区', d_pass: '雪票', d_status: '状态', d_dist: '距离', d_sort: '排序', d_all: '全部', d_allr: '全部地区', d_allp: '全部雪票', d_other: '其他', d_any: '不限',
    d_open_only: '营业中（雪场公布）', d_hide_closed: '隐藏已公布关闭', d_within: '{0} 以内', d_list: '列表', d_map: '地图',
    s_score: '综合最佳', s_snow: '24小时新雪最多', s_close: '最近', s_fcst: '未来72小时降雪最多', s_base: '雪底最深', s_terrain: '开放雪道最多', s_open: '营业优先',
    d_view: '查看雪况', d_addfav: '加入收藏', d_remfav: '取消收藏', d_compare: '对比', d_compare_n: '对比 {0} 个', d_clear: '清除',
    d_temp: '山顶现在', d_new: '24小时新雪', d_fc72: '未来72小时', d_drive: '车程', d_nt: '未计路况', d_straight: '直线距离', d_wind: '山顶风速',
    d_open: '营业中', d_closed: '已关闭', d_lifts: '缆车 {0}/{1}', d_nolift: '缆车未公布', d_upd: '更新于 {0}', d_model: '降雪预报、气温和风：Open-Meteo 模型估算。雪底深度、雪道开放、缆车和带 ✓ 的新雪：来自雪场自己公布的报告；雪场没有可读取的报告时显示“未公布”。',
    d_base: '雪底深度', d_terrain: '雪道开放', d_nr: '未公布', d_acres: '已开放 {0}/{1} 英亩', d_trails: '已开放 {0}/{1} 条雪道', d_rep_src: '雪场报告：{0}', d_dist_start: '距出发地', d_rep: '雪场公布',
    d_fav_empty: '还没有收藏。点任意雪场上的 ☆ 即可收藏。', d_none: '没有符合筛选条件的雪场。', d_results: '“{0}” 的搜索结果', d_nearby: '{0} 附近',
    d_cond_na: '雪况暂时无法获取，雪场详情仍可查看。', d_nresorts: '{0} 个雪场', d_full: '完整看板', d_basic: '基础',
    d_score: '滑雪日评分', d_score_help: '满分 100。降雪最高 35 分（24 小时新雪英寸 ×4 + 未来 72 小时预报降雪英寸 ×1.5；有雪场公布的 24 小时新雪就用公布值，否则用模型）。雪底深度最高 15 分、雪道开放最高 20 分，均为雪场公布数据，并与今天所有雪场公布的最深雪底和最高开放比例相比（所以早季开放 9% 也可能拿满分）。天气最高 15 分：山顶风速最高 10 分（10 mph 以下满分，40 mph 以上 0 分），山顶气温最高 5 分（15–30°F 最佳）；气温不再显示在卡片上，但仍占少量分数。距出发地最高 15 分（直线距离：100 公里 / 60 英里内满分，超过 800 公里 / 500 英里为 0）。雪场没有公布雪底或雪道数据时，该项给一半分，既不加分也不拖累。雪场公布关闭则 ×0.3。',
    d_best_near: '今天的最佳滑雪选择', d_near_h: '离你最近', d_drive_note: '按距 {0} 的直线距离排序。打开雪场可查看从出发地的车程。',
    d_best_note: '按滑雪日评分排序（降雪、雪底深度、雪道开放、天气和距 {0} 的远近）。点 ⓘ 滑雪日评分 查看算法。',
    d_explore_h: '按地区浏览', d_back: '全部雪场', d_cmp_h: '雪场对比', d_close: '关闭', d_score_s: '分',
    b_limited: '基础视图：仅有天气模型预报。SkiDay 读取不到此雪场公布的缆车、雪道或雪况报告，也没有这里的路况数据。出发前请务必查看雪场官方雪况报告。',
    b_limited_rep: '基础视图：雪底深度、雪道开放、缆车和带 ✓ 的新雪来自雪场自己的报告（{0}）；预报为 Open-Meteo 模型估算。这里没有路况数据。出发前请务必查看雪场官方雪况报告。',
    b_now: '现在', b_mid: '半山', b_summit: '山顶', b_48: '未来 48 小时', b_7d: '7 天预报', b_day: '日期', b_snow: '降雪', b_hilo: '最高 / 最低', b_wind: '风',
    b_get: '怎么去', b_links: '官方链接', b_site: '雪场官网', b_report: '雪况、缆车和摄像头（官网）', b_dir: '导航（Google 地图）',
    b_loading: '正在加载预报…', b_fc_fail: '暂时无法获取预报。', b_route_loading: '正在估算车程…', b_route_fail: '无法估算车程。',
    b_elev: '海拔', b_pass: '雪票', b_range: '山脉', b_src: '坐标/海拔来源', b_fc_src: '预报：Open-Meteo，{0}格点，海拔 {1}。', b_drive_from: '从 {0} 出发',
    b_snow_bars: '降雪（柱）', b_temp_line: '气温（线）'
  }
};
const STATE_NAMES = { CO: 'Colorado', UT: 'Utah', CA: 'California', NV: 'Nevada', 'CA/NV': 'California Nevada', WA: 'Washington', OR: 'Oregon', AK: 'Alaska', WY: 'Wyoming', MT: 'Montana', ID: 'Idaho', NM: 'New Mexico', AB: 'Alberta', BC: 'British Columbia', QC: 'Quebec', ON: 'Ontario', VT: 'Vermont', ME: 'Maine', NH: 'New Hampshire', NY: 'New York' };
const STATE_ZH = { CO: '科罗拉多', UT: '犹他', CA: '加州', NV: '内华达', 'CA/NV': '加州 内华达', WA: '华盛顿州', OR: '俄勒冈', AK: '阿拉斯加', WY: '怀俄明', MT: '蒙大拿', ID: '爱达荷', NM: '新墨西哥', AB: '阿尔伯塔', BC: '不列颠哥伦比亚', QC: '魁北克', ON: '安大略', VT: '佛蒙特', ME: '缅因', NH: '新罕布什尔', NY: '纽约' };

let X = null;                      // context from app.js
const D = {
  cat: null, byId: new Map(), cond: null, condAt: 0, tab: 'best', q: '', sort: 'score', view: 'list',
  f: { region: '', pass: '', status: '', dist: '' }, cmp: [], drive: {}, driveKey: '', map: null, markers: null, acIdx: -1, searched: false,
  basic: { id: null, fc: null, fcErr: null, route: null, routeErr: null, point: 'summit', map: null }
};
const $ = s => document.querySelector(s);
const tr = (k, ...a) => { let s = (S[X.state.lang] || S.en)[k] ?? S.en[k] ?? k; a.forEach((v, i) => { s = s.replace(`{${i}}`, v); }); return s; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const U = () => X.state.units;
const LSd = {
  get: (k, d) => { try { const v = JSON.parse(localStorage.getItem('ski.' + k)); return Array.isArray(d) ? (Array.isArray(v) ? v : d) : (v ?? d); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('ski.' + k, JSON.stringify(v)); } catch {} }
};
const favs = () => LSd.get('favs', []).filter(id => D.byId.has(id));
const recents = () => LSd.get('recent', []).filter(id => D.byId.has(id));
export const catalogResort = id => D.byId.get(id) || null;

/* ---------- distance / drive / score ---------- */
function hav(a, b) {
  const R = 6371, rad = Math.PI / 180, dLa = (b.lat - a.lat) * rad, dLo = (b.lon - a.lon) * rad;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const startPt = () => X.getStart();
const distKm = r => hav(startPt(), r);
const kmTxt = km => U() === 'imperial' ? `${Math.round(km / 1.609)} mi` : `${Math.round(km)} km`;
const durTxt = m => X.state.lang === 'zh' ? `${Math.floor(m / 60)}小时${String(m % 60).padStart(2, '0')}分` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
const cond = r => D.cond?.resorts?.[r.id] || null;
const report = r => D.cond?.reports?.[r.id] || null;
const rep24 = p => p ? (p.s24Cm ?? p.snow24 ?? null) : null;      // resort-reported 24 h snow (cm)
const snow24 = r => rep24(report(r)) ?? cond(r)?.summit.s24 ?? null;
const baseCm = r => report(r)?.baseCm ?? null;
const pctOpen = r => report(r)?.pct ?? null;
let mxMemo = { at: -1 };
function maxima() {
  if (mxMemo.at === D.condAt) return mxMemo;
  const rs = Object.values(D.cond?.reports || {});
  mxMemo = { at: D.condAt, base: Math.max(25, ...rs.map(p => p.baseCm ?? 0)), pct: Math.max(1, ...rs.map(p => p.pct ?? 0)) };
  return mxMemo;
}
function score(r) {
  const c = cond(r); if (!c) return null;
  const s24 = (snow24(r) ?? 0) / 2.54, s72 = (c.summit.s72 ?? 0) / 2.54;
  const snow = Math.min(35, s24 * 4 + s72 * 1.5);
  // Base and terrain are scored against the best any resort reports today (early season 9% open can be the best there is).
  const mx = maxima();
  const b = baseCm(r), base = b == null ? 7.5 : 15 * Math.min(1, b / mx.base);
  const pc = pctOpen(r), terrain = pc == null ? 10 : 20 * Math.min(1, pc / mx.pct);
  const tf = c.summit.t == null ? null : c.summit.t * 9 / 5 + 32;
  const temp = tf == null ? 2.5 : tf < 15 ? Math.max(0, 5 - (15 - tf) * 0.2) : tf > 30 ? Math.max(0, 5 - (tf - 30) * 0.4) : 5;
  const wm = c.summit.wind == null ? null : c.summit.wind / 1.609;
  const wind = wm == null ? 5 : wm <= 10 ? 10 : wm >= 40 ? 0 : 10 * (40 - wm) / 30;
  const km = distKm(r), dist = km <= 100 ? 15 : km >= 800 ? 0 : 15 * (800 - km) / 700;
  let s = snow + base + terrain + temp + wind + dist;
  if (report(r)?.status === 'closed') s *= 0.3;
  return { total: Math.round(s), snow: Math.round(snow), base: Math.round(base), terrain: Math.round(terrain), weather: Math.round(temp + wind), dist: Math.round(dist) };
}

/* ---------- search ---------- */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\u4e00-\u9fff ]+/g, ' ').replace(/\s+/g, ' ').trim();
function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); }
    if (best > max) return max + 1; prev = cur;
  }
  return prev[b.length];
}
function buildIndex() {
  const reg = Object.fromEntries(D.cat.regions.map(g => [g.id, g]));
  for (const r of D.cat.resorts) {
    const f = [[r.name, 10], ...r.aliases.map(a => [a, 8]), [r.city, 6], [`${r.state} ${STATE_NAMES[r.state] || ''} ${STATE_ZH[r.state] || ''}`, 5],
      [`${reg[r.region]?.en || ''} ${reg[r.region]?.zh || ''}`, 4], [r.range, 4], [r.passes.length ? r.passes.map(p => `${p} pass`).join(' ') : 'other independent', 3]];
    r._ix = f.map(([s, w]) => { const n = norm(s); return { n, words: n.split(' '), w }; });
  }
}
function matchScore(r, q) {
  const toks = norm(q).split(' ').filter(Boolean); if (!toks.length) return 0;
  let total = 0;
  for (const tk of toks) {
    let best = 0;
    for (const f of r._ix) {
      if (!f.n) continue;
      let s = 0;
      if (f.words.some(w => w.startsWith(tk))) s = 1;
      else if (f.n.includes(tk)) s = 0.7;
      else if (tk.length >= 4) { const max = tk.length >= 5 ? 2 : 1; if (f.words.some(w => w.length >= 4 && (lev(tk, w.slice(0, tk.length), max) <= max || lev(tk, w.slice(0, tk.length + 1), max) <= max || lev(tk, w, max) <= max))) s = 0.5; }
      best = Math.max(best, s * f.w);
    }
    if (!best) return 0;
    total += best;
  }
  if (norm(r.name).startsWith(norm(q))) total += 5;
  return total;
}
function search(q) {
  return D.cat.resorts.map(r => [r, matchScore(r, q)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(x => x[0]);
}

/* ---------- data ---------- */
export async function loadCatalog() {
  if (D.cat) return D.cat;
  D.cat = await X.getJson(`data/catalog.json?v=${Math.floor(Date.now() / 600000)}`);
  D.cat.resorts.forEach(r => D.byId.set(r.id, r));
  buildIndex();
  return D.cat;
}
export async function loadConditions(force) {
  if (!force && D.cond && Date.now() - D.condAt < 5 * 60e3) return D.cond;
  try { D.cond = await X.getJson(`api/catalog-conditions.json?v=${Math.floor(Date.now() / 60000)}`, 15000); D.condAt = Date.now(); }
  catch (e) { console.warn('[ski] catalog conditions unavailable', e); }
  return D.cond;
}
/** Resolve ?resort= values: id, or an exact name/alias. */
export function resolveResort(v) {
  if (!v || !D.cat) return null;
  if (D.byId.has(v)) return D.byId.get(v);
  const n = norm(v);
  return D.cat.resorts.find(r => norm(r.name) === n || r.aliases.some(a => norm(a) === n)) || null;
}
export function addRecent(id) { const r = [id, ...LSd.get('recent', []).filter(x => x !== id && typeof x === 'string')].slice(0, 8); LSd.set('recent', r); }
function toggleFav(id) {
  const f = favs(); const on = f.includes(id);
  LSd.set('favs', on ? f.filter(x => x !== id) : [...f, id]);
  X.track('disc_fav', on ? 'remove' : 'add');
}

/* ---------- formatting ---------- */
function updTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso); if (isNaN(d)) return '—';
  const loc = X.state.lang === 'zh' ? 'zh-CN' : 'en-US';
  const today = new Date().toDateString() === d.toDateString();
  return new Intl.DateTimeFormat(loc, today ? { hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
}
const passTxt = r => r.passes.length ? r.passes.map(p => p[0].toUpperCase() + p.slice(1)).join(' · ') : tr('d_other');
const stateTxt = r => X.state.lang === 'zh' ? (STATE_ZH[r.state] || r.state) : (STATE_NAMES[r.state] ? r.state : r.state);
const regionName = id => { const g = D.cat.regions.find(x => x.id === id); return g ? (g[X.state.lang] || g.en) : id; };
function statusHtml(r) {
  const p = report(r);
  const lifts = p?.lifts ? ` · ${esc(tr('d_lifts', p.lifts.open, p.lifts.total))}` : '';
  if (p?.status === 'open') return `<span class="dst open">● ${esc(tr('d_open'))}${lifts}</span>`;
  if (p?.status === 'closed') return `<span class="dst closed">● ${esc(tr('d_closed'))}${lifts}</span>`;
  return `<span class="dst na">${esc(tr('d_nolift'))}</span>`;
}
const baseTxt = (cm, u) => cm == null ? null : u === 'imperial' ? `${Math.round(cm / 2.54)}″` : `${Math.round(cm)} cm`;
const nf0 = n => Number(n).toLocaleString(X.state.lang === 'zh' ? 'zh-CN' : 'en-US');
function terrainTip(p) {
  if (!p || p.pct == null) return '';
  return p.basis === 'acres' && p.acres ? tr('d_acres', nf0(p.acres.open), nf0(p.acres.total)) : p.trails ? tr('d_trails', nf0(p.trails.open), nf0(p.trails.total)) : '';
}
const nr = () => `<b class="nr">${esc(tr('d_nr'))}</b>`;
/** When the numbers on a card were last updated: the resort report's own time if it has one, else the model run. */
function cardUpd(r) {
  const p = report(r), c = cond(r);
  const t = p ? ([p.at, p.snowAt].filter(Boolean).sort().pop() || p.fetchedAt) : c?.at;
  return t ? tr('d_upd', updTime(t)) : '';
}
function statsHtml(r, u) {
  const c = cond(r), p = report(r), s24 = snow24(r), rep = rep24(p) != null, b = baseCm(r), pc = pctOpen(r);
  return `<span><b>${s24 != null ? fmt.snow(s24, u) : '—'}</b><small>${esc(tr('d_new'))}${rep ? ' ✓' : ''}</small></span>
        <span title="${esc(b != null ? tr('d_rep') : '')}">${b != null ? `<b>${baseTxt(b, u)}</b>` : nr()}<small>${esc(tr('d_base'))}</small></span>
        <span title="${esc(terrainTip(p))}">${pc != null ? `<b>${pc}%</b>` : nr()}<small>${esc(tr('d_terrain'))}</small></span>
        <span><b>${c ? fmt.snow(c.summit.s72, u) : '—'}</b><small>${esc(tr('d_fc72'))}</small></span>`;
}
const photoStyle = r => r.photo?.src ? ` style="background-image:url('${esc(r.photo.src)}')"` : '';

function card(r, { rank } = {}) {
  const c = cond(r), u = U(), f = favs().includes(r.id), sc = score(r);
  return `<article class="dcard" data-open="${r.id}">
    <div class="dph${r.photo ? '' : ' ph0'}"${photoStyle(r)}>${rank ? `<span class="drank">${rank}</span>` : ''}${r.detail === 'full' ? `<span class="dfull">${esc(tr('d_full'))}</span>` : ''}</div>
    <div class="dbody">
      <div class="dhead"><h3>${esc(r.name)}</h3>
        <button type="button" class="dfav${f ? ' on' : ''}" data-fav="${r.id}" aria-pressed="${f}" aria-label="${esc(tr(f ? 'd_remfav' : 'd_addfav'))}" title="${esc(tr(f ? 'd_remfav' : 'd_addfav'))}">${f ? '★' : '☆'}</button></div>
      <div class="dmeta">${esc(stateTxt(r))} · ${esc(passTxt(r))}${sc ? ` · <span class="dsc" title="${esc(tr('d_score_help'))}">${sc.total} ${esc(tr('d_score_s'))}</span>` : ''}</div>
      <div class="dstats">
        ${statsHtml(r, u)}
      </div>
      <div class="dfoot">${statusHtml(r)}<span class="dupd">${c || report(r) ? esc(cardUpd(r)) : ''}</span></div>
      <div class="dact"><button type="button" class="dgo" data-open="${r.id}">${esc(tr('d_view'))} →</button>
        <label class="dcmp"><input type="checkbox" data-cmp="${r.id}"${D.cmp.includes(r.id) ? ' checked' : ''}${!D.cmp.includes(r.id) && D.cmp.length >= 4 ? ' disabled' : ''}> ${esc(tr('d_compare'))}</label></div>
    </div>
  </article>`;
}

/* ---------- list building ---------- */
function filtered(list) {
  const f = D.f;
  return list.filter(r => (!f.region || r.region === f.region)
    && (!f.pass || (f.pass === 'other' ? !r.passes.length : r.passes.includes(f.pass)))
    && (!f.status || (f.status === 'open' ? report(r)?.status === 'open' : report(r)?.status !== 'closed'))
    && (!f.dist || distKm(r) <= +f.dist));
}
const SORTS = {
  score: (a, b) => (score(b)?.total ?? -1) - (score(a)?.total ?? -1),
  snow: (a, b) => (snow24(b) ?? -1) - (snow24(a) ?? -1) || SORTS.score(a, b),
  close: (a, b) => distKm(a) - distKm(b),
  fcst: (a, b) => (cond(b)?.summit.s72 ?? -1) - (cond(a)?.summit.s72 ?? -1),
  base: (a, b) => (baseCm(b) ?? -1) - (baseCm(a) ?? -1) || SORTS.score(a, b),
  terrain: (a, b) => (pctOpen(b) ?? -1) - (pctOpen(a) ?? -1) || (report(b)?.acres?.open ?? report(b)?.trails?.open ?? 0) - (report(a)?.acres?.open ?? report(a)?.trails?.open ?? 0) || SORTS.score(a, b),
  open: (a, b) => ((report(b)?.status === 'open') - (report(a)?.status === 'open')) || SORTS.score(a, b)
};
function currentList() {
  const all = D.cat.resorts;
  if (D.q.trim()) {
    const hits = search(D.q);
    return { title: tr('d_results', esc(D.q.trim())), list: filtered(hits), ranked: false };
  }
  if (D.tab === 'fav') return { title: tr('d_fav'), list: filtered(favs().map(id => D.byId.get(id))), empty: tr('d_fav_empty') };
  if (D.tab === 'near') return { title: tr('d_near_h'), list: filtered([...all].sort(SORTS.close)), note: tr('d_drive_note', X.L(startPt().name) || '') };
  if (D.tab === 'explore') return { title: tr('d_explore_h'), list: filtered(all), grouped: true };
  return { title: tr('d_best_near'), list: filtered([...all].sort(SORTS[D.sort] || SORTS.score)), ranked: true, sortable: true, note: tr('d_best_note', X.L(startPt().name) || '') };
}

/* ---------- render ---------- */
function opt(v, label, cur) { return `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(label)}</option>`; }
function renderShell() {
  const el = $('#discover'); if (!el) return;
  if (!el.querySelector('#d-list')) {
    el.innerHTML = `<div class="disc-hero"><div class="wrap">
        <h1 class="q" id="d-title"></h1><p class="dsub" id="d-sub"></p>
        <div class="dsearch"><span aria-hidden="true">🔎</span><input id="dq" type="search" autocomplete="off" enterkeyhint="search" aria-autocomplete="list" aria-controls="dq-ac"><button type="button" class="dqx" id="dq-x" hidden aria-label="Clear">✕</button><ul class="ac" id="dq-ac" role="listbox" hidden></ul></div>
        <p class="dfrom" id="d-from"></p>
        <div class="dtabs" id="d-tabs" role="tablist"></div>
      </div></div>
      <div class="wrap dwrap">
        <div class="drecent" id="d-recent"></div>
        <div class="dbar" id="d-bar"></div>
        <div class="dsplit" id="d-split">
          <div class="dlist" id="d-list" aria-live="polite"></div>
          <div class="dmapwrap" id="d-mapwrap"><button type="button" class="dmapx" id="d-mapx">✕ ${''}</button><div id="d-map" class="dmap"></div></div>
        </div>
        <details class="dcredits" id="d-credits"></details>
      </div>
      <div class="dtray" id="d-tray" hidden></div>
      <div class="dmodal" id="d-modal" hidden></div>`;
    el.dataset.ready = '1';
    bindShell();
  }
  $('#d-title').textContent = tr('d_title');
  $('#d-sub').textContent = tr('d_sub');
  $('#dq').placeholder = tr('d_search');
  if ($('#dq').value !== D.q) $('#dq').value = D.q;
  $('#dq-x').hidden = !D.q;
  const s = startPt();
  $('#d-from').innerHTML = `📍 ${esc(tr('d_from'))} <b>${esc(X.L(s.name) || '')}</b> · <button type="button" class="dlink" id="d-loc">${esc(tr('d_useloc'))}</button> <span id="d-locmsg" class="muted"></span>`;
  const tabs = [['near', '📍', 'd_near'], ['fav', '⭐', 'd_fav'], ['best', '❄️', 'd_best'], ['explore', '🗺️', 'd_explore']];
  $('#d-tabs').innerHTML = tabs.map(([id, ic, k]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${D.tab === id && !D.q}" class="${D.tab === id && !D.q ? 'on' : ''}"><i aria-hidden="true">${ic}</i>${esc(tr(k))}${id === 'fav' && favs().length ? ` <small>${favs().length}</small>` : ''}</button>`).join('');
  $('#d-mapx').textContent = `☰ ${tr('d_list')}`;
  const ph = D.cat.resorts.filter(r => r.photo);
  $('#d-credits').innerHTML = `<summary>📷 ${X.state.lang === 'zh' ? '照片署名' : 'Photo credits'} (${ph.length})</summary><ul>${ph.map(r => `<li>${esc(r.name)}: ${esc(r.photo.credit)} · <a href="${esc(r.photo.page)}" target="_blank" rel="noopener">${esc(r.photo.license)}</a></li>`).join('')}</ul>`;
}
function renderRecent() {
  const r = recents();
  $('#d-recent').innerHTML = r.length ? `<h2 class="ov">${esc(tr('d_recent'))}</h2><div class="rvchips">${r.map(id => { const x = D.byId.get(id); const c = cond(x);
    return `<button type="button" class="rvchip" data-open="${id}"><span class="rvchip-ph${x.photo ? '' : ' ph0'}"${photoStyle(x)}></span><span><b>${esc(x.name)}</b><small>${esc(stateTxt(x))} · ${c ? `${fmt.snow(snow24(x), U())} ${esc(tr('d_new'))}${baseCm(x) != null ? ` · ${baseTxt(baseCm(x), U())} ${esc(tr('d_base'))}` : ''}` : esc(passTxt(x))}</small></span></button>`; }).join('')}</div>` : '';
}
function renderBar(meta) {
  const im = U() === 'imperial', f = D.f;
  const dists = im ? [[161, '100 mi'], [402, '250 mi'], [805, '500 mi']] : [[150, '150 km'], [400, '400 km'], [800, '800 km']];
  const nf = ['region', 'pass', 'status', 'dist'].filter(k => f[k]).length;
  $('#d-bar').classList.toggle('fopen', !!D.fopen);
  $('#d-bar').innerHTML = `
    <button type="button" class="dftog" data-ftog aria-expanded="${!!D.fopen}">⚙︎ ${esc(tr('d_filters'))}${nf ? ` <b>${nf}</b>` : ''}</button>
    <label class="ff"><span>${esc(tr('d_region'))}</span><select data-f="region">${opt('', tr('d_allr'), f.region)}${D.cat.regions.map(g => opt(g.id, `${g[X.state.lang] || g.en} (${D.cat.resorts.filter(r => r.region === g.id).length})`, f.region)).join('')}</select></label>
    <label class="ff"><span>${esc(tr('d_pass'))}</span><select data-f="pass">${opt('', tr('d_allp'), f.pass)}${opt('ikon', 'Ikon', f.pass)}${opt('epic', 'Epic', f.pass)}${opt('other', tr('d_other'), f.pass)}</select></label>
    <label class="ff"><span>${esc(tr('d_status'))}</span><select data-f="status">${opt('', tr('d_any'), f.status)}${opt('open', tr('d_open_only'), f.status)}${opt('notclosed', tr('d_hide_closed'), f.status)}</select></label>
    <label class="ff"><span>${esc(tr('d_dist'))}</span><select data-f="dist">${opt('', tr('d_any'), f.dist)}${dists.map(([v, l]) => opt(v, tr('d_within', l), f.dist)).join('')}</select></label>
    ${meta.sortable ? `<label><span>${esc(tr('d_sort'))}</span><select id="d-sort">${['score', 'snow', 'fcst', 'base', 'terrain', 'open', 'close'].map(k => opt(k, tr('s_' + k), D.sort)).join('')}</select></label>` : ''}
    <details class="dhelp"><summary>ⓘ ${esc(tr('d_score'))}</summary><p>${esc(tr('d_score_help'))}</p><p class="small muted">${esc(tr('d_model'))}</p></details>
    <div class="dvt" role="group" aria-label="${esc(tr('d_list'))} / ${esc(tr('d_map'))}"><button type="button" data-vt="list" class="${D.view === 'list' ? 'on' : ''}">☰ ${esc(tr('d_list'))}</button><button type="button" data-vt="map" class="${D.view === 'map' ? 'on' : ''}">🗺️ ${esc(tr('d_map'))}</button></div>`;
}
function renderList() {
  const meta = currentList();
  renderBar(meta);
  let html = `<div class="dlist-h"><h2>${meta.title}</h2><span class="muted small">${esc(tr('d_nresorts', meta.list.length))}</span></div>`;
  if (!D.cond) html += `<p class="dnote-w">${esc(tr('d_cond_na'))}</p>`;
  if (meta.note) html += `<p class="small muted">${esc(meta.note)}</p>`;
  if (!meta.list.length) html += `<p class="dempty">${esc(meta.empty && !D.q ? meta.empty : tr('d_none'))}</p>`;
  else if (meta.grouped) {
    const groups = D.cat.regions.map(g => [g, meta.list.filter(r => r.region === g.id)]).filter(x => x[1].length);
    html += `<div class="dregions">${groups.map(([g, l]) => { const ph = l.find(r => r.photo);
      return `<button type="button" class="dreg" data-region="${g.id}"><span class="dreg-ph${ph ? '' : ' ph0'}"${ph ? photoStyle(ph) : ''}></span><b>${esc(g[X.state.lang] || g.en)}</b><small>${esc(tr('d_nresorts', l.length))}</small></button>`; }).join('')}</div>`;
    html += groups.map(([g, l]) => `<h3 class="dgrp" id="dg-${g.id}">${esc(g[X.state.lang] || g.en)} <small class="muted">${l.length}</small></h3><div class="dcards">${l.slice().sort((a, b) => a.name.localeCompare(b.name)).map(r => card(r)).join('')}</div>`).join('');
  } else {
    if (D.q.trim() && meta.list[0]) {
      const top = meta.list[0];
      const near = D.cat.resorts.filter(r => r !== top && !meta.list.slice(0, 6).includes(r) && hav(top, r) < 200).sort((a, b) => hav(top, a) - hav(top, b)).slice(0, 3);
      html += `<div class="dcards">${meta.list.slice(0, 30).map(r => card(r)).join('')}</div>`;
      if (near.length) html += `<h3 class="dgrp">${esc(tr('d_nearby', top.name))}</h3><div class="dcards">${near.map(r => card(r)).join('')}</div>`;
    } else html += `<div class="dcards">${meta.list.map((r, i) => card(r, { rank: meta.ranked && D.sort === 'score' && i < 3 ? i + 1 : 0 })).join('')}</div>`;
  }
  $('#d-list').innerHTML = html;
  renderTray();
  if (D.map) drawMarkers(meta.list);
}
function renderTray() {
  const t = $('#d-tray'); if (!t) return;
  t.hidden = D.cmp.length < 1;
  t.innerHTML = `<span>${D.cmp.map(id => esc(D.byId.get(id).name)).join(' · ')}</span><button type="button" class="dgo" data-cmpopen ${D.cmp.length < 2 ? 'disabled' : ''}>${esc(tr('d_compare_n', D.cmp.length))}</button><button type="button" class="dlink" data-cmpclear>${esc(tr('d_clear'))}</button>`;
}
function renderCompare() {
  const rs = D.cmp.map(id => D.byId.get(id)), u = U();
  const row = (label, fn) => `<tr><th>${esc(label)}</th>${rs.map(r => `<td>${fn(r)}</td>`).join('')}</tr>`;
  $('#d-modal').innerHTML = `<div class="dmodal-in" role="dialog" aria-modal="true" aria-label="${esc(tr('d_cmp_h'))}"><div class="dmodal-h"><h2>${esc(tr('d_cmp_h'))}</h2><button type="button" class="dlink" data-cmpclose>✕ ${esc(tr('d_close'))}</button></div>
    <div class="dtable"><table><thead><tr><th></th>${rs.map(r => `<th><a href="?resort=${r.id}" data-open="${r.id}">${esc(r.name)}</a></th>`).join('')}</tr></thead><tbody>
    ${row(tr('d_region'), r => `${esc(regionName(r.region))} · ${esc(r.state)}`)}
    ${row(tr('d_pass'), r => esc(passTxt(r)))}
    ${row(tr('d_score'), r => { const s = score(r); return s ? `<b>${s.total}</b>/100` : '—'; })}
    ${row(tr('d_status'), r => statusHtml(r))}
    ${row(tr('d_new'), r => { const v = snow24(r); return v == null ? '—' : `${fmt.snow(v, u)}${rep24(report(r)) != null ? ' ✓' : ''}`; })}
    ${row(tr('d_base'), r => baseCm(r) != null ? `<b>${baseTxt(baseCm(r), u)}</b>` : `<span class="muted">${esc(tr('d_nr'))}</span>`)}
    ${row(tr('d_terrain'), r => pctOpen(r) != null ? `<b>${pctOpen(r)}%</b> <small class="muted">${esc(terrainTip(report(r)))}</small>` : `<span class="muted">${esc(tr('d_nr'))}</span>`)}
    ${row(tr('d_fc72'), r => cond(r) ? fmt.snow(cond(r).summit.s72, u) : '—')}
    ${row(tr('d_temp'), r => cond(r) ? fmt.temp(cond(r).summit.t, u) : '—')}
    ${row(tr('d_wind'), r => cond(r) ? `${fmt.wind(cond(r).summit.wind, u)} <small class="muted">(${fmt.wind(cond(r).summit.gust, u)})</small>` : '—')}
    ${row(tr('d_dist_start'), r => `${kmTxt(distKm(r))} <small class="muted">${esc(tr('d_straight'))}</small>`)}
    ${row(tr('b_elev'), r => fmt.elevRange(r.baseElevM, r.summitElevM, u))}
    ${row(tr('d_upd', '').trim() || 'Updated', r => esc(cardUpd(r).replace(tr('d_upd', ''), '').trim() || '—'))}
    </tbody></table></div><p class="small muted">${esc(tr('d_model'))} ✓ = ${X.state.lang === 'zh' ? '雪场公布' : 'resort-reported'}</p></div>`;
  $('#d-modal').hidden = false;
  X.track('disc_compare', 'open');
}

/* ---------- map ---------- */
function miniCard(r) {
  const c = cond(r), u = U(), f = favs().includes(r.id), p = report(r), s24 = snow24(r), b = baseCm(r), pc = pctOpen(r);
  return `<div class="dmini"><b>${esc(r.name)}</b><span class="muted">${esc(stateTxt(r))} · ${esc(passTxt(r))}</span>
    ${statusHtml(r)}
    <span>❄️ ${s24 != null ? fmt.snow(s24, u) : '—'}${rep24(p) != null ? ' ✓' : ''} ${esc(tr('d_new'))} · ${c ? fmt.snow(c.summit.s72, u) : '—'} ${esc(tr('d_fc72'))}</span>
    <span>${esc(tr('d_base'))}: ${b != null ? `<b>${baseTxt(b, u)}</b>` : `<span class="muted">${esc(tr('d_nr'))}</span>`} · ${esc(tr('d_terrain'))}: ${pc != null ? `<b>${pc}%</b>` : `<span class="muted">${esc(tr('d_nr'))}</span>`}</span>
    <span class="muted small">${esc(cardUpd(r))}</span>
    <span class="dmini-a"><button type="button" class="dgo" data-open="${r.id}">${esc(tr('d_view'))}</button><button type="button" class="dlink" data-fav="${r.id}">${f ? '★ ' + esc(tr('d_remfav')) : '☆ ' + esc(tr('d_addfav'))}</button></span></div>`;
}
function drawMarkers(list, force) {
  const Lf = window.L; if (!Lf || !D.map) return;
  // Redraw (and refit) only when the set of resorts or favorites changes, so background updates never move the map.
  const key = list.map(r => r.id).sort().join(',') + '|' + favs().join(',') + '|' + (D.cond ? D.condAt : 0) + '|' + startPt().lat + ',' + startPt().lon;
  if (!force && key === D.mkKey) return;
  const refit = !force && key.split('|')[0] !== (D.mkKey || '').split('|')[0];
  D.mkKey = key;
  D.markers.clearLayers();
  const fv = favs();
  list.forEach(r => {
    const sc = score(r)?.total;
    const cls = sc == null ? '' : sc >= 60 ? ' hi' : sc >= 40 ? ' mid' : '';
    const m = Lf.marker([r.lat, r.lon], { icon: Lf.divIcon({ className: 'dpin-w', html: `<span class="dpin${cls}${fv.includes(r.id) ? ' fav' : ''}">${fv.includes(r.id) ? '★' : '⛷️'}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }), title: r.name, keyboard: true });
    m.bindPopup(() => miniCard(r), { maxWidth: 260, minWidth: 220 });
    D.markers.addLayer(m);
  });
  const s = startPt();
  Lf.circleMarker([s.lat, s.lon], { radius: 7, color: '#fff', weight: 2, fillColor: '#25845A', fillOpacity: 1 }).bindTooltip(X.L(s.name) || '').addTo(D.markers);
  if (refit && list.length) {
    // Ranked tabs: frame the top of the list (and the start point); otherwise everything shown.
    const ranked = !D.q.trim() && (D.tab === 'best' || D.tab === 'near');
    let sel = ranked ? list.slice(0, 10) : list;
    const near = sel.filter(r => distKm(r) < 1500);       // keep a far outlier (e.g. Alaska) from zooming the map out to a continent
    if (near.length >= 2) sel = near;
    const pts = sel.map(r => [r.lat, r.lon]);
    if (ranked) pts.push([s.lat, s.lon]);
    try { D.map.fitBounds(Lf.latLngBounds(pts), { padding: [30, 30], maxZoom: 9 }); } catch {}
  }
}
function ensureMap() {
  const wide = window.matchMedia('(min-width: 980px)').matches;
  if (!wide && D.view !== 'map') return;
  if (D.map) { setTimeout(() => D.map.invalidateSize(), 50); return; }
  X.loadLeaflet().then(Lf => {
    if (D.map) return;
    const el = $('#d-map'); if (!el) return;
    D.map = Lf.map(el, { zoomControl: true, attributionControl: true, worldCopyJump: true, tap: false });
    const fix = ' · <a href="https://www.openstreetmap.org/fixthemap">Report a map error</a>';
    Lf.tileLayer(X.state.cfg.sources.tiles || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 15, attribution: (X.state.cfg.sources.tilesAttribution || '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors') + fix }).addTo(D.map);
    D.markers = Lf.layerGroup().addTo(D.map);
    D.map.setView([44, -105], 4);
    drawMarkers(currentList().list);
  }).catch(() => { const el = $('#d-map'); if (el) el.innerHTML = `<p class="muted small" style="padding:16px">Map unavailable</p>`; });
}
function setView(v) {
  D.view = v; X.track('disc_view', v);
  document.body.classList.toggle('dmap-full', v === 'map' && !window.matchMedia('(min-width: 980px)').matches);
  renderBar(currentList()); ensureMap();
}

/* ---------- autocomplete ---------- */
function renderAC() {
  const ac = $('#dq-ac'); const q = D.q.trim();
  if (q.length < 2) { ac.hidden = true; return; }
  const hits = search(q).slice(0, 6);
  const items = hits.map(r => ({ r, sub: `${r.city}, ${r.state} · ${passTxt(r)}` }));
  if (hits[0]) {
    const top = hits[0];
    D.cat.resorts.filter(r => !hits.includes(r) && hav(top, r) < 150).sort((a, b) => hav(top, a) - hav(top, b)).slice(0, 2)
      .forEach(r => items.push({ r, sub: `${tr('d_nearby', top.name)} · ${kmTxt(hav(top, r))}` }));
  }
  ac.innerHTML = items.length ? items.map((x, i) => `<li role="option" data-i="${i}" data-open="${x.r.id}" class="${i === D.acIdx ? 'on' : ''}"><b>${esc(x.r.name)}</b><span>${esc(x.sub)}</span></li>`).join('') : `<li class="none">${esc(tr('d_none'))}</li>`;
  ac.hidden = false;
  ac._items = items;
}

/* ---------- events ---------- */
function bindShell() {
  const el = $('#discover');
  const q = $('#dq');
  let tm;
  q.addEventListener('input', () => {
    D.q = q.value; D.acIdx = -1; $('#dq-x').hidden = !D.q;
    if (D.q.trim() && !D.searched) { D.searched = true; X.track('disc_search', 'used'); }
    renderAC(); clearTimeout(tm); tm = setTimeout(() => { renderShell(); renderList(); }, 180);
  });
  q.addEventListener('keydown', e => {
    const ac = $('#dq-ac'); const items = ac._items || [];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!items.length) return; e.preventDefault(); D.acIdx = (D.acIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; renderAC(); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = items[D.acIdx >= 0 ? D.acIdx : 0]; if (it && !ac.hidden) { ac.hidden = true; X.open(it.r.id); } else { ac.hidden = true; q.blur(); } }
    else if (e.key === 'Escape') { ac.hidden = true; }
  });
  q.addEventListener('blur', () => setTimeout(() => { $('#dq-ac').hidden = true; }, 200));
  q.addEventListener('focus', () => { if (D.q.trim().length >= 2) renderAC(); });
  $('#dq-ac').addEventListener('mousedown', e => e.preventDefault());
  el.addEventListener('change', e => {
    const s = e.target.closest('select[data-f]');
    if (s) { D.f[s.dataset.f] = s.value; renderList(); return; }
    if (e.target.id === 'd-sort') { D.sort = e.target.value; renderList(); return; }
    const c = e.target.closest('input[data-cmp]');
    if (c) { const id = c.dataset.cmp; D.cmp = c.checked ? [...new Set([...D.cmp, id])].slice(0, 4) : D.cmp.filter(x => x !== id); renderList(); }
  });
  el.addEventListener('click', e => {
    if (e.target.closest('input[data-cmp], label.dcmp, select, summary, .dhelp p')) return;
    const fav = e.target.closest('[data-fav]');
    if (fav) { e.preventDefault(); e.stopPropagation(); toggleFav(fav.dataset.fav); renderShell(); renderList(); renderRecent(); if (D.map) D.map.closePopup(); return; }
    const tab = e.target.closest('[data-tab]');
    if (tab) { D.tab = tab.dataset.tab; D.q = ''; $('#dq').value = ''; if (D.tab === 'best') D.sort = D.sort || 'score'; X.track('disc_tab', D.tab); renderShell(); renderList(); return; }
    const reg = e.target.closest('[data-region]');
    if (reg) { const g = $(`#dg-${reg.dataset.region}`); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (e.target.closest('[data-ftog]')) { D.fopen = !D.fopen; renderBar(currentList()); return; }
    const vt = e.target.closest('[data-vt]');
    if (vt) { setView(vt.dataset.vt); return; }
    if (e.target.closest('#d-mapx')) { setView('list'); return; }
    if (e.target.closest('#dq-x')) { D.q = ''; $('#dq').value = ''; renderShell(); renderList(); $('#dq').focus(); return; }
    if (e.target.closest('#d-loc')) { locate(); return; }
    if (e.target.closest('[data-cmpopen]')) { renderCompare(); return; }
    if (e.target.closest('[data-cmpclear]')) { D.cmp = []; renderList(); return; }
    if (e.target.closest('[data-cmpclose]') || e.target.id === 'd-modal') { $('#d-modal').hidden = true; return; }
    const op = e.target.closest('[data-open]');
    if (op) { e.preventDefault(); $('#d-modal').hidden = true; document.body.classList.remove('dmap-full'); D.view = 'list'; X.open(op.dataset.open); }
  });
  // Leaflet popups live inside the map pane (still inside #discover), handled above.
  window.addEventListener('resize', () => { if (X.view() === 'disc') { if (window.matchMedia('(min-width: 980px)').matches) document.body.classList.remove('dmap-full'); ensureMap(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#d-modal').hidden) $('#d-modal').hidden = true; });
}
function locate() {
  const msg = $('#d-locmsg');
  if (!navigator.geolocation) { msg.textContent = tr('d_loc_fail'); return; }
  msg.textContent = tr('d_locating');
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = +pos.coords.latitude.toFixed(3), lon = +pos.coords.longitude.toFixed(3);
    X.setStart({ id: 'geo', name: { en: 'My location', zh: '我的位置' }, lat, lon, kind: 'geo' });
    D.tab = 'near'; renderDiscover();
  }, () => { msg.textContent = tr('d_loc_fail'); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
}

export function initDiscover(ctx) { X = ctx; }
export function renderDiscover() {
  if (!D.cat) return;
  renderShell(); renderRecent(); renderList(); ensureMap();
}
export function discoverState() { return D; }

/* ================= Basic resort view ================= */
function hourKey(off) { return new Date(Date.now() + off * 1000).toISOString().slice(0, 13) + ':00'; }
function dayName(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(X.state.lang === 'zh' ? 'zh-CN' : 'en-US', { timeZone: 'UTC', weekday: 'short', month: 'numeric', day: 'numeric' }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
function chart48(pt) {
  const h = pt.hourly, k = hourKey(pt.utc_offset_seconds || 0);
  let i0 = h.time.findIndex(x => x >= k); if (i0 < 0) i0 = 0;
  const idx = [...Array(48).keys()].map(i => i0 + i).filter(i => i < h.time.length);
  const im = U() === 'imperial';
  const snow = idx.map(i => (h.snowfall[i] || 0) / (im ? 2.54 : 1));
  const temp = idx.map(i => h.temperature_2m[i] == null ? null : (im ? h.temperature_2m[i] * 9 / 5 + 32 : h.temperature_2m[i]));
  const W = window.innerWidth < 600 ? 440 : 720, H = window.innerWidth < 600 ? 190 : 170, pad = 24, bw = (W - pad * 2) / idx.length;
  const smax = Math.max(im ? 0.5 : 1, ...snow), tv = temp.filter(v => v != null), tmin = Math.min(...tv), tmax = Math.max(...tv), tr0 = Math.max(1, tmax - tmin);
  const y = v => 18 + (H - 46) * (1 - (v - tmin) / tr0);
  const bars = snow.map((v, i) => { const bh = (H - 46) * v / smax; return v > 0 ? `<rect x="${pad + i * bw + 1}" y="${H - 28 - bh}" width="${Math.max(1, bw - 2)}" height="${bh}" rx="2" fill="#7fb2d9"><title>${fmt.snow(v * (im ? 2.54 : 1), U())}</title></rect>` : ''; }).join('');
  const line = temp.map((v, i) => v == null ? '' : `${i ? 'L' : 'M'}${(pad + i * bw + bw / 2).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const labels = idx.map((ix, i) => i % 6 === 0 ? `<text x="${pad + i * bw}" y="${H - 10}" font-size="11" fill="#5f7186">${(() => { const hh = +h.time[ix].slice(11, 13); return X.state.lang === 'zh' ? `${hh}时` : hh === 0 ? '12a' : hh < 12 ? `${hh}a` : hh === 12 ? '12p' : `${hh - 12}p`; })()}</text>` : '').join('');
  const days = idx.map((ix, i) => h.time[ix].slice(11, 13) === '00' ? `<line x1="${pad + i * bw}" x2="${pad + i * bw}" y1="10" y2="${H - 26}" stroke="#E3EAF0"/><text x="${pad + i * bw + 3}" y="12" font-size="10.5" fill="#5f7186">${esc(dayName(h.time[ix].slice(0, 10)))}</text>` : '').join('');
  const tot = snow.reduce((a, b) => a + b, 0);
  return `<svg viewBox="0 0 ${W} ${H}" class="bchart" role="img" aria-label="${esc(tr('b_48'))}">${days}${bars}<path d="${line}" fill="none" stroke="#F28C38" stroke-width="2.5"/>
    <text x="${W - pad}" y="${y(tmax) - 4}" font-size="11" text-anchor="end" fill="#b35f14">${Math.round(tmax)}°</text><text x="${W - pad}" y="${y(tmin) + 13}" font-size="11" text-anchor="end" fill="#b35f14">${Math.round(tmin)}°</text>${labels}</svg>
    <p class="small muted">❄️ ${esc(tr('b_snow_bars'))}: ${fmt.snow(tot * (im ? 2.54 : 1), U())} · <span style="color:#b35f14">━</span> ${esc(tr('b_temp_line'))} (${im ? '°F' : '°C'})</p>`;
}
function table7(pt) {
  const d = pt.daily, u = U();
  return `<div class="dtable"><table class="b7"><thead><tr><th>${esc(tr('b_day'))}</th><th></th><th>${esc(tr('b_snow'))}</th><th>${esc(tr('b_hilo'))}</th><th>${esc(tr('b_wind'))}</th></tr></thead><tbody>
    ${d.time.map((t, i) => `<tr><td>${esc(dayName(t))}</td><td>${weatherEmoji(d.weather_code[i])}</td><td><b>${fmt.snow(d.snowfall_sum[i], u)}</b></td><td>${fmt.temp(d.temperature_2m_max[i], u)} / ${fmt.temp(d.temperature_2m_min[i], u)}</td><td>${fmt.wind(d.wind_speed_10m_max[i], u)} <small class="muted">(${fmt.wind(d.wind_gusts_10m_max[i], u)})</small></td></tr>`).join('')}
  </tbody></table></div>`;
}
export function renderBasic() {
  const B = D.basic, r = D.byId.get(B.id), el = $('#basic'); if (!r || !el) return;
  const c = cond(r), u = U(), f = favs().includes(r.id), s = startPt(), p = report(r);
  const pt = B.fc ? B.fc[B.point] : null;
  const rt = B.route;
  el.innerHTML = `
  <div class="hero-wrap bhero" style="${r.photo?.src ? `--hero-img:url('${esc(new URL(r.photo.src, location.href).href)}')` : ''}"><div class="wrap hero-in">
    <button type="button" class="dback" data-home>← ${esc(tr('d_back'))}</button>
    <div class="bhead"><h1 class="q">${esc(r.name)}</h1><button type="button" class="dfav big${f ? ' on' : ''}" data-fav="${r.id}" aria-pressed="${f}" title="${esc(tr(f ? 'd_remfav' : 'd_addfav'))}">${f ? '★' : '☆'}</button></div>
    <p class="bmeta2">${esc(r.city)}, ${esc(stateTxt(r))} · ${esc(regionName(r.region))} · ${esc(passTxt(r))} · ${esc(r.range)}</p>
    <div class="vpanel"><div class="tiles">
      <div class="tile"><span class="ti">🌡️</span><b>${c ? fmt.temp(c.summit.t, u) : '—'}</b><span>${esc(tr('d_temp'))}</span><small class="dnote">${esc(tr('b_mid'))} ${c ? fmt.temp(c.mid.t, u) : '—'}</small></div>
      <div class="tile"><span class="ti">❄️</span><b>${snow24(r) != null ? fmt.snow(snow24(r), u) : '—'}</b><span>${esc(tr('d_new'))}</span><small class="dnote">${rep24(p) != null ? '✓ ' + esc(tr('d_rep')) : 'model'}</small></div>
      <div class="tile"><span class="ti">📏</span><b${baseCm(r) == null ? ' class="nr"' : ''}>${baseCm(r) != null ? baseTxt(baseCm(r), u) : esc(tr('d_nr'))}</b><span>${esc(tr('d_base'))}</span>${baseCm(r) != null ? `<small class="dnote">${esc(tr('d_rep'))}</small>` : ''}</div>
      <div class="tile"><span class="ti">🎿</span><b${pctOpen(r) == null ? ' class="nr"' : ''}>${pctOpen(r) != null ? pctOpen(r) + '%' : esc(tr('d_nr'))}</b><span>${esc(tr('d_terrain'))}</span><small class="dnote">${p?.lifts ? esc(tr('d_lifts', p.lifts.open, p.lifts.total)) + (terrainTip(p) ? ' · ' : '') : ''}${esc(terrainTip(p))}</small></div>
      <div class="tile"><span class="ti">📈</span><b>${c ? fmt.snow(c.summit.s72, u) : '—'}</b><span>${esc(tr('d_fc72'))}</span></div>
      <div class="tile"><span class="ti">🚗</span><b>${rt ? durTxt(Math.round(rt.durS / 60)) : kmTxt(distKm(r))}</b><span>${rt ? esc(tr('d_drive')) + ' · ' + esc(tr('d_nt')) : esc(tr('d_straight'))}</span><small class="dnote">${esc(tr('b_drive_from', X.L(s.name) || ''))}</small></div>
    </div></div>
    <p class="blimit">ⓘ ${p ? `${esc(tr('b_limited_rep', p.source?.name || ''))} ${esc(cardUpd(r))}. ${p.source?.url ? `<a href="${esc(p.source.url)}" target="_blank" rel="noopener">${esc(tr('d_rep_src', new URL(p.source.url).host.replace(/^www\./, '')))} ↗</a>` : ''}` : esc(tr('b_limited'))}</p>
    ${r.photo ? `<p class="hero-credit">📷 ${esc(r.photo.credit)} · <a href="${esc(r.photo.page)}" target="_blank" rel="noopener">${esc(r.photo.license)}</a></p>` : ''}
  </div></div>
  <main class="wrap">
    <section class="block card"><div class="sec-h"><h2>${esc(tr('b_48'))}</h2>
      <div class="seg-ctl" data-ctl="bpoint">${['summit', 'mid'].map(p => `<button type="button" data-bp="${p}" class="${B.point === p ? 'on' : ''}">${esc(tr(p === 'mid' ? 'b_mid' : 'b_summit'))}</button>`).join('')}</div></div>
      ${pt ? chart48(pt) : `<p class="muted">${esc(B.fcErr ? tr('b_fc_fail') : tr('b_loading'))}</p>`}
      ${B.fc ? `<p class="small muted">${esc(tr('b_fc_src', tr(B.point === 'mid' ? 'b_mid' : 'b_summit'), fmt.elev(B.fc.points[B.point], u)))} ${esc(tr('d_upd', updTime(B.fc.fetchedAt)))}</p>` : ''}
    </section>
    <section class="block card"><h2>${esc(tr('b_7d'))}</h2>${pt ? table7(pt) : `<p class="muted">${esc(B.fcErr ? tr('b_fc_fail') : tr('b_loading'))}</p>`}</section>
    <section class="block card"><h2>${esc(tr('b_get'))}</h2>
      <p>${rt ? `🚗 <b>${durTxt(Math.round(rt.durS / 60))}</b> · ${kmTxt(rt.distM / 1000)} · <span class="muted">${esc(tr('d_nt'))} · ${esc(tr('b_drive_from', X.L(s.name) || ''))}</span>` : `<span class="muted">${esc(B.routeErr ? tr('b_route_fail') : tr('b_route_loading'))}</span> · ${kmTxt(distKm(r))} ${esc(tr('d_straight'))}`}</p>
      <div id="b-map" class="rmap"></div>
      <p class="small"><a href="https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lon}" target="_blank" rel="noopener">${esc(tr('b_dir'))} ↗</a></p>
    </section>
    <section class="block card"><h2>${esc(tr('b_links'))}</h2>
      <ul class="blinks"><li><a href="${esc(r.url)}" target="_blank" rel="noopener">🌐 ${esc(tr('b_site'))} ↗</a></li><li><a href="${esc(r.url)}" target="_blank" rel="noopener">🎿 ${esc(tr('b_report'))} ↗</a></li></ul>
      <p class="small muted">${esc(tr('b_elev'))}: ${fmt.elevRange(r.baseElevM, r.summitElevM, u)} · ${esc(tr('b_src'))}: <a href="${esc(r.src)}" target="_blank" rel="noopener">Wikipedia</a> · ${esc(tr('b_pass'))}: ${esc(passTxt(r))} (ikonpass.com / epicpass.com, 2026/27)</p>
    </section>
  </main>`;
  drawBasicMap(r);
}
function drawBasicMap(r) {
  const el = document.getElementById('b-map'); if (!el) return;
  X.loadLeaflet().then(Lf => {
    if (!document.body.contains(el)) return;
    if (D.basic.map) { try { D.basic.map.remove(); } catch {} }
    const m = Lf.map(el, { scrollWheelZoom: false, tap: false }); D.basic.map = m;
    Lf.tileLayer(X.state.cfg.sources.tiles || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 15, attribution: (X.state.cfg.sources.tilesAttribution || '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors') + ' · <a href="https://www.openstreetmap.org/fixthemap">Report a map error</a>' }).addTo(m);
    const s = startPt();
    const end = Lf.circleMarker([r.lat, r.lon], { radius: 8, color: '#fff', weight: 2, fillColor: '#F28C38', fillOpacity: 1 }).addTo(m).bindTooltip(r.name);
    const st = Lf.circleMarker([s.lat, s.lon], { radius: 7, color: '#fff', weight: 2, fillColor: '#25845A', fillOpacity: 1 }).addTo(m).bindTooltip(X.L(s.name) || '');
    if (D.basic.route) { const line = Lf.polyline(D.basic.route.pts.map(p => [p[1], p[0]]), { color: '#14283F', weight: 4, opacity: .85 }).addTo(m); m.fitBounds(line.getBounds(), { padding: [16, 16] }); }
    else m.fitBounds(Lf.latLngBounds([[r.lat, r.lon], [s.lat, s.lon]]), { padding: [30, 30], maxZoom: 10 });
    void end; void st;
  }).catch(() => { el.innerHTML = '<p class="muted small" style="padding:16px">Map unavailable</p>'; });
}
export async function showBasic(id) {
  const B = D.basic;
  if (B.id !== id) Object.assign(B, { id, fc: null, fcErr: null, route: null, routeErr: null });
  renderBasic();
  if (!document.getElementById('basic').dataset.bound) {
    document.getElementById('basic').dataset.bound = '1';
    document.getElementById('basic').addEventListener('click', e => {
      const bp = e.target.closest('[data-bp]'); if (bp) { D.basic.point = bp.dataset.bp; renderBasic(); return; }
      const fav = e.target.closest('[data-fav]'); if (fav) { toggleFav(fav.dataset.fav); renderBasic(); return; }
      if (e.target.closest('[data-home]')) { e.preventDefault(); X.home(); }
    });
  }
  const r = D.byId.get(id);
  const jobs = [];
  if (!D.cond) jobs.push(loadConditions(true).finally(() => { if (D.basic.id === id && X.view() === 'basic') renderBasic(); }));
  if (!B.fc) jobs.push(X.getJson(`api/forecast.json?r=${encodeURIComponent(id)}`, 20000).then(j => { if (D.basic.id === id) B.fc = j; }).catch(() => { if (D.basic.id === id) B.fcErr = true; }).finally(() => { if (D.basic.id === id && X.view() === 'basic') renderBasic(); }));
  if (!B.route) jobs.push(getRoute(X.state.cfg, startPt(), r).then(rt => { if (D.basic.id === id) B.route = rt; }).catch(() => { if (D.basic.id === id) B.routeErr = true; }).finally(() => { if (D.basic.id === id && X.view() === 'basic') renderBasic(); }));
  await Promise.allSettled(jobs);
}
