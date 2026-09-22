/**
 * <mfk-parent-note>
 * Attributes: title, summary, skill, minutes, next, body
 * Body via attribute body= or default slot / text content.
 * summary = short lead under title; skill / minutes / next = meta chips.
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
    .summary {
      margin: 0 0 0.65rem;
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--mfk-slate-mid, #334155);
      line-height: 1.45;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin: 0 0 0.75rem;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      background: var(--mfk-white, #fff);
      border: 1px solid var(--mfk-border-warm, #fcd9b8);
      color: var(--mfk-slate-mid, #334155);
    }
    .chip .label {
      color: var(--mfk-slate-soft, #64748b);
      font-weight: 500;
    }
    .body {
      margin: 0;
      font-size: 0.95rem;
      color: var(--mfk-slate-mid, #334155);
      line-height: 1.55;
    }
    .next {
      margin: 0.75rem 0 0;
      padding-top: 0.65rem;
      border-top: 1px dashed var(--mfk-border-warm, #fcd9b8);
      font-size: 0.9rem;
      color: var(--mfk-slate-mid, #334155);
    }
    .next strong {
      color: var(--mfk-coral-dark, #e8661a);
      font-weight: 600;
    }
  `;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  class MfkParentNote extends HTMLElement {
    static get observedAttributes() {
      return ["title", "body", "summary", "skill", "minutes", "next"];
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
      const summary = this.getAttribute("summary");
      const skill = this.getAttribute("skill");
      const minutes = this.getAttribute("minutes");
      const next = this.getAttribute("next");

      const chips = [];
      if (skill) {
        chips.push(
          `<span class="chip"><span class="label">Skill</span> ${escapeHtml(skill)}</span>`
        );
      }
      if (minutes) {
        chips.push(
          `<span class="chip"><span class="label">~</span> ${escapeHtml(minutes)}</span>`
        );
      }

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <aside>
          <div class="eyebrow">👨‍👩‍👧 Parent note</div>
          <h3>${escapeHtml(title)}</h3>
          ${summary ? `<p class="summary">${escapeHtml(summary)}</p>` : ""}
          ${chips.length ? `<div class="meta">${chips.join("")}</div>` : ""}
          ${body ? `<p class="body">${escapeHtml(body)}</p>` : `<div class="body"><slot></slot></div>`}
          ${
            next
              ? `<p class="next"><strong>Next:</strong> ${escapeHtml(next)}</p>`
              : ""
          }
        </aside>
      `;
    }
  }

  customElements.define("mfk-parent-note", MfkParentNote);
  window.MFK = window.MFK || {};
  window.MFK.ParentNote = MfkParentNote;
})();
