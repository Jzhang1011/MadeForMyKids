/**
 * <mfk-activity-card>
 * Attributes: icon, title, blurb, href, tags (comma-separated)
 */
(function () {
  if (customElements.get("mfk-activity-card")) return;

  const STYLES = `
    :host { display: block; height: 100%; }
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
    .icon {
      width: 48px; height: 48px;
      border-radius: 14px;
      background: var(--mfk-coral-soft, #fff0e6);
      display: grid; place-items: center;
      font-size: 1.5rem;
      margin-bottom: 0.85rem;
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
    .go {
      margin-top: 1rem;
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--mfk-coral, #ff7d26);
    }
  `;

  class MfkActivityCard extends HTMLElement {
    static get observedAttributes() {
      return ["icon", "title", "blurb", "href", "tags"];
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
      const icon = this.getAttribute("icon") || "✨";
      const title = this.getAttribute("title") || "Activity";
      const blurb = this.getAttribute("blurb") || "";
      const href = this.getAttribute("href") || "#";
      const tags = (this.getAttribute("tags") || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <a class="card" href="${href}">
          <div class="icon" aria-hidden="true">${icon}</div>
          <h3>${title}</h3>
          ${blurb ? `<p class="blurb">${blurb}</p>` : ""}
          ${
            tags.length
              ? `<div class="tags">${tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>`
              : ""
          }
          <span class="go">Open activity →</span>
        </a>
      `;
    }
  }

  customElements.define("mfk-activity-card", MfkActivityCard);
  window.MFK = window.MFK || {};
  window.MFK.ActivityCard = MfkActivityCard;
})();
