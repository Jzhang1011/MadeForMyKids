/**
 * <mfk-footer> — SEO sitemap footer (config-driven)
 * Attributes: brand
 * Loads /data/site-nav.json (shared cache via MFK.loadSiteNav / embedded fallback).
 * Columns: Learn, Parents, Resources + legal row (Privacy / Terms / Contact).
 */
(function () {
  if (customElements.get("mfk-footer")) return;

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
    if (typeof window.MFK.loadSiteNav === "function") {
      return window.MFK.loadSiteNav();
    }
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

  const STYLES = `
    :host { display: block; margin-top: auto; }
    footer {
      background: var(--mfk-slate, #1e293b);
      color: #e2e8f0;
      padding: 2.5rem 0 1.5rem;
      margin-top: 0;
    }
    .inner {
      max-width: var(--mfk-max, 1100px);
      margin: 0 auto;
      padding: 0 1.25rem;
    }
    .grid {
      display: grid;
      gap: 1.75rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 700px) {
      .grid { grid-template-columns: 1.6fr 1fr 1fr 1fr; }
    }
    .brand {
      font-family: var(--mfk-font-display, Fredoka, system-ui, sans-serif);
      font-size: 1.15rem;
      font-weight: 600;
      color: #fff;
      margin: 0 0 0.5rem;
    }
    .mission {
      margin: 0;
      color: #cbd5e1;
      font-size: 0.95rem;
      max-width: 28rem;
    }
    h3 {
      margin: 0 0 0.65rem;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mfk-coral-light, #ff9a55);
    }
    ul { list-style: none; margin: 0; padding: 0; }
    li { margin-bottom: 0.4rem; }
    a {
      color: #e2e8f0;
      text-decoration: none;
      font-size: 0.95rem;
    }
    a:hover { color: var(--mfk-coral-light, #ff9a55); }
    a:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; border-radius: 4px; }
    .bottom {
      margin-top: 2rem;
      padding-top: 1.25rem;
      border-top: 1px solid #334155;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .legal {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .legal a {
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .legal a:hover { color: var(--mfk-coral-light, #ff9a55); }
    .disclaimer {
      margin: 0;
      font-size: 0.8rem;
      color: #94a3b8;
      max-width: 48rem;
    }
    .copy {
      margin: 0;
      font-size: 0.8rem;
      color: #94a3b8;
    }
  `;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function listHtml(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return (
      "<ul>" +
      items
        .map(
          (item) =>
            `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`
        )
        .join("") +
      "</ul>"
    );
  }

  class MfkFooter extends HTMLElement {
    static get observedAttributes() {
      return ["brand"];
    }

    constructor() {
      super();
      this._nav = null;
      this.attachShadow({ mode: "open" });
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

    renderSkeleton() {
      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <footer>
          <div class="inner">
            <p class="brand">MadeForMyKids</p>
            <p class="mission">Loading…</p>
          </div>
        </footer>
      `;
    }

    render() {
      const nav = this._nav || FALLBACK_NAV;
      const brand = this.brand;
      const footer = nav.footer || FALLBACK_NAV.footer;
      const year = new Date().getFullYear();
      const learn = footer.learn || [];
      const parents = footer.parents || [];
      const resources = footer.resources || [];
      const legal = footer.legal || [];

      const legalHtml = legal.length
        ? `<ul class="legal" aria-label="Legal">${legal
            .map(
              (item) =>
                `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`
            )
            .join("")}</ul>`
        : "";

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <footer>
          <div class="inner">
            <div class="grid">
              <div>
                <p class="brand">${escapeHtml(brand)}</p>
                <p class="mission">Helping kids thrive in the subjects they need — practice that builds confidence, curiosity, and real skill. Built for our family, and shared with families who want the same.</p>
              </div>
              <div>
                <h3>Learn</h3>
                ${listHtml(learn)}
              </div>
              <div>
                <h3>Parents</h3>
                ${listHtml(parents)}
              </div>
              <div>
                <h3>Resources</h3>
                ${listHtml(resources)}
              </div>
            </div>
            <div class="bottom">
              ${legalHtml}
              <p class="disclaimer">Education disclaimer: ${escapeHtml(brand)} provides practice tools and learning activities for personal and family use. It is not affiliated with the Mathematical Association of America or any school district. Content is offered as educational support, not as a substitute for classroom instruction or professional tutoring.</p>
              <p class="copy">© ${year} ${escapeHtml(brand)}. Made with care for growing minds.</p>
            </div>
          </div>
        </footer>
      `;
    }
  }

  customElements.define("mfk-footer", MfkFooter);
  window.MFK.Footer = MfkFooter;
})();
