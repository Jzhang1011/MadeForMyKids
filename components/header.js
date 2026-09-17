/**
 * <mfk-header> — MadeForMyKids site chrome
 * Attributes: brand (default MadeForMyKids), active (home|typing|amc)
 */
(function () {
  if (customElements.get("mfk-header")) return;

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
      height: var(--mfk-header-h, 64px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      text-decoration: none;
      color: var(--mfk-slate, #1e293b);
      font-family: var(--mfk-font-display, Fredoka, system-ui, sans-serif);
      font-weight: 600;
      font-size: 1.2rem;
    }
    .brand:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; border-radius: 6px; }
    .logo {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, var(--mfk-coral, #ff7d26), var(--mfk-coral-light, #ff9a55));
      display: grid; place-items: center; color: #fff; font-size: 1.1rem;
      box-shadow: 0 2px 8px rgba(255,125,38,0.35);
    }
    nav.desktop { display: none; gap: 0.25rem; align-items: center; }
    @media (min-width: 768px) { nav.desktop { display: flex; } .menu-btn { display: none !important; } }
    nav.desktop a {
      text-decoration: none;
      color: var(--mfk-slate-mid, #334155);
      font-weight: 500;
      font-size: 0.95rem;
      padding: 0.45rem 0.85rem;
      border-radius: 9999px;
    }
    nav.desktop a:hover { background: var(--mfk-coral-soft, #fff0e6); color: var(--mfk-coral-dark, #e8661a); }
    nav.desktop a.active {
      background: var(--mfk-coral-soft, #fff0e6);
      color: var(--mfk-coral-dark, #e8661a);
      font-weight: 600;
    }
    nav.desktop a:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
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
  `;

  const LINKS = [
    { id: "home", label: "Home", href: "/" },
    { id: "typing", label: "Typing", href: "/typing.html" },
    { id: "amc", label: "AMC Math", href: "/amc/" },
  ];

  class MfkHeader extends HTMLElement {
    constructor() {
      super();
      this._open = false;
      this.attachShadow({ mode: "open" });
    }

    static get observedAttributes() {
      return ["brand", "active"];
    }

    connectedCallback() {
      this.render();
    }

    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }

    get brand() {
      return this.getAttribute("brand") || "MadeForMyKids";
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

    render() {
      const active = this.active;
      const linksHtml = LINKS.map(
        (l) =>
          `<a href="${l.href}" class="${active === l.id ? "active" : ""}" ${
            active === l.id ? 'aria-current="page"' : ""
          }>${l.label}</a>`
      ).join("");

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <header class="bar">
          <div class="inner">
            <a class="brand" href="/" aria-label="${this.brand} home">
              <span class="logo" aria-hidden="true">🦊</span>
              <span>${this.brand}</span>
            </a>
            <nav class="desktop" aria-label="Primary">${linksHtml}</nav>
            <button type="button" class="menu-btn" aria-expanded="false" aria-controls="mfk-mobile-nav" aria-label="Open menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16"/>
              </svg>
            </button>
          </div>
          <nav class="panel" id="mfk-mobile-nav" aria-label="Mobile">${linksHtml}</nav>
        </header>
      `;

      this.shadowRoot.querySelector(".menu-btn").addEventListener("click", () => this.toggleMenu());
      this.shadowRoot.querySelectorAll(".panel a").forEach((a) =>
        a.addEventListener("click", () => {
          if (this._open) this.toggleMenu();
        })
      );
    }
  }

  customElements.define("mfk-header", MfkHeader);
  window.MFK = window.MFK || {};
  window.MFK.Header = MfkHeader;
})();
