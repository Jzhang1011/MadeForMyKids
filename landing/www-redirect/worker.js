// www.madeformyfamily.com -> https://madeformyfamily.com (same path + query), 301.
export default {
  fetch(request) {
    const url = new URL(request.url);
    return new Response(null, {
      status: 301,
      headers: { Location: 'https://madeformyfamily.com' + url.pathname + url.search, 'Cache-Control': 'public, max-age=86400' }
    });
  }
};
