/**
 * <mfk-page-hero>
 * Attributes: title, subtitle, badge, cta-label, cta-href, cta2-label, cta2-href
 * Slots: badge, actions (optional)
 * Elevated: soft orbs, glass badge, accent underline, gradient CTA glow
 */
(function () {
  if (customElements.get("mfk-page-hero")) return;

  const STYLES = `
    :host { display: block; }
    .hero {
      position: relative;
      overflow: hidden;
      isolation: isolate;
      background: linear-gradient(145deg, var(--mfk-coral-soft, #fff0e6) 0%, var(--mfk-white, #fff) 52%, #fff8f2 100%);
      border: 1px solid var(--mfk-border-warm, #fcd9b8);
      border-radius: var(--mfk-radius-xl, 28px);
      padding: 2.25rem 1.5rem;
      box-shadow:
        var(--mfk-shadow-md, 0 8px 24px rgba(30,41,59,0.1)),
        0 1px 0 rgba(255,255,255,0.85) inset;
    }
    @media (min-width: 700px) {
      .hero { padding: 3.25rem 2.75rem; }
    }
    /* Decorative soft orbs — CSS radial gradients only */
    .orb {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
    }
    .orb-a {
      width: 220px; height: 220px;
      top: -60px; right: -40px;
      background: radial-gradient(circle, rgba(255,125,38,0.22) 0%, rgba(255,125,38,0) 70%);
    }
    .orb-b {
      width: 160px; height: 160px;
      bottom: -50px; left: 8%;
      background: radial-gradient(circle, rgba(255,154,85,0.2) 0%, rgba(255,154,85,0) 70%);
    }
    .orb-c {
      width: 100px; height: 100px;
      top: 40%; right: 18%;
      background: radial-gradient(circle, rgba(252,217,184,0.45) 0%, transparent 70%);
    }
    .inner {
      position: relative;
      z-index: 1;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(252, 217, 184, 0.9);
      color: var(--mfk-coral-dark, #e8661a);
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(255,125,38,0.08);
    }
    h1 {
      font-family: var(--mfk-font-display, Fredoka, system-ui, sans-serif);
      font-size: clamp(2rem, 5vw, 3.15rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      margin: 0 0 0.85rem;
      color: var(--mfk-slate, #1e293b);
      line-height: 1.15;
      position: relative;
      display: inline-block;
      max-width: 100%;
    }
    /* Coral accent underline bar */
    h1::after {
      content: "";
      display: block;
      width: min(4.5rem, 40%);
      height: 4px;
      margin-top: 0.55rem;
      border-radius: 9999px;
      background: linear-gradient(90deg, var(--mfk-coral, #ff7d26), var(--mfk-coral-light, #ff9a55));
      box-shadow: 0 2px 8px rgba(255,125,38,0.35);
    }
    .sub {
      margin: 0;
      font-size: clamp(1.05rem, 2vw, 1.15rem);
      color: var(--mfk-slate-soft, #64748b);
      max-width: 38rem;
      line-height: 1.6;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.85rem;
      margin-top: 1.75rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.98rem;
      padding: 0.8rem 1.4rem;
      border-radius: 9999px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .btn:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
    .primary {
      background: linear-gradient(135deg, var(--mfk-coral, #ff7d26) 0%, var(--mfk-coral-dark, #e8661a) 100%);
      color: #fff;
      box-shadow:
        0 6px 20px rgba(255,125,38,0.4),
        0 0 0 1px rgba(255,255,255,0.15) inset;
    }
    .primary:hover {
      transform: translateY(-2px);
      box-shadow:
        0 10px 28px rgba(255,125,38,0.48),
        0 0 0 1px rgba(255,255,255,0.2) inset;
    }
    .secondary {
      background: rgba(255, 255, 255, 0.55);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      color: var(--mfk-slate, #1e293b);
      border-color: rgba(226, 232, 240, 0.95);
    }
    .secondary:hover {
      border-color: var(--mfk-coral, #ff7d26);
      color: var(--mfk-coral-dark, #e8661a);
      background: rgba(255, 255, 255, 0.9);
      transform: translateY(-1px);
    }
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
          <span class="orb orb-a" aria-hidden="true"></span>
          <span class="orb orb-b" aria-hidden="true"></span>
          <span class="orb orb-c" aria-hidden="true"></span>
          <div class="inner">
            ${badge ? `<span class="badge">${badge}</span>` : '<slot name="badge"></slot>'}
            <h1>${title}</h1>
            ${subtitle ? `<p class="sub">${subtitle}</p>` : ""}
            <div class="actions">
              ${actions}
              <slot name="actions"></slot>
            </div>
          </div>
        </section>
      `;
    }
  }

  customElements.define("mfk-page-hero", MfkPageHero);
  window.MFK = window.MFK || {};
  window.MFK.PageHero = MfkPageHero;
})();
