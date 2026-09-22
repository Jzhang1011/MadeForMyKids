/**
 * <mfk-lesson-card>
 * Attributes: icon?, skill, title, blurb, duration, href, cta-label (default "Learn"), progress? (0-100)
 */
(function () {
  if (customElements.get("mfk-lesson-card")) return;

  const SKILL = {
    typing: { label: "Typing", icon: "⌨️", bg: "#fff0e6", fg: "#e8661a" },
    mac: { label: "Mac", icon: "💻", bg: "#fce7f3", fg: "#be185d" },
    math: { label: "Math", icon: "🧮", bg: "#f3e8ff", fg: "#7c3aed" },
    stem: { label: "STEM", icon: "🔬", bg: "#d1fae5", fg: "#059669" },
  };
  const SKILL_ALIASES = {
    typing: "typing",
    type: "typing",
    mac: "mac",
    macos: "mac",
    math: "math",
    maths: "math",
    amc: "math",
    stem: "stem",
    science: "stem",
  };

  function skillMeta(raw) {
    if (window.MFK && window.MFK.skill && window.MFK.skill.meta) {
      const m = window.MFK.skill.meta(raw);
      if (m) return m;
    }
    const id = SKILL_ALIASES[String(raw || "").trim().toLowerCase()];
    return id ? SKILL[id] : null;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const STYLES = `
    :host { display: block; }
    a.card {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      text-decoration: none;
      color: inherit;
      background: var(--mfk-white, #fff);
      border: 1px solid var(--mfk-border, #e2e8f0);
      border-radius: var(--mfk-radius, 12px);
      padding: 1.1rem 1.2rem;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    a.card:hover {
      border-color: var(--mfk-border-warm, #fcd9b8);
      box-shadow: var(--mfk-shadow, 0 4px 14px rgba(30,41,59,0.08));
    }
    a.card:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
    .top {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
    }
    .icon-dot {
      width: 32px; height: 32px;
      border-radius: 10px;
      background: var(--mfk-coral-soft, #fff0e6);
      display: grid; place-items: center;
      font-size: 1rem;
    }
    h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--mfk-slate, #1e293b);
      font-family: var(--mfk-font-display, Fredoka, system-ui, sans-serif);
    }
    .blurb {
      margin: 0;
      font-size: 0.9rem;
      color: var(--mfk-slate-soft, #64748b);
      line-height: 1.45;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-top: 0.15rem;
    }
    .duration {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--mfk-slate-soft, #64748b);
    }
    .cta {
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--mfk-coral, #ff7d26);
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .progress-wrap {
      height: 6px;
      background: var(--mfk-coral-muted, #ffe4d1);
      border-radius: 9999px;
      overflow: hidden;
      margin-top: 0.25rem;
    }
    .progress-bar {
      height: 100%;
      background: var(--mfk-coral, #ff7d26);
      border-radius: 9999px;
      transition: width 0.3s ease;
    }
    .progress-label {
      font-size: 0.75rem;
      color: var(--mfk-slate-soft, #64748b);
      font-weight: 600;
    }
  `;

  class MfkLessonCard extends HTMLElement {
    static get observedAttributes() {
      return [
        "icon",
        "skill",
        "title",
        "blurb",
        "duration",
        "href",
        "cta-label",
        "progress",
      ];
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
      const blurb = this.getAttribute("blurb") || "";
      const duration = this.getAttribute("duration") || "";
      const skillRaw = this.getAttribute("skill") || "";
      const href = this.getAttribute("href") || "#";
      const cta = this.getAttribute("cta-label") || "Learn";
      const iconOverride = this.getAttribute("icon");
      const sm = skillRaw ? skillMeta(skillRaw) : null;
      const progressRaw = this.getAttribute("progress");
      const progress =
        progressRaw !== null && progressRaw !== ""
          ? Math.max(0, Math.min(100, Number(progressRaw) || 0))
          : null;

      let topHtml = "";
      if (sm) {
        const icon = iconOverride || sm.icon;
        topHtml = `<span class="pill" style="background:${sm.bg};color:${sm.fg}" aria-label="Skill: ${esc(sm.label)}"><span aria-hidden="true">${icon}</span> ${esc(sm.label)}</span>`;
      } else if (iconOverride) {
        topHtml = `<span class="icon-dot" aria-hidden="true">${iconOverride}</span>`;
      }

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <a class="card" href="${esc(href)}">
          ${topHtml ? `<div class="top">${topHtml}</div>` : ""}
          <h3>${esc(title)}</h3>
          ${blurb ? `<p class="blurb">${esc(blurb)}</p>` : ""}
          <div class="row">
            ${duration ? `<span class="duration">${esc(duration)}</span>` : `<span></span>`}
            <span class="cta">${esc(cta)} <span aria-hidden="true">→</span></span>
          </div>
          ${
            progress !== null
              ? `<div class="progress-label">${progress}% done</div>
                 <div class="progress-wrap" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Lesson progress">
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
