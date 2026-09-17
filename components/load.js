/**
 * MadeForMyKids one-shot loader — theme + core chrome (+ optional extras)
 *
 * Usage:
 *   <script src="/components/load.js" data-mfk-active="home"></script>
 *   Optional: data-mfk-extras="activityCard,pageHero,parentNote,seo,toast,feedback"
 *
 * Or: MFK.load({ active: 'home', extras: ['activityCard', 'seo'] })
 */
(function () {
  window.MFK = window.MFK || {};

  const BASE = (function () {
    const scripts = document.getElementsByTagName("script");
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].src || "";
      if (src.indexOf("/components/load.js") !== -1) {
        return src.replace(/\/load\.js(?:\?.*)?$/, "");
      }
    }
    return "/components";
  })();

  const CORE = ["header.js", "footer.js", "button.js", "toast.js", "modal.js"];

  const EXTRAS = {
    navigation: "navigation.js",
    breadcrumbs: "breadcrumbs.js",
    pageHero: "pageHero.js",
    activityCard: "activityCard.js",
    lessonCard: "lessonCard.js",
    progressBar: "progressBar.js",
    skillBadge: "skillBadge.js",
    difficultyBadge: "difficultyBadge.js",
    feedback: "feedback.js",
    relatedActivities: "relatedActivities.js",
    parentNote: "parentNote.js",
    seo: "seo.js",
  };

  function ensureTheme() {
    if (document.querySelector('link[data-mfk-theme]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = BASE + "/theme.css";
    link.setAttribute("data-mfk-theme", "1");
    document.head.appendChild(link);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[data-mfk-src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.defer = true;
      s.setAttribute("data-mfk-src", src);
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(s);
    });
  }

  function parseExtras(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return String(raw)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  async function load(opts = {}) {
    ensureTheme();
    const extras = parseExtras(opts.extras);
    const files = CORE.slice();
    extras.forEach((key) => {
      const file = EXTRAS[key] || EXTRAS[key.replace(/\.js$/, "")];
      if (file && files.indexOf(file) === -1) files.push(file);
    });

    await Promise.all(files.map((f) => loadScript(BASE + "/" + f)));

    const active = opts.active;
    if (active) {
      document.querySelectorAll("mfk-header").forEach((el) => {
        el.setAttribute("active", active);
      });
    }

    document.documentElement.classList.add("mfk-ready");
    document.dispatchEvent(new CustomEvent("mfk:ready"));
    return window.MFK;
  }

  window.MFK.load = load;
  window.MFK.componentsBase = BASE;

  // Auto-run when included as a script tag
  const current = document.currentScript;
  if (current && current.src && current.src.indexOf("load.js") !== -1) {
    const active = current.getAttribute("data-mfk-active") || "";
    const extras = current.getAttribute("data-mfk-extras") || "";
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => load({ active, extras }));
    } else {
      load({ active, extras });
    }
  }
})();
