/**
 * <mfk-breadcrumbs>
 * data-items='[{"label":"Home","href":"/"},{"label":"Typing"}]'
 * Last item is current page (no link unless href provided)
 */
(function () {
  if (customElements.get("mfk-breadcrumbs")) return;

  const STYLES = `
    :host { display: block; }
    nav {
      font-size: 0.875rem;
      color: var(--mfk-slate-soft, #64748b);
    }
    ol {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
    }
    li { display: inline-flex; align-items: center; gap: 0.35rem; }
    a {
      color: var(--mfk-coral-dark, #e8661a);
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
    a:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; border-radius: 4px; }
    .sep { color: var(--mfk-slate-faint, #94a3b8); user-select: none; }
    .current { color: var(--mfk-slate, #1e293b); font-weight: 500; }
  `;

  class MfkBreadcrumbs extends HTMLElement {
    static get observedAttributes() {
      return ["data-items"];
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
      if (!raw) return [{ label: "Home", href: "/" }];
      try {
        return JSON.parse(raw);
      } catch (_) {
        return [{ label: "Home", href: "/" }];
      }
    }

    render() {
      const items = this.getItems();
      const html = items
        .map((item, i) => {
          const isLast = i === items.length - 1;
          const sep = i > 0 ? `<span class="sep" aria-hidden="true">›</span>` : "";
          if (isLast || !item.href) {
            return `<li>${sep}<span class="current" ${isLast ? 'aria-current="page"' : ""}>${item.label}</span></li>`;
          }
          return `<li>${sep}<a href="${item.href}">${item.label}</a></li>`;
        })
        .join("");

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <nav aria-label="Breadcrumb"><ol>${html}</ol></nav>
      `;
    }
  }

  customElements.define("mfk-breadcrumbs", MfkBreadcrumbs);
  window.MFK = window.MFK || {};
  window.MFK.Breadcrumbs = MfkBreadcrumbs;
})();
