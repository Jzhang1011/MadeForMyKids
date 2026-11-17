// Dynamic route helpers: OSRM route → polyline + legs, camera picking and road-event matching.
// Pure functions (no DOM) so they can be unit-tested in Node.

export const CO_BOX = { w: -109.0603, e: -102.0415, s: 36.9925, n: 41.0034 };
export const inCO = ([lon, lat]) => lon >= CO_BOX.w && lon <= CO_BOX.e && lat >= CO_BOX.s && lat <= CO_BOX.n;

export function decodePolyline(str, precision = 6) {
  const f = 10 ** precision, out = [];
  let i = 0, lat = 0, lon = 0;
  while (i < str.length) {
    for (const which of [0, 1]) {
      let b, shift = 0, res = 0;
      do { b = str.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const d = (res & 1) ? ~(res >> 1) : (res >> 1);
      if (which === 0) lat += d; else lon += d;
    }
    out.push([lon / f, lat / f]);
  }
  return out;
}

const R = 6371008.8, RAD = Math.PI / 180;
export function haversine(a, b) {
  const dLat = (b[1] - a[1]) * RAD, dLon = (b[0] - a[0]) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function osrmRouteUrl(base, from, to) {
  const c = p => `${p.lon.toFixed(5)},${p.lat.toFixed(5)}`;
  return `${base}/route/v1/driving/${c(from)};${c(to)}?overview=false&steps=true&geometries=polyline6&generate_hints=false`;
}
export function osrmTableUrl(base, from, tos) {
  const c = p => `${p.lon.toFixed(5)},${p.lat.toFixed(5)}`;
  return `${base}/table/v1/driving/${[from, ...tos].map(c).join(';')}?sources=0&annotations=duration,distance&generate_hints=false`;
}

const normRef = s => String(s || '').trim().replace(/^([A-Z]{1,3})[\s-]+(\d+[A-Z]?)$/i, (m, a, n) => `${a.toUpperCase()}-${n}`);
/** First ref of an OSRM step ("I 70; US 6" → "I-70"), else the street name. */
function stepKey(s) {
  const ref = String(s.ref || '').split(';')[0].trim();
  return ref ? normRef(ref) : (s.name || '').trim();
}

/** Build a compact route model from an OSRM /route response (steps=true, polyline6). */
export function buildRoute(json) {
  const r = json?.routes?.[0];
  if (!r) throw new Error(json?.code || 'no route');
  const pts = [], stepIdx = [];
  const steps = r.legs.flatMap(l => l.steps);
  steps.forEach((s, k) => {
    const g = decodePolyline(s.geometry, 6);
    g.forEach((p, j) => { if (j === 0 && pts.length) return; pts.push(p); stepIdx.push(k); });
  });
  // Thin the polyline to ~100 m spacing (keeps math cheap for long routes).
  const keep = [0]; let acc = 0;
  for (let i = 1; i < pts.length; i++) { acc += haversine(pts[i - 1], pts[i]); if (acc >= 100 || i === pts.length - 1) { keep.push(i); acc = 0; } }
  const P = keep.map(i => pts[i]), S = keep.map(i => stepIdx[i]);
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + haversine(P[i - 1], P[i]));

  // Legs = consecutive steps on the same road, short bits folded into neighbours.
  let legs = [];
  steps.forEach((s, k) => {
    const key = stepKey(s) || '…';
    const last = legs[legs.length - 1];
    if (last && last.key === key) { last.distM += s.distance; last.steps.push(k); }
    else legs.push({ key, distM: s.distance, steps: [k], refs: String(s.ref || '').split(';').map(normRef).filter(Boolean) });
  });
  const MIN = 4000;
  const fold = arr => {
    const res = [];
    for (const l of arr) {
      const last = res[res.length - 1];
      if (last && last.key === l.key) { last.distM += l.distM; last.steps.push(...l.steps); }
      else res.push({ ...l, steps: [...l.steps] });
    }
    return res;
  };
  legs = fold(legs);
  for (let pass = 0; pass < 3 && legs.length > 1; pass++) {
    const i = legs.findIndex(l => l.distM < MIN);
    if (i < 0) break;
    // fold short leg into its longer neighbour
    const j = i === 0 ? 1 : (i === legs.length - 1 ? i - 1 : (legs[i - 1].distM >= legs[i + 1].distM ? i - 1 : i + 1));
    const big = legs[j], small = legs[i];
    big.distM += small.distM; big.steps = j < i ? [...big.steps, ...small.steps] : [...small.steps, ...big.steps];
    legs.splice(i, 1);
    legs = fold(legs);
    pass--; if (legs.length < 2) break;
    if (!legs.some(l => l.distM < MIN)) break;
  }
  const stepToLeg = new Map(); legs.forEach((l, i) => l.steps.forEach(k => stepToLeg.set(k, i)));
  const legOf = S.map(k => stepToLeg.get(k) ?? 0);
  legs.forEach((l, i) => { l.from = legOf.indexOf(i); l.to = legOf.lastIndexOf(i); });

  // Colorado portion
  const coFirst = P.findIndex(inCO);
  const startsInCO = inCO(P[0]);
  return {
    pts: P, cum, legOf, legs, durS: r.duration, distM: r.distance,
    bbox: P.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [180, 90, -180, -90]),
    startsInCO, coEntry: coFirst, coEntryAlongM: coFirst >= 0 ? cum[coFirst] : null
  };
}

