/**
 * MadeForMyKids analytics loader — Google Analytics 4 (gtag.js).
 * Included once per page via <script src="/components/analytics.js"></script>.
 * The measurement ID lives here so it only ever needs changing in one place.
 * Guarded against double-loading (typing shells document.write, etc.).
 */
(function () {
  var GA_ID = "G-3JS4Y4BR9Q";
  if (!GA_ID || window.__mfkGaLoaded) return;
  window.__mfkGaLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
  document.head.appendChild(s);

  window.gtag("config", GA_ID);
})();
