// followthepowder: SkiDay at the root of followthepowder.com.
//   www.followthepowder.com/*  -> 301 https://followthepowder.com/* (query kept)
//   /api/*                     -> ski-data Worker (service binding)
//   everything else            -> GitHub Pages /ski/<path> (private.madeformykids.com), /ski prefix stripped
const APEX = 'followthepowder.com';
const PAGES = 'https://private.madeformykids.com';
const PREFIX = '/ski';
// Repo internals under ski/ that should not be public on the new domain.
const BLOCKED = ['/scripts/', '/README.md'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== APEX) {
      return new Response(null, { status: 301, headers: { Location: `https://${APEX}${url.pathname}${url.search}`, 'Cache-Control': 'public, max-age=86400' } });
    }
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return env.SKI_DATA_SVC.fetch(request);
    if (BLOCKED.some(p => url.pathname === p || url.pathname.startsWith(p))) return new Response('Not found', { status: 404 });
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    // Old /ski/... links on the new host -> the same page at the root.
    if (url.pathname === PREFIX || url.pathname.startsWith(PREFIX + '/')) {
      return new Response(null, { status: 301, headers: { Location: (url.pathname.slice(PREFIX.length) || '/') + url.search } });
    }
    const target = new URL(PREFIX + url.pathname + url.search, PAGES);
    const fwd = new Headers();
    for (const h of ['accept', 'accept-language', 'if-none-match', 'if-modified-since', 'range', 'user-agent']) {
      const v = request.headers.get(h); if (v) fwd.set(h, v);
    }
    const res = await fetch(target, { method: request.method, headers: fwd, redirect: 'manual' });
    const headers = new Headers(res.headers);
    const loc = headers.get('location');
    if (loc) { // e.g. Pages "/ski/foo" -> "/ski/foo/": keep it on this host, without the prefix
      const l = new URL(loc, target);
      if (l.hostname === new URL(PAGES).hostname) {
        let p = l.pathname.startsWith(PREFIX + '/') || l.pathname === PREFIX ? l.pathname.slice(PREFIX.length) || '/' : l.pathname;
        headers.set('location', `https://${APEX}${p}${l.search}`);
      }
    }
    if (res.status === 404 && (request.headers.get('accept') || '').includes('text/html')) {
      return new Response(null, { status: 302, headers: { Location: '/' } });
    }
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }
};
