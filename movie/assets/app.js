/* MadeForMyKids Watch to Grow — multi-part loader */
(async function () {
  const parts = ["/movie/assets/app.part0.js", "/movie/assets/app.part1.js", "/movie/assets/app.part2.js"];
  const texts = await Promise.all(parts.map(function (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status + " " + u); return r.text(); }); }));
  (0, eval)(texts.join(""));
})().catch(function (err) {
  console.error(err);
  var root = document.querySelector("[data-app]");
  if (root) root.innerHTML = "<section class=\"page-hero\"><h1>App failed to load</h1><p class=\"empty\">" + String(err && err.message || err) + "</p></section>";
});
