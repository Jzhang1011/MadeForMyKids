/**
 * <mfk-lesson-card>
 * Attributes: title, duration, skill, href, progress (0-100 optional)
 */
(function () {
  if (customElements.get("mfk-lesson-card")) return;

  const STYLES = `
    :host { display: block; }
    a.card {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.75rem 1rem;
      align-items: center;
      text-decoration: none;
      color: inherit;
      background: var(--mfk-white, #fff);
      border: 1px solid var(--mfk-border, #e2e8f0);
      border-radius: var(--mfk-radius, 12px);
      padding: 1rem 1.15rem;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    a.card:hover {
      border-color: var(--mfk-border-warm, #fcd9b8);
      box-shadow: var(--mfk-shadow, 0 4px 14px rgba(30,41,59,0.08));
    }
    a.card:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
    h3 {
      margin: 0 0 0.25rem;
      font-size: 1rem;
      font-weight: 600;
      color: var(--mfk-slate, #1e293b);
      font-family: var(--mfk-font-display, Fredoka, system-ui, sans-serif);
    }
    .meta {
      font-size: 0.8rem;
      color: var(--mfk-slate-soft, #64748b);
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .meta span::before { content: "·"; margin-right: 0.5rem; color: var(--mfk-slate-faint, #94a3b8); }
    .meta span:first-child::before { content: none; margin: 0; }
    .arrow {
      color: var(--mfk-coral, #ff7d26);
      font-weight: 700;
      font-size: 1.1rem;
    }
    .progress-wrap {
      grid-column: 1 / -1;
      height: 6px;
      background: var(--mfk-coral-muted, #ffe4d1);
      border-radius: 9999px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background: var(--mfk-coral, #ff7d26);
      border-radius: 9999px;
      transition: width 0.3s ease;
    }
  `;

  class MfkLessonCard extends HTMLElement {
    static get observedAttributes() {
      return ["title", "duration", "skill", "href", "progress"];
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
      const title = this.getAttribute("title") || "Lesson";
      const duration = this.getAttribute("duration") || "";
      const skill = this.getAttribute("skill") || "";
      const href = this.getAttribute("href") || "#";
      const progressRaw = this.getAttribute("progress");
      const progress =
        progressRaw !== null && progressRaw !== ""
          ? Math.max(0, Math.min(100, Number(progressRaw) || 0))
          : null;

      const metaParts = [];
      if (duration) metaParts.push(`<span>${duration}</span>`);
      if (skill) metaParts.push(`<span>${skill}</span>`);
      if (progress !== null) metaParts.push(`<span>${progress}% done</span>`);

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <a class="card" href="${href}">
          <div>
            <h3>${title}</h3>
            ${metaParts.length ? `<div class="meta">${metaParts.join("")}</div>` : ""}
          </div>
          <span class="arrow" aria-hidden="true">→</span>
          ${
            progress !== null
              ? `<div class="progress-wrap" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Lesson progress">
                  <div class="progress-bar" style="width:${progress}%"></div>
                </div>`
              : ""
          }
        </a>
      `;
    }
  }

  customElements.define("mfk-lesson-card", MfkLessonCard);
  window.MFK = window.MFK || {};
  window.MFK.LessonCard = MfkLessonCard;
})();
