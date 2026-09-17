/**
 * <mfk-header> — MadeForMyKids site chrome (config-driven)
 * Attributes: brand (default MadeForMyKids), active (home|learn|practice|games|parents)
 * Loads /data/site-nav.json (in-memory cache + embedded fallback).
 */
(function () {
  if (customElements.get("mfk-header")) return;

  const NAV_URL = "/data/site-nav.json";

  const FALLBACK_NAV = {
    brand: "MadeForMyKids",
    homeHref: "/",
    main: [
      { id: "learn", label: "Learn", href: "/learn/" },
      { id: "practice", label: "Practice", href: "/practice/" },
      { id: "games", label: "Games", href: "/games/" },
      { id: "parents", label: "Parents", href: "/parents/" },
    ],
    footer: {
      learn: [
        { label: "Typing", href: "/typing.html" },
        { label: "Mac Skills", href: "/mac/" },
        { label: "Math", href: "/amc/" },
        { label: "STEM", href: "/stem/" },
      ],
      parents: [
        { label: "About", href: "/parents/about/" },
        { label: "How It Works", href: "/parents/how-it-works/" },
        { label: "Progress", href: "/parents/progress/" },
        { label: "FAQ", href: "/parents/faq/" },
      ],
      resources: [
        { label: "Learning Guides", href: "/guides/" },
        { label: "Blog", href: "/blog/" },
      ],
      legal: [
        { label: "Privacy", href: "/privacy/" },
        { label: "Terms", href: "/terms/" },
        { label: "Contact", href: "/contact/" },
      ],
    },
    search: { enabled: true, placeholder: "Search skills & activities" },
    parentArea: { label: "Parents", href: "/parents/" },
  };

  window.MFK = window.MFK || {};

  function loadSiteNav() {
    if (window.MFK._siteNav) return Promise.resolve(window.MFK._siteNav);
    if (window.MFK._siteNavPromise) return window.MFK._siteNavPromise;

    window.MFK._siteNavPromise = fetch(NAV_URL, { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error("site-nav HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        window.MFK._siteNav = data;
        return data;
      })
      .catch(function () {
        window.MFK._siteNav = FALLBACK_NAV;
        return FALLBACK_NAV;
      });

    return window.MFK._siteNavPromise;
  }

  window.MFK.loadSiteNav = loadSiteNav;

  const STYLES = `
    :host { display: block; position: sticky; top: 0; z-index: 100; }
    .bar {
      background: var(--mfk-white, #fff);
      border-bottom: 1px solid var(--mfk-border, #e2e8f0);
      box-shadow: 0 1px 0 rgba(255,125,38,0.08);
    }
    .inner {
      max-width: var(--mfk-max, 1100px);
      margin: 0 auto;
      padding: 0 1.25rem;
      min-height: var(--mfk-header-h, 64px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      text-decoration: none;
      color: var(--mfk-slate, #1e293b);
      font-family: var(--mfk-font-display, Fredoka, system-ui, sans-serif);
      font-weight: 600;
      font-size: 1.15rem;
      flex-shrink: 0;
    }
    .brand:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; border-radius: 6px; }
    .logo {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, var(--mfk-coral, #ff7d26), var(--mfk-coral-light, #ff9a55));
      display: grid; place-items: center; color: #fff; font-size: 1.1rem;
      box-shadow: 0 2px 8px rgba(255,125,38,0.35);
    }
    .right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      justify-content: flex-end;
      min-width: 0;
    }
    nav.desktop { display: none; gap: 0.15rem; align-items: center; }
    @media (min-width: 900px) {
      nav.desktop { display: flex; }
      .menu-btn { display: none !important; }
      .search-wrap.desktop-search { display: flex; }
    }
    nav.desktop a {
      text-decoration: none;
      color: var(--mfk-slate-mid, #334155);
      font-weight: 500;
      font-size: 0.95rem;
      padding: 0.45rem 0.75rem;
      border-radius: 9999px;
      white-space: nowrap;
    }
    nav.desktop a:hover { background: var(--mfk-coral-soft, #fff0e6); color: var(--mfk-coral-dark, #e8661a); }
    nav.desktop a.active {
      background: var(--mfk-coral-soft, #fff0e6);
      color: var(--mfk-coral-dark, #e8661a);
      font-weight: 600;
    }
    nav.desktop a:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
    .parent-cta {
      display: none;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.4rem 0.9rem;
      border-radius: 9999px;
      border: 1px solid var(--mfk-border-warm, #fcd9b8);
      color: var(--mfk-coral-dark, #e8661a);
      background: var(--mfk-coral-soft, #fff0e6);
      white-space: nowrap;
    }
    .parent-cta:hover { background: var(--mfk-coral-muted, #ffe4d1); }
    .parent-cta.active { box-shadow: inset 0 0 0 2px var(--mfk-coral, #ff7d26); }
    .parent-cta:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
    @media (min-width: 900px) { .parent-cta { display: inline-flex; align-items: center; } }
    .search-wrap {
      display: none;
      align-items: center;
      gap: 0.35rem;
      max-width: 220px;
      flex: 1;
    }
    .search-wrap input {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--mfk-border, #e2e8f0);
      border-radius: 9999px;
      padding: 0.4rem 0.85rem;
      font: inherit;
      font-size: 0.875rem;
      color: var(--mfk-slate, #1e293b);
      background: var(--mfk-cream, #fffbf7);
    }
    .search-wrap input:focus {
      outline: 3px solid var(--mfk-coral, #ff7d26);
      outline-offset: 1px;
      border-color: var(--mfk-coral-light, #ff9a55);
    }
    .search-wrap button {
      flex-shrink: 0;
      border: none;
      background: var(--mfk-coral, #ff7d26);
      color: #fff;
      border-radius: 9999px;
      width: 36px; height: 36px;
      cursor: pointer;
      display: grid; place-items: center;
    }
    .search-wrap button:hover { background: var(--mfk-coral-dark, #e8661a); }
    .search-wrap button:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
    .menu-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 42px; height: 42px; border-radius: 10px;
      border: 1px solid var(--mfk-border, #e2e8f0);
      background: var(--mfk-white, #fff);
      cursor: pointer; color: var(--mfk-slate, #1e293b);
    }
    .menu-btn:hover { background: var(--mfk-coral-soft, #fff0e6); }
    .menu-btn:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
    .panel {
      display: none;
      border-top: 1px solid var(--mfk-border, #e2e8f0);
      background: var(--mfk-white, #fff);
      padding: 0.75rem 1.25rem 1rem;
    }
    .panel.open { display: block; }
    .panel .mobile-search {
      display: flex;
      gap: 0.35rem;
      margin-bottom: 0.75rem;
    }
    .panel .mobile-search input {
      flex: 1;
      border: 1px solid var(--mfk-border, #e2e8f0);
      border-radius: 9999px;
      padding: 0.55rem 0.85rem;
      font: inherit;
      font-size: 0.95rem;
      background: var(--mfk-cream, #fffbf7);
    }
    .panel .mobile-search input:focus {
      outline: 3px solid var(--mfk-coral, #ff7d26);
      outline-offset: 1px;
    }
    .panel .mobile-search button {
      border: none;
      background: var(--mfk-coral, #ff7d26);
      color: #fff;
      border-radius: 9999px;
      padding: 0 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .panel a {
      display: block;
      text-decoration: none;
      color: var(--mfk-slate-mid, #334155);
      font-weight: 500;
      padding: 0.75rem 0.85rem;
      border-radius: 10px;
    }
    .panel a:hover, .panel a.active {
      background: var(--mfk-coral-soft, #fff0e6);
      color: var(--mfk-coral-dark, #e8661a);
    }
    .panel a:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }
  `;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  class MfkHeader extends HTMLElement {
    constructor() {
      super();
      this._open = false;
      this._nav = null;
      this.attachShadow({ mode: "open" });
    }

    static get observedAttributes() {
      return ["brand", "active"];
    }

    connectedCallback() {
      this.renderSkeleton();
      loadSiteNav().then((nav) => {
        this._nav = nav;
        this.render();
      });
    }

    attributeChangedCallback() {
      if (this.isConnected && this._nav) this.render();
    }

    get brand() {
      const attr = this.getAttribute("brand");
      if (attr) return attr;
      if (this._nav && this._nav.brand) return this._nav.brand;
      return "MadeForMyKids";
    }

    get active() {
      return (this.getAttribute("active") || "").toLowerCase();
    }

    toggleMenu() {
      this._open = !this._open;
      const panel = this.shadowRoot.querySelector(".panel");
      const btn = this.shadowRoot.querySelector(".menu-btn");
      if (panel) panel.classList.toggle("open", this._open);
      if (btn) {
        btn.setAttribute("aria-expanded", String(this._open));
        btn.setAttribute("aria-label", this._open ? "Close menu" : "Open menu");
      }
    }

    runSearch(query) {
      const q = (query || "").trim();
      if (!q) {
        if (window.MFK && window.MFK.toast && typeof window.MFK.toast.show === "function") {
          window.MFK.toast.show({ message: "Search coming soon — try Typing or AMC Math.", type: "info" });
        }
        window.location.href = "/search/";
        return;
      }
      window.location.href = "/search/?q=" + encodeURIComponent(q);
    }

    bindSearch(form) {
      if (!form) return;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = form.querySelector('input[type="search"]');
        this.runSearch(input ? input.value : "");
      });
    }

    linkHtml(item, active) {
      const isActive = active === item.id;
      return `<a href="${escapeHtml(item.href)}" class="${isActive ? "active" : ""}" ${
        isActive ? 'aria-current="page"' : ""
      }>${escapeHtml(item.label)}</a>`;
    }

    renderSkeleton() {
      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <header class="bar">
          <div class="inner">
            <a class="brand" href="/" aria-label="MadeForMyKids home">
              <span class="logo" aria-hidden="true">🦊</span>
              <span>MadeForMyKids</span>
            </a>
            <div class="right">
              <span class="sr-only">Loading navigation…</span>
            </div>
          </div>
        </header>
      `;
    }

    render() {
      const nav = this._nav || FALLBACK_NAV;
      const active = this.active;
      const brand = this.brand;
      const homeHref = nav.homeHref || "/";
      const main = Array.isArray(nav.main) ? nav.main : FALLBACK_NAV.main;
      const search = nav.search || FALLBACK_NAV.search;
      const parentArea = nav.parentArea || FALLBACK_NAV.parentArea;
      const searchEnabled = search && search.enabled !== false;
      const placeholder = (search && search.placeholder) || "Search skills & activities";

      const linksHtml = main.map((l) => this.linkHtml(l, active)).join("");
      const parentActive = active === "parents" || active === (parentArea && parentArea.id);
      const parentHref = (parentArea && parentArea.href) || "/parents/";
      const parentLabel = (parentArea && parentArea.label) || "Parents";

      const searchDesktop = searchEnabled
        ? `<form class="search-wrap desktop-search" role="search" aria-label="Site search">
            <label class="sr-only" for="mfk-search-desktop">Search</label>
            <input id="mfk-search-desktop" type="search" name="q" placeholder="${escapeHtml(placeholder)}" autocomplete="off" />
            <button type="submit" aria-label="Search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
                <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
              </svg>
            </button>
          </form>`
        : "";

      const searchMobile = searchEnabled
        ? `<form class="mobile-search" role="search" aria-label="Site search">
            <label class="sr-only" for="mfk-search-mobile">Search</label>
            <input id="mfk-search-mobile" type="search" name="q" placeholder="${escapeHtml(placeholder)}" autocomplete="off" />
            <button type="submit">Go</button>
          </form>`
        : "";

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <header class="bar">
          <div class="inner">
            <a class="brand" href="${escapeHtml(homeHref)}" aria-label="${escapeHtml(brand)} home">
              <span class="logo" aria-hidden="true">🦊</span>
              <span>${escapeHtml(brand)}</span>
            </a>
            <div class="right">
              <nav class="desktop" aria-label="Primary">${linksHtml}</nav>
              ${searchDesktop}
              <a class="parent-cta ${parentActive ? "active" : ""}" href="${escapeHtml(parentHref)}">${escapeHtml(parentLabel)}</a>
              <button type="button" class="menu-btn" aria-expanded="false" aria-controls="mfk-mobile-nav" aria-label="Open menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16"/>
                </svg>
              </button>
            </div>
          </div>
          <nav class="panel" id="mfk-mobile-nav" aria-label="Mobile">
            ${searchMobile}
            ${linksHtml}
          </nav>
        </header>
      `;

      const menuBtn = this.shadowRoot.querySelector(".menu-btn");
      if (menuBtn) {
        menuBtn.addEventListener("click", () => this.toggleMenu());
        menuBtn.setAttribute("aria-expanded", String(this._open));
      }
      const panel = this.shadowRoot.querySelector(".panel");
      if (panel && this._open) panel.classList.add("open");

      this.shadowRoot.querySelectorAll(".panel a").forEach((a) =>
        a.addEventListener("click", () => {
          if (this._open) this.toggleMenu();
        })
      );

      this.shadowRoot.querySelectorAll('form[role="search"]').forEach((form) => this.bindSearch(form));
    }
  }

  customElements.define("mfk-header", MfkHeader);
  window.MFK.Header = MfkHeader;
})();
