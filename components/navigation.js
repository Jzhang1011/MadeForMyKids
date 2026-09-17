/**
 * <mfk-navigation> — secondary / section nav
 * Attributes: label (aria), items as JSON in data-items or nested <a> children
 * Or: data-items='[{"label":"Overview","href":"#overview"},...]'
 * Attribute active = href or id of current item
 */
(function () {
  if (customElements.get("mfk-navigation")) return;

  const STYLES = `
    :host { display: block; }
    nav {
      background: var(--mfk-white, #fff);
      border: 1px solid var(--mfk-border, #e2e8f0);
      border-radius: var(--mfk-radius, 12px);
      padding: 0.35rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    a {
      text-decoration: none;
      color: var(--mfk-slate-mid, #334155);
      font-weight: 500;
      font-size: 0.9rem;
      padding: 0.45rem 0.85rem;
      border-radius: 9999px;
    }
    a:hover { background: var(--mfk-coral-soft, #fff0e6); color: var(--mfk-coral-dark, #e8661a); }
    a.active {
      background: var(--mfk-coral, #ff7d26);
      color: #fff;
    }
    a:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
  `;

  class MfkNavigation extends HTMLElement {
    static get observedAttributes() {
      return ["label", "active", "data-items"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
      this.render();
    }

    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }

    getItems() {
      const raw = this.getAttribute("data-items") || this.dataset.items;
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (_) {
          return [];
        }
      }
      return Array.from(this.querySelectorAll("a")).map((a) => ({
        label: a.textContent.trim(),
        href: a.getAttribute("href") || "#",
      }));
    }

    render() {
      const items = this.getItems();
      const active = this.getAttribute("active") || "";
      const label = this.getAttribute("label") || "Section";
      const links = items
        .map((item) => {
          const isActive = active === item.href || active === item.id || active === item.label;
          return `<a href="${item.href}" class="${isActive ? "active" : ""}" ${
            isActive ? 'aria-current="page"' : ""
          }>${item.label}</a>`;
        })
        .join("");

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <nav aria-label="${label}">${links || "<slot></slot>"}</nav>
      `;
    }
  }

  customElements.define("mfk-navigation", MfkNavigation);
  window.MFK = window.MFK || {};
  window.MFK.Navigation = MfkNavigation;
})();
