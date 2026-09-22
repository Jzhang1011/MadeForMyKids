/* MadeForMyKids Watch to Grow — gzip+b64 chunk loader (chrome-guarded) */
(async function () {
  const parts = ["/movie/assets/app.gz0_0.b64", "/movie/assets/app.gz0_1.b64", "/movie/assets/app.gz0_2.b64", "/movie/assets/app.gz0_3.b64", "/movie/assets/app.gz1_0.b64", "/movie/assets/app.gz1_1.b64", "/movie/assets/app.gz1_2.b64", "/movie/assets/app.gz1_3.b64", "/movie/assets/app.gz2_0.b64", "/movie/assets/app.gz2_1.b64", "/movie/assets/app.gz2_2.b64", "/movie/assets/app.gz2_3.b64", "/movie/assets/app.gz3_0.b64", "/movie/assets/app.gz3_1.b64", "/movie/assets/app.gz3_2.b64", "/movie/assets/app.gz3_3.b64", "/movie/assets/app.gz4.b64"];
  const b64 = (await Promise.all(parts.map(function (u) {
    return fetch(u).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " " + u);
      return r.text();
    });
  }))).join("").replace(/\s+/g, "");
  const bin = Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); });
  const ds = new DecompressionStream("gzip");
  const text = await new Response(new Blob([bin]).stream().pipeThrough(ds)).text();
  (0, eval)(text);
})().catch(function (err) {
  console.error(err);
  var root = document.querySelector("[data-app]");
  if (root) root.innerHTML = "<section class=\"page-hero\"><h1>App failed to load</h1><p class=\"empty\">" + String(err && err.message || err) + "</p></section>";
});
