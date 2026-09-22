/* Watch to Grow — one HTML page, two JSON files.
   Routes live in the hash: #/  #/about  #/search?q=  #/learn/stem  #/age/8  #/movie/id
*/
(function () {
  const state = { site: null, movies: null };

  const $ = (sel, root = document) => root.querySelector(sel);

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseRoute() {
    const raw = (location.hash || "#/").replace(/^#/, "") || "/";
    const url = new URL(raw, "http://watch.local");
    const parts = url.pathname.replace(/^\//, "").split("/").filter(Boolean);
    const q = url.searchParams.get("q") || "";
    if (!parts.length) return { view: "home" };
    if (parts[0] === "about") return { view: "about" };
    if (parts[0] === "search") return { view: "search", q };
    if (parts[0] === "learn") return { view: "need", slug: parts[1] };
    if (parts[0] === "profession") return { view: "profession", slug: parts[1] || "" };
    if (parts[0] === "age") return { view: "age", slug: parts[1] };
    if (parts[0] === "movie") return { view: "movie", id: decodeURIComponent(parts[1] || "") };
    return { view: "home" };
  }

  function go(hash) {
    const next = hash.startsWith("#") ? hash : `#${hash}`;
    if (location.hash === next) render();
    else location.hash = next;
  }

  function movieHref(id) { return `#/movie/${encodeURIComponent(id)}`; }
  function needHref(slug) { return `#/learn/${encodeURIComponent(slug)}`; }
  function ageHref(slug) { return `#/age/${encodeURIComponent(slug)}`; }
  function professionHref(slug) { return slug ? `#/profession/${encodeURIComponent(slug)}` : "#/profession"; }

  function needByName(name) {
    return state.site.needs.find((n) => n.name === name);
  }
  function needBySlug(slug) {
    return state.site.needs.find((n) => n.slug === slug);
  }
  function ageBand(age) {
    return state.site.ages.find((a) => a.match.includes(age)) || state.site.ages.at(-1);
  }
  function ageSort(age) {
    const n = parseInt(String(age), 10);
    return Number.isFinite(n) ? n : 99;
  }
  function movieById(id) {
    return state.movies.find((m) => m.id === id);
  }
  function taggedWith(needName) {
    return state.movies
      .filter((m) => {
        if (m.primary === needName || (m.secondary || []).includes(needName)) return true;
        if (needName === "Professions" && (m.professions || []).length) return true;
        return false;
      })
      .sort((a, b) => (b.featured - a.featured) || ageSort(a.age) - ageSort(b.age) || a.title.localeCompare(b.title));
  }

  function withProfession(name) {
    return state.movies
      .filter((m) => (m.professions || []).includes(name))
      .sort((a, b) => (b.featured - a.featured) || ((a.kind === "series" ? 0 : 1) - (b.kind === "series" ? 0 : 1)) || a.title.localeCompare(b.title));
  }

