/**
 * <mfk-progress-bar value="0-100" label="..." show-percent>
 */
(function () {
  if (customElements.get("mfk-progress-bar")) return;

  const STYLES = `
    :host { display: block; }
    .wrap { width: 100%; }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.4rem;
      gap: 0.75rem;
    }
    .label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--mfk-slate, #1e293b);
    }
    .pct {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--mfk-coral-dark, #e8661a);
    }
    .track {
      height: 10px;
      background: var(--mfk-coral-muted, #ffe4d1);
      border-radius: 9999px;
      overflow: hidden;
    }
    .fill {
      height: 100%;
      background: linear-gradient(90deg, var(--mfk-coral, #ff7d26), var(--mfk-coral-light, #ff9a55));
      border-radius: 9999px;
      transition: width 0.35s ease;
    }
  `;

  class MfkProgressBar extends HTMLElement {
    static get observedAttributes() {
      return ["value", "label", "show-percent"];
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

    get value() {
      return Math.max(0, Math.min(100, Number(this.getAttribute("value")) || 0));
    }

    set value(v) {
      this.setAttribute("value", String(v));
    }

    render() {
      const v = this.value;
      const label = this.getAttribute("label") || "Progress";
      const showPct = this.hasAttribute("show-percent");

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <div class="wrap">
          <div class="row">
            <span class="label" id="lbl">${label}</span>
            ${showPct ? `<span class="pct">${v}%</span>` : ""}
          </div>
          <div class="track" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100" aria-labelledby="lbl">
            <div class="fill" style="width:${v}%"></div>
          </div>
        </div>
      `;
    }
  }

  customElements.define("mfk-progress-bar", MfkProgressBar);
  window.MFK = window.MFK || {};
  window.MFK.ProgressBar = MfkProgressBar;
})();
