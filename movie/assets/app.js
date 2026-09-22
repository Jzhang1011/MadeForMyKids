/* MadeForMyKids Watch to Grow — 9-chunk loader (chrome-guarded) */
(async function () {
  const parts = ["/movie/assets/app.ch0.js", "/movie/assets/app.ch1.js", "/movie/assets/app.ch2.js", "/movie/assets/app.ch3.js", "/movie/assets/app.ch4.js", "/movie/assets/app.ch5.js", "/movie/assets/app.ch6.js", "/movie/assets/app.ch7.js", "/movie/assets/app.ch8.js"];
  const texts = await Promise.all(parts.map(function (u) {
    return fetch(u).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " " + u);
      return r.text();
    });
  }));
  (0, eval)(texts.join(""));
})().catch(function (err) {
  console.error(err);
  var root = document.querySelector("[data-app]");
  if (root) root.innerHTML = "<section class=\"page-hero\"><h1>App failed to load</h1><p class=\"empty\">" + String(err && err.message || err) + "</p></section>";
});
