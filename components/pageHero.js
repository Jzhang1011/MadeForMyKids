/**
 * <mfk-page-hero>
 * Attributes: title, subtitle, badge, cta-label, cta-href, cta2-label, cta2-href
 * Slots: badge, actions (optional)
 */
(function () {
  if (customElements.get("mfk-page-hero")) return;

  const STYLES = `
    :host { display: block; }
    .hero {
      background: linear-gradient(145deg, var(--mfk-coral-soft, #fff0e6) 0%, var(--mfk-white, #fff) 55%, #fff8f2 100%);
      border: 1px solid var(--mfk-border-warm, #fcd9b8);
      border-radius: var(--mfk-radius-lg, 20px);
      padding: 2rem 1.5rem;
      box-shadow: var(--mfk-shadow, 0 4px 14px rgba(30,41,59,0.08));
    }
    @media (min-width: 700px) {
      .hero { padding: 2.75rem 2.5rem; }
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: var(--mfk-white, #fff);
      border: 1px solid var(--mfk-border-warm, #fcd9b8);
      color: var(--mfk-coral-dark, #e8661a);
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 0.85rem;
    }
    h1 {
      font-family: var(--mfk-font-display, Fredoka, system-ui, sans-serif);
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      font-weight: 600;
      letter-spacing: -0.02em;
      margin: 0 0 0.65rem;
      color: var(--mfk-slate, #1e293b);
      line-height: 1.2;
    }
    .sub {
      margin: 0;
      font-size: 1.05rem;
      color: var(--mfk-slate-soft, #64748b);
      max-width: 36rem;
      line-height: 1.55;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      padding: 0.7rem 1.25rem;
      border-radius: 9999px;
      border: 2px solid transparent;
      cursor: pointer;
    }
    .btn:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
    .primary {
      background: var(--mfk-coral, #ff7d26);
      color: #fff;
      box-shadow: 0 4px 12px rgba(255,125,38,0.35);
    }
    .primary:hover { background: var(--mfk-coral-dark, #e8661a); }
    .secondary {
      background: var(--mfk-white, #fff);
      color: var(--mfk-slate, #1e293b);
      border-color: var(--mfk-border, #e2e8f0);
    }
    .secondary:hover { border-color: var(--mfk-coral, #ff7d26); color: var(--mfk-coral-dark, #e8661a); }
  `;

  class MfkPageHero extends HTMLElement {
    static get observedAttributes() {
      return ["title", "subtitle", "badge", "cta-label", "cta-href", "cta2-label", "cta2-href"];
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

    render() {
      const title = this.getAttribute("title") || "MadeForMyKids";
      const subtitle = this.getAttribute("subtitle") || "";
      const badge = this.getAttribute("badge") || "";
      const ctaLabel = this.getAttribute("cta-label");
      const ctaHref = this.getAttribute("cta-href") || "#";
      const cta2Label = this.getAttribute("cta2-label");
      const cta2Href = this.getAttribute("cta2-href") || "#";

      let actions = "";
      if (ctaLabel) actions += `<a class="btn primary" href="${ctaHref}">${ctaLabel}</a>`;
      if (cta2Label) actions += `<a class="btn secondary" href="${cta2Href}">${cta2Label}</a>`;

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <section class="hero">
          ${badge ? `<span class="badge">${badge}</span>` : '<slot name="badge"></slot>'}
          <h1>${title}</h1>
          ${subtitle ? `<p class="sub">${subtitle}</p>` : ""}
          <div class="actions">
            ${actions}
            <slot name="actions"></slot>
          </div>
        </section>
      `;
    }
  }

  customElements.define("mfk-page-hero", MfkPageHero);
  window.MFK = window.MFK || {};
  window.MFK.PageHero = MfkPageHero;
})();
