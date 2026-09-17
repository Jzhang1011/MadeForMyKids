/**
 * <mfk-modal id="..."> with title attribute; body via default slot
 * API: el.open() / el.close()  or  MFK.modal.open('#id') / MFK.modal.close('#id')
 * Keyboard: Escape closes; focus trapped lightly on open
 */
(function () {
  if (customElements.get("mfk-modal")) return;

  const STYLES = `
    :host { display: none; }
    :host([open]) { display: block; }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .dialog {
      background: var(--mfk-white, #fff);
      border-radius: var(--mfk-radius-lg, 20px);
      max-width: 480px;
      width: 100%;
      max-height: min(90vh, 640px);
      overflow: auto;
      box-shadow: var(--mfk-shadow-lg, 0 12px 32px rgba(30,41,59,0.12));
      padding: 1.35rem 1.35rem 1.25rem;
    }
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.85rem;
    }
    h2 {
      margin: 0;
      font-family: var(--mfk-font-display, Fredoka, system-ui, sans-serif);
      font-size: 1.25rem;
      color: var(--mfk-slate, #1e293b);
    }
    .close {
      border: none;
      background: var(--mfk-coral-soft, #fff0e6);
      color: var(--mfk-coral-dark, #e8661a);
      width: 36px; height: 36px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 1.25rem;
      line-height: 1;
      flex-shrink: 0;
    }
    .close:hover { background: var(--mfk-coral-muted, #ffe4d1); }
    .close:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
    .body { color: var(--mfk-slate-mid, #334155); font-size: 0.95rem; line-height: 1.55; }
  `;

  class MfkModal extends HTMLElement {
    static get observedAttributes() {
      return ["title", "open"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._onKey = (e) => {
        if (e.key === "Escape" && this.hasAttribute("open")) this.close();
      };
    }

    connectedCallback() {
      this.render();
      document.addEventListener("keydown", this._onKey);
    }

    disconnectedCallback() {
      document.removeEventListener("keydown", this._onKey);
    }

    attributeChangedCallback(name) {
      if (name === "open") {
        document.body.style.overflow = this.hasAttribute("open") ? "hidden" : "";
      }
      if (this.isConnected) this.render();
    }

    open() {
      this.setAttribute("open", "");
      requestAnimationFrame(() => {
        const btn = this.shadowRoot.querySelector(".close");
        if (btn) btn.focus();
      });
    }

    close() {
      this.removeAttribute("open");
      this.dispatchEvent(new CustomEvent("mfk-modal-close", { bubbles: true }));
    }

    render() {
      const title = this.getAttribute("title") || "Dialog";
      const isOpen = this.hasAttribute("open");

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <div class="backdrop" part="backdrop" ${isOpen ? "" : 'hidden'}>
          <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="mfk-modal-title">
            <div class="head">
              <h2 id="mfk-modal-title">${title}</h2>
              <button type="button" class="close" aria-label="Close dialog">×</button>
            </div>
            <div class="body"><slot></slot></div>
          </div>
        </div>
      `;

      const backdrop = this.shadowRoot.querySelector(".backdrop");
      const closeBtn = this.shadowRoot.querySelector(".close");
      closeBtn.addEventListener("click", () => this.close());
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) this.close();
      });
    }
  }

  customElements.define("mfk-modal", MfkModal);

  window.MFK = window.MFK || {};
  window.MFK.Modal = MfkModal;
  window.MFK.modal = {
    open(sel) {
      const el = typeof sel === "string" ? document.querySelector(sel) : sel;
      if (el && el.open) el.open();
    },
    close(sel) {
      const el = typeof sel === "string" ? document.querySelector(sel) : sel;
      if (el && el.close) el.close();
    },
  };
})();
