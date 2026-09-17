/**
 * <mfk-skill-badge skill="Typing" variant="typing|math|reading|science|default">
 */
(function () {
  if (customElements.get("mfk-skill-badge")) return;

  const COLORS = {
    typing: { bg: "#fff0e6", fg: "#e8661a" },
    math: { bg: "#f3e8ff", fg: "#7c3aed" },
    reading: { bg: "#cffafe", fg: "#0891b2" },
    science: { bg: "#d1fae5", fg: "#059669" },
    default: { bg: "#f1f5f9", fg: "#475569" },
  };

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
  `;

  class MfkSkillBadge extends HTMLElement {
    static get observedAttributes() {
      return ["skill", "variant"];
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
      const skill = this.getAttribute("skill") || this.textContent.trim() || "Skill";
      const variant = (this.getAttribute("variant") || "default").toLowerCase();
      const c = COLORS[variant] || COLORS.default;

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <span class="badge" style="background:${c.bg};color:${c.fg}">${skill}</span>
      `;
    }
  }

  customElements.define("mfk-skill-badge", MfkSkillBadge);
  window.MFK = window.MFK || {};
  window.MFK.SkillBadge = MfkSkillBadge;
})();
