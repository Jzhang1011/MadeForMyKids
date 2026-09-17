/**
 * <mfk-button variant="primary|secondary|ghost" size="sm|md|lg" href optional>
 * Uses light DOM slot for label; if href set, renders as <a>
 */
(function () {
  if (customElements.get("mfk-button")) return;

  const STYLES = `
    :host { display: inline-block; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-family: var(--mfk-font-body, Inter, system-ui, sans-serif);
      font-weight: 600;
      border-radius: 9999px;
      border: 2px solid transparent;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }
    .btn:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .sm { font-size: 0.8rem; padding: 0.4rem 0.85rem; }
    .md { font-size: 0.95rem; padding: 0.65rem 1.2rem; }
    .lg { font-size: 1.05rem; padding: 0.8rem 1.5rem; }
    .primary {
      background: var(--mfk-coral, #ff7d26);
      color: #fff;
      box-shadow: 0 3px 10px rgba(255,125,38,0.3);
    }
    .primary:hover:not(:disabled) { background: var(--mfk-coral-dark, #e8661a); }
    .secondary {
      background: var(--mfk-white, #fff);
      color: var(--mfk-slate, #1e293b);
      border-color: var(--mfk-border, #e2e8f0);
    }
    .secondary:hover:not(:disabled) {
      border-color: var(--mfk-coral, #ff7d26);
      color: var(--mfk-coral-dark, #e8661a);
    }
    .ghost {
      background: transparent;
      color: var(--mfk-coral-dark, #e8661a);
    }
    .ghost:hover:not(:disabled) { background: var(--mfk-coral-soft, #fff0e6); }
  `;

  class MfkButton extends HTMLElement {
    static get observedAttributes() {
      return ["variant", "size", "href", "disabled", "type"];
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
      const variant = this.getAttribute("variant") || "primary";
      const size = this.getAttribute("size") || "md";
      const href = this.getAttribute("href");
      const disabled = this.hasAttribute("disabled");
      const type = this.getAttribute("type") || "button";
      const cls = `btn ${variant} ${size}`;

      if (href && !disabled) {
        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <a class="${cls}" href="${href}"><slot></slot></a>
        `;
      } else {
        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <button class="${cls}" type="${type}" ${disabled ? "disabled" : ""}><slot></slot></button>
        `;
      }
    }
  }

  customElements.define("mfk-button", MfkButton);
  window.MFK = window.MFK || {};
  window.MFK.Button = MfkButton;
})();
