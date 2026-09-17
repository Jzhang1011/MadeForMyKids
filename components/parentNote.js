/**
 * <mfk-parent-note title="For parents">
 *   Body via attribute body= or default slot / text content
 * </mfk-parent-note>
 */
(function () {
  if (customElements.get("mfk-parent-note")) return;

  const STYLES = `
    :host { display: block; }
    aside {
      background: linear-gradient(135deg, #f8fafc 0%, var(--mfk-coral-soft, #fff0e6) 100%);
      border: 1px solid var(--mfk-border-warm, #fcd9b8);
      border-left: 4px solid var(--mfk-coral, #ff7d26);
      border-radius: var(--mfk-radius, 12px);
      padding: 1.15rem 1.35rem;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--mfk-coral-dark, #e8661a);
      margin-bottom: 0.4rem;
    }
    h3 {
      margin: 0 0 0.45rem;
      font-family: var(--mfk-font-display, Fredoka, system-ui, sans-serif);
      font-size: 1.1rem;
      color: var(--mfk-slate, #1e293b);
    }
    .body {
      margin: 0;
      font-size: 0.95rem;
      color: var(--mfk-slate-mid, #334155);
      line-height: 1.55;
    }
  `;

  class MfkParentNote extends HTMLElement {
    static get observedAttributes() {
      return ["title", "body"];
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
      const title = this.getAttribute("title") || "For parents";
      const body = this.getAttribute("body");

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <aside>
          <div class="eyebrow">👨‍👩‍👧 Parent note</div>
          <h3>${title}</h3>
          ${body ? `<p class="body">${body}</p>` : `<div class="body"><slot></slot></div>`}
        </aside>
      `;
    }
  }

  customElements.define("mfk-parent-note", MfkParentNote);
  window.MFK = window.MFK || {};
  window.MFK.ParentNote = MfkParentNote;
})();
