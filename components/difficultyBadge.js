/**
 * <mfk-difficulty-badge level="beginner|intermediate|advanced|challenge" ages="optional">
 *
 * Site-wide difficulty vocabulary (do not use Easy/Medium/Hard as primary labels).
 * Helpers: MFK.difficulty.normalize(level), MFK.difficulty.label(level), MFK.difficulty.meta(level)
 */
(function () {
  if (customElements.get("mfk-difficulty-badge")) return;

  const ALIASES = {
    beginner: "beginner",
    beg: "beginner",
    easy: "beginner", // legacy alias → Beginner
    intermediate: "intermediate",
    inter: "intermediate",
    medium: "intermediate", // legacy alias → Intermediate
    mid: "intermediate",
    advanced: "advanced",
    adv: "advanced",
    hard: "advanced", // legacy alias → Advanced
    challenge: "challenge",
    challenger: "challenge",
    expert: "challenge",
  };

  const MAP = {
    beginner: {
      id: "beginner",
      label: "Beginner",
      icon: "🌱",
      bg: "var(--mfk-beginner-bg, #dcfce7)",
      fg: "var(--mfk-beginner, #15803d)",
    },
    intermediate: {
      id: "intermediate",
      label: "Intermediate",
      icon: "🌿",
      bg: "var(--mfk-intermediate-bg, #fef9c3)",
      fg: "var(--mfk-intermediate, #a16207)",
    },
    advanced: {
      id: "advanced",
      label: "Advanced",
      icon: "🔥",
      bg: "var(--mfk-advanced-bg, #ffedd5)",
      fg: "var(--mfk-advanced, #c2410c)",
    },
    challenge: {
      id: "challenge",
      label: "Challenge",
      icon: "⚡",
      bg: "var(--mfk-challenge-bg, #fee2e2)",
      fg: "var(--mfk-challenge, #b91c1c)",
    },
  };

  function normalize(level) {
    const key = String(level || "")
      .trim()
      .toLowerCase();
    return ALIASES[key] || (MAP[key] ? key : "intermediate");
  }

  function meta(level) {
    return MAP[normalize(level)] || MAP.intermediate;
  }

  function label(level) {
    return meta(level).label;
  }

  const STYLES = `
    :host { display: inline-block; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
    }
    .icon { font-size: 0.85em; line-height: 1; }
    .ages {
      font-weight: 500;
      opacity: 0.85;
    }
  `;

  class MfkDifficultyBadge extends HTMLElement {
    static get observedAttributes() {
      return ["level", "ages"];
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
      const m = meta(this.getAttribute("level") || "intermediate");
      const ages = this.getAttribute("ages") || "";

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <span class="badge" style="background:${m.bg};color:${m.fg}" aria-label="Difficulty: ${m.label}${ages ? `, ${ages}` : ""}">
          <span class="icon" aria-hidden="true">${m.icon}</span>
          <span>${m.label}</span>${ages ? `<span class="ages">· ${ages}</span>` : ""}
        </span>
      `;
    }
  }

  customElements.define("mfk-difficulty-badge", MfkDifficultyBadge);
  window.MFK = window.MFK || {};
  window.MFK.DifficultyBadge = MfkDifficultyBadge;
  window.MFK.difficulty = { normalize, label, meta, MAP, ALIASES };
})();
