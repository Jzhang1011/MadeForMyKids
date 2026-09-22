/**
 * <mfk-skill-badge skill="typing|mac|math|stem|writing|movie" icon="optional override">
 *
 * Skills: Typing, Mac, Math, STEM, Writing, Movie.
 * Helpers: MFK.skill.normalize(skill), MFK.skill.label(skill), MFK.skill.icon(skill), MFK.skill.meta(skill)
 */
(function () {
  if (customElements.get("mfk-skill-badge")) return;

  const ALIASES = {
    typing: "typing",
    type: "typing",
    keyboard: "typing",
    mac: "mac",
    macos: "mac",
    "mac skills": "mac",
    "mac-skills": "mac",
    apple: "mac",
    math: "math",
    maths: "math",
    amc: "math",
    stem: "stem",
    science: "stem",
    tech: "stem",
    writing: "writing",
    write: "writing",
    writer: "writing",
    movie: "movie",
    movies: "movie",
    film: "movie",
    media: "movie",
    watch: "movie",
  };

  const MAP = {
    typing: {
      id: "typing",
      label: "Typing",
      icon: "⌨️",
      bg: "var(--mfk-skill-typing-bg, #fff0e6)",
      fg: "var(--mfk-skill-typing, #e8661a)",
    },
    mac: {
      id: "mac",
      label: "Mac",
      icon: "💻",
      bg: "var(--mfk-skill-mac-bg, #fce7f3)",
      fg: "var(--mfk-skill-mac, #be185d)",
    },
    math: {
      id: "math",
      label: "Math",
      icon: "🧮",
      bg: "var(--mfk-skill-math-bg, #f3e8ff)",
      fg: "var(--mfk-skill-math, #7c3aed)",
    },
    stem: {
      id: "stem",
      label: "STEM",
      icon: "🔬",
      bg: "var(--mfk-skill-stem-bg, #d1fae5)",
      fg: "var(--mfk-skill-stem, #059669)",
    },
    writing: {
      id: "writing",
      label: "Writing",
      icon: "✍️",
      bg: "var(--mfk-skill-writing-bg, #fff7ed)",
      fg: "var(--mfk-skill-writing, #ea580c)",
    },
    movie: {
      id: "movie",
      label: "Movie",
      icon: "🎬",
      bg: "var(--mfk-skill-movie-bg, #e0f2fe)",
      fg: "var(--mfk-skill-movie, #0284c7)",
    },
  };

  function normalize(skill) {
    const key = String(skill || "")
      .trim()
      .toLowerCase();
    if (ALIASES[key]) return ALIASES[key];
    if (MAP[key]) return key;
    return "typing";
  }

  function meta(skill) {
    return MAP[normalize(skill)] || MAP.typing;
  }

  function label(skill) {
    return meta(skill).label;
  }

  function iconFor(skill) {
    return meta(skill).icon;
  }

  const STYLES = `
    :host { display: inline-block; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      letter-spacing: 0.01em;
    }
    .icon { font-size: 0.95em; line-height: 1; }
  `;

  class MfkSkillBadge extends HTMLElement {
    static get observedAttributes() {
      return ["skill", "icon", "variant"];
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
      const raw =
        this.getAttribute("skill") ||
        this.getAttribute("variant") ||
        this.textContent.trim() ||
        "";
      const m = meta(raw);
      const icon = this.getAttribute("icon") || m.icon;

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <span class="badge" style="background:${m.bg};color:${m.fg}" aria-label="Skill: ${m.label}">
          <span class="icon" aria-hidden="true">${icon}</span>
          <span>${m.label}</span>
        </span>
      `;
    }
  }

  customElements.define("mfk-skill-badge", MfkSkillBadge);
  window.MFK = window.MFK || {};
  window.MFK.SkillBadge = MfkSkillBadge;
  window.MFK.skill = { normalize, label, icon: iconFor, meta, MAP, ALIASES };
})();
