// madeformykids-landing: one Worker, two sites, split by hostname.
//
//   madeformyfamily.com      -> Family Board marketing site (static assets in ./public):
//                               /, /guides/, /visual-guidance/, /visual-schedules/ ...
//                               anything else 301 -> same path on www.madeformykids.com
//   www.madeformyfamily.com  -> 301 to the apex
//   madeformykids.com (+www) -> kids learning portal + /ski/, proxied from GitHub Pages
//                               (private.madeformykids.com). Family Board pages 301 ->
//                               madeformyfamily.com.

const FAMILY_HOST = 'madeformyfamily.com';
const FAMILY_ORIGIN = 'https://madeformyfamily.com';
const KIDS_ORIGIN = 'https://www.madeformykids.com';
const PORTAL_ORIGIN = 'https://private.madeformykids.com';
// The old Pages Family Board (/family/, a single page) moved to the Family Board app.
// The new app has no matching sub-routes, so every /family/* goes to its root.
const FAMILY_APP = 'https://family.madeformyfamily.com/';

// Family Board content (lives in ./public). "/" is Family Board only on the family host.
const FAMILY_PREFIXES = ['/guides', '/visual-guidance', '/visual-schedules'];
// Repo internals that GitHub Pages would otherwise expose through the proxy.
const BLOCKED_PREFIXES = ['/landing'];

const hasPrefix = (path, list) => list.some(p => path === p || path.startsWith(p + '/'));

function redirect(origin, url) {
  return new Response(null, {
    status: 301,
    headers: { Location: origin + url.pathname + url.search, 'Cache-Control': 'public, max-age=3600' }
  });
}

async function proxyPortal(request, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const target = new URL(url.pathname + url.search, PORTAL_ORIGIN);
  const fwd = new Headers();
  for (const h of ['accept', 'accept-language', 'if-none-match', 'if-modified-since', 'range', 'user-agent']) {
    const v = request.headers.get(h);
    if (v) fwd.set(h, v);
  }
  const res = await fetch(target, { method: request.method, headers: fwd, redirect: 'manual' });
  const headers = new Headers(res.headers);
  const loc = headers.get('location');
  if (loc) {
    const l = new URL(loc, target);
    if (l.hostname === new URL(PORTAL_ORIGIN).hostname) {
      l.protocol = 'https:';
      l.host = url.host;
      headers.set('location', l.toString());
    }
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const path = url.pathname;

    if (host === 'www.' + FAMILY_HOST) return redirect(FAMILY_ORIGIN, url);

    if (hasPrefix(path, ['/family'])) {
      return new Response(null, { status: 301, headers: { Location: FAMILY_APP, 'Cache-Control': 'public, max-age=3600' } });
    }

    if (host === FAMILY_HOST) {
      if (path === '/' || path === '/index.html' || hasPrefix(path, FAMILY_PREFIXES)) {
        return env.ASSETS.fetch(request);
      }
      return redirect(KIDS_ORIGIN, url);
    }

    // madeformykids.com, www.madeformykids.com, workers.dev preview
    if (hasPrefix(path, FAMILY_PREFIXES)) return redirect(FAMILY_ORIGIN, url);
    if (hasPrefix(path, BLOCKED_PREFIXES)) return new Response('Not found', { status: 404 });
    // Ski dashboard data API (scheduled refresh + KV) lives in the ski-data Worker.
    if (path.startsWith('/ski/api/') && env.SKI_DATA_SVC) return env.SKI_DATA_SVC.fetch(request);
    return proxyPortal(request, url);
  }
};
