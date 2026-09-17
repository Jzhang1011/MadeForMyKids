/**
 * <mfk-difficulty-badge level="Easy|Medium|Hard" ages="optional ages text">
 */
(function () {
  if (customElements.get("mfk-difficulty-badge")) return;

  const MAP = {
    easy: { bg: "#dcfce7", fg: "#15803d", label: "Easy" },
    medium: { bg: "#fef9c3", fg: "#a16207", label: "Medium" },
    hard: { bg: "#fee2e2", fg: "#b91c1c", label: "Hard" },
  };

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
      const level = (this.getAttribute("level") || "medium").toLowerCase();
      const ages = this.getAttribute("ages") || "";
      const m = MAP[level] || MAP.medium;

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <span class="badge" style="background:${m.bg};color:${m.fg}">
          ${m.label}${ages ? `<span class="ages">· ${ages}</span>` : ""}
        </span>
      `;
    }
  }

  customElements.define("mfk-difficulty-badge", MfkDifficultyBadge);
  window.MFK = window.MFK || {};
  window.MFK.DifficultyBadge = MfkDifficultyBadge;
})();