/** Distance (m) from point q to the route and its along-route position. */
export function nearestOnRoute(route, q) {
  const lat0 = q[1] * RAD, kx = Math.cos(lat0) * 111320, ky = 110574;
  const qx = q[0] * kx, qy = q[1] * ky;
  let best = { d: Infinity, along: 0, i: 0 };
  const P = route.pts;
  for (let i = 1; i < P.length; i++) {
    const ax = P[i - 1][0] * kx, ay = P[i - 1][1] * ky, bx = P[i][0] * kx, by = P[i][1] * ky;
    // cheap reject
    if (Math.abs(ax - qx) > 30000 && Math.abs(bx - qx) > 30000) continue;
    if (Math.abs(ay - qy) > 30000 && Math.abs(by - qy) > 30000) continue;
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    const t = L2 ? Math.max(0, Math.min(1, ((qx - ax) * dx + (qy - ay) * dy) / L2)) : 0;
    const px = ax + t * dx, py = ay + t * dy, d = Math.hypot(qx - px, qy - py);
    if (d < best.d) best = { d, along: route.cum[i - 1] + t * (route.cum[i] - route.cum[i - 1]), i: t < 0.5 ? i - 1 : i };
  }
  return best;
}

const inBox = (b, p, pad) => p[0] >= b[0] - pad && p[0] <= b[2] + pad && p[1] >= b[1] - pad && p[1] <= b[3] + pad;

/**
 * Pick up to `max` cameras within `maxDist` m of the route, spread evenly along it.
 * cams: [{id, lon, lat, name, route, local, img, stream, broken}]
 */
export function selectCameras(route, cams, { max = 15, maxDist = 1500 } = {}) {
  const refs = new Set(route.legs.flatMap(l => l.refs));
  const cand = [];
  for (const c of cams) {
    if (c.broken || !c.img) continue;
    const p = [c.lon, c.lat];
    if (!inBox(route.bbox, p, 0.03)) continue;
    const n = nearestOnRoute(route, p);
    if (n.d > maxDist) continue;
    const onRef = c.route && refs.has(normRef(c.route));
    // Lower score is better: distance, penalise local streets and cams on a different road.
    const score = n.d + (c.local ? 1500 : 0) + (onRef ? 0 : 600);
    cand.push({ ...c, d: Math.round(n.d), along: n.along, leg: route.legOf[n.i], score });
  }
  if (cand.length <= max) return cand.sort((a, b) => a.along - b.along);
  // Even spread: `max` evenly spaced targets from the first to the last candidate (so both ends are covered);
  // each target takes the nearest unpicked camera, nudged toward better (closer, on-route) cameras.
  const lo = Math.min(...cand.map(c => c.along)), hi = Math.max(...cand.map(c => c.along));
  const picked = new Set();
  for (let k = 0; k < max; k++) {
    const target = lo + (hi - lo) * k / (max - 1);
    let best = null, bc = Infinity;
    for (const c of cand) {
      if (picked.has(c)) continue;
      const cost = Math.abs(c.along - target) + 0.5 * c.score;
      if (cost < bc) { bc = cost; best = c; }
    }
    if (best) picked.add(best);
  }
  return [...picked].sort((a, b) => a.along - b.along);
}

/**
 * Match road events (with `geo` = [[lon,lat],…]) to the route by proximity.
 * Returns events with `legIdx`, or drops them when not on the route.
 */
export function matchEvents(route, events) {
  const refs = new Set(route.legs.flatMap(l => l.refs));
  const out = [];
  for (const e of events) {
    const g = e.geo || [];
    if (!g.length) continue;
    if (!g.some(p => inBox(route.bbox, p, 0.02))) continue;
    const sameRoad = e.route && refs.has(normRef(e.route));
    const tol = sameRoad ? 400 : 150;
    const near = g.map(p => nearestOnRoute(route, p)).filter(n => n.d <= tol);
    const ok = g.length === 1 ? near.length === 1 : (near.length >= 2 && (sameRoad || near.length / g.length >= 0.5));
    if (!ok) continue;
    const mid = near[Math.floor(near.length / 2)];
    out.push({ ...e, legIdx: route.legOf[mid.i], along: mid.along, oppDir: oppositeDirection(route, mid.i, e) });
  }
  return out;
}

const DIRS = { northbound: [0, 1], southbound: [0, -1], eastbound: [1, 0], westbound: [-1, 0] };
/** True when the event only affects the direction opposite to our travel (e.g. "I-70 eastbound" while driving west). */
export function oppositeDirection(route, i, e) {
  const txt = `${e.title || ''} ${e.tooltip || ''}`.toLowerCase();
  if (/both directions/.test(txt)) return false;
  const hits = Object.keys(DIRS).filter(d => txt.includes(d));
  if (hits.length !== 1) return false;
  const a = route.pts[Math.max(0, i - 5)], b = route.pts[Math.min(route.pts.length - 1, i + 5)];
  const dx = (b[0] - a[0]) * Math.cos(a[1] * RAD), dy = b[1] - a[1], L = Math.hypot(dx, dy);
  if (!L) return false;
  const [ux, uy] = DIRS[hits[0]];
  return (dx * ux + dy * uy) / L < -0.3;
}

/** Turn a route into verdictFor-compatible {segments, legs[], events[]} with synthetic seg ids. */
export function routeSegments(route, events, startLabel) {
  const segments = {}, legs = [];
  route.legs.forEach((l, i) => {
    const id = `dyn-${i}`;
    const km = Math.round(l.distM / 1000);
    const outside = !route.pts.slice(l.from, l.to + 1).some(inCO);
    segments[id] = { name: { en: `${l.key} · ${km} km`, zh: `${l.key} · ${km} 公里` }, routes: l.refs, km, key: l.key, outside };
    // A full closure on a long highway leg has no easy detour; short local legs usually do.
    legs.push({ seg: id, closure: l.distM > 15000 && l.refs.length ? 'nogo' : 'caution' });
  });
  const matched = matchEvents(route, events).map(e => ({ ...e, segs: [`dyn-${e.legIdx}`] }));
  return { segments, legs, events: matched };
}
