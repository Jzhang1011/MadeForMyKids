/**
 * <mfk-related-activities title="More to try">
 * Prefer light-DOM children:
 *   <mfk-related-activities>
 *     <mfk-activity-card ...></mfk-activity-card>
 *   </mfk-related-activities>
 * Or data-items JSON (creates activity cards once on connect).
 */
(function () {
  if (customElements.get("mfk-related-activities")) return;

  const STYLES = `
    :host { display: block; }
    h2 {
      font-family: var(--mfk-font-display, Fredoka, system-ui, sans-serif);
      font-size: 1.35rem;
      margin: 0 0 1rem;
      color: var(--mfk-slate, #1e293b);
    }
    .grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 640px) {
      .grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (min-width: 900px) {
      .grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
    }
    ::slotted(mfk-activity-card) { display: block; height: 100%; }
  `;

  class MfkRelatedActivities extends HTMLElement {
    static get observedAttributes() {
      return ["title", "columns"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._builtFromData = false;
    }

    connectedCallback() {
      this._buildFromDataOnce();
      this.render();
    }

    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }

    _buildFromDataOnce() {
      if (this._builtFromData) return;
      const raw = this.getAttribute("data-items") || this.dataset.items;
      if (!raw) return;
      let items = [];
      try {
        items = JSON.parse(raw);
      } catch (_) {
        return;
      }
      if (!Array.isArray(items) || !items.length) return;
      // Only seed if host has no activity cards yet
      if (this.querySelector("mfk-activity-card")) {
        this._builtFromData = true;
        return;
      }
      items.forEach((item) => {
        const card = document.createElement("mfk-activity-card");
        if (item.icon) card.setAttribute("icon", item.icon);
        if (item.title) card.setAttribute("title", item.title);
        if (item.blurb) card.setAttribute("blurb", item.blurb);
        if (item.href) card.setAttribute("href", item.href);
        if (item.tags) {
          card.setAttribute(
            "tags",
            Array.isArray(item.tags) ? item.tags.join(",") : item.tags
          );
        }
        this.appendChild(card);
      });
      this._builtFromData = true;
    }

    render() {
      const title = this.getAttribute("title") || "Related activities";
      const cols = this.getAttribute("columns") === "3" ? "cols-3" : "";

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <section>
          <h2>${title}</h2>
          <div class="grid ${cols}"><slot></slot></div>
        </section>
      `;
    }
  }

  customElements.define("mfk-related-activities", MfkRelatedActivities);
  window.MFK = window.MFK || {};
  window.MFK.RelatedActivities = MfkRelatedActivities;
})();
