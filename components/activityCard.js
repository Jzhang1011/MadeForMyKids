/**
 * <mfk-activity-card>
 * Attributes:
 *   icon (optional override), skill, title, blurb, difficulty, duration, href, cta-label
 * Legacy: tags (comma-separated) — shown as soft tags when skill/difficulty absent
 */
(function () {
  if (customElements.get("mfk-activity-card")) return;

  const SKILL = {
    typing: { label: "Typing", icon: "⌨️", bg: "#fff0e6", fg: "#e8661a" },
    mac: { label: "Mac", icon: "💻", bg: "#fce7f3", fg: "#be185d" },
    math: { label: "Math", icon: "🧮", bg: "#f3e8ff", fg: "#7c3aed" },
    stem: { label: "STEM", icon: "🔬", bg: "#d1fae5", fg: "#059669" },
    writing: { label: "Writing", icon: "✍️", bg: "#fff7ed", fg: "#ea580c" },
    movie: { label: "Movie", icon: "🎬", bg: "#e0f2fe", fg: "#0284c7" },
  };
  const SKILL_ALIASES = {
    typing: "typing",
    type: "typing",
    keyboard: "typing",
    mac: "mac",
    macos: "mac",
    math: "math",
    maths: "math",
    amc: "math",
    stem: "stem",
    science: "stem",
    writing: "writing",
    write: "writing",
    movie: "movie",
    film: "movie",
    media: "movie",
  };

  const DIFF = {
    beginner: { label: "Beginner", icon: "🌱", bg: "#dcfce7", fg: "#15803d" },
    intermediate: { label: "Intermediate", icon: "🌿", bg: "#fef9c3", fg: "#a16207" },
    advanced: { label: "Advanced", icon: "🔥", bg: "#ffedd5", fg: "#c2410c" },
    challenge: { label: "Challenge", icon: "⚡", bg: "#fee2e2", fg: "#b91c1c" },
  };
  const DIFF_ALIASES = {
    beginner: "beginner",
    easy: "beginner",
    intermediate: "intermediate",
    medium: "intermediate",
    advanced: "advanced",
    hard: "advanced",
    challenge: "challenge",
  };

  function skillMeta(raw) {
    if (window.MFK && window.MFK.skill && window.MFK.skill.meta) {
      const m = window.MFK.skill.meta(raw);
      if (m) return m;
    }
    const id = SKILL_ALIASES[String(raw || "").trim().toLowerCase()];
    return id ? SKILL[id] : null;
  }

  function diffMeta(raw) {
    if (window.MFK && window.MFK.difficulty && window.MFK.difficulty.meta) {
      return window.MFK.difficulty.meta(raw);
    }
    const id =
      DIFF_ALIASES[String(raw || "").trim().toLowerCase()] || "intermediate";
    return DIFF[id] || DIFF.intermediate;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const STYLES = `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      position: relative;
      z-index: 0;
    }
    a.card {
      display: flex;
      flex-direction: column;
      height: 100%;
      text-decoration: none;
      color: inherit;
      background: var(--mfk-white, #fff);
      border: 1px solid var(--mfk-border, #e2e8f0);
      border-radius: var(--mfk-radius, 12px);
      padding: 1.35rem;
      box-shadow: var(--mfk-shadow, 0 4px 14px rgba(30,41,59,0.08));
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }
    a.card:hover {
      transform: translateY(-3px);
      box-shadow: var(--mfk-shadow-lg, 0 12px 32px rgba(30,41,59,0.12));
      border-color: var(--mfk-border-warm, #fcd9b8);
    }
    a.card:focus-visible {
      outline: 3px solid var(--mfk-coral, #ff7d26);
      outline-offset: 3px;
    }
    .top {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .icon {
      width: 40px; height: 40px;
      border-radius: 12px;
      background: var(--mfk-coral-soft, #fff0e6);
      display: grid; place-items: center;
      font-size: 1.25rem;
      flex-shrink: 0;
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
    h3 {
      font-family: var(--mfk-font-display, Fredoka, system-ui, sans-serif);
      font-size: 1.2rem;
      font-weight: 600;
      margin: 0 0 0.45rem;
      color: var(--mfk-slate, #1e293b);
    }
    .blurb {
      margin: 0;
      flex: 1;
      font-size: 0.95rem;
      color: var(--mfk-slate-soft, #64748b);
      line-height: 1.5;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .duration {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--mfk-slate-soft, #64748b);
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-top: 1rem;
    }
    .tag {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--mfk-coral-dark, #e8661a);
      background: var(--mfk-coral-soft, #fff0e6);
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
    }
    .cta {
      margin-top: 1rem;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--mfk-coral, #ff7d26);
    }
  `;

  class MfkActivityCard extends HTMLElement {
    static get observedAttributes() {
      return [
        "icon",
        "skill",
        "title",
        "blurb",
        "difficulty",
        "duration",
        "href",
        "cta-label",
        "tags",
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
      const title = this.getAttribute("title") || "Activity";
      const blurb = this.getAttribute("blurb") || "";
      const href = this.getAttribute("href") || "#";
      const duration = this.getAttribute("duration") || "";
      const cta = this.getAttribute("cta-label") || "Start";
      const skillRaw = this.getAttribute("skill") || "";
      const diffRaw = this.getAttribute("difficulty") || "";
      const sm = skillRaw ? skillMeta(skillRaw) : null;
      const dm = diffRaw ? diffMeta(diffRaw) : null;
      const iconOverride = this.getAttribute("icon");
      const icon = iconOverride || (sm && sm.icon) || "✨";
      const tags = (this.getAttribute("tags") || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const useLegacyTags = tags.length && !sm && !dm;

      let topHtml = "";
      if (sm) {
        topHtml = `<span class="pill" style="background:${sm.bg};color:${sm.fg}" aria-label="Skill: ${esc(sm.label)}"><span aria-hidden="true">${esc(icon)}</span> ${esc(sm.label)}</span>`;
      } else if (iconOverride) {
        topHtml = `<div class="icon" aria-hidden="true">${icon}</div>`;
      }

      let metaHtml = "";
      if (dm || duration) {
        const parts = [];
        if (dm) {
          parts.push(
            `<span class="pill" style="background:${dm.bg};color:${dm.fg}" aria-label="Difficulty: ${esc(dm.label)}"><span aria-hidden="true">${dm.icon}</span> ${esc(dm.label)}</span>`
          );
        }
        if (duration) {
          parts.push(`<span class="duration">${esc(duration)}</span>`);
        }
        metaHtml = `<div class="meta-row">${parts.join("")}</div>`;
      }

      const tagsHtml = useLegacyTags
        ? `<div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>`
        : "";

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <a class="card" href="${esc(href)}">
          ${topHtml ? `<div class="top">${topHtml}</div>` : `<div class="icon" aria-hidden="true">${icon}</div>`}
          <h3>${esc(title)}</h3>
          ${blurb ? `<p class="blurb">${esc(blurb)}</p>` : ""}
          ${metaHtml}
          ${tagsHtml}
          <span class="cta">${esc(cta)} <span aria-hidden="true">→</span></span>
        </a>
      `;
    }
  }

  customElements.define("mfk-activity-card", MfkActivityCard);
  window.MFK = window.MFK || {};
  window.MFK.ActivityCard = MfkActivityCard;
})();
