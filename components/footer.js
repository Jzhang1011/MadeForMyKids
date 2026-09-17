/**
 * <mfk-footer> — site footer with mission + disclaimer
 * Attributes: brand
 */
(function () {
  if (customElements.get("mfk-footer")) return;

  const STYLES = `
    :host { display: block; margin-top: auto; }
    footer {
      background: var(--mfk-slate, #1e293b);
      color: #e2e8f0;
      padding: 2.5rem 0 1.5rem;
      margin-top: 3rem;
    }
    .inner {
      max-width: var(--mfk-max, 1100px);
      margin: 0 auto;
      padding: 0 1.25rem;
    }
    .grid {
      display: grid;
      gap: 1.75rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 700px) {
      .grid { grid-template-columns: 2fr 1fr 1fr; }
    }
    .brand {
      font-family: var(--mfk-font-display, Fredoka, system-ui, sans-serif);
      font-size: 1.15rem;
      font-weight: 600;
      color: #fff;
      margin: 0 0 0.5rem;
    }
    .mission {
      margin: 0;
      color: #cbd5e1;
      font-size: 0.95rem;
      max-width: 28rem;
    }
    h3 {
      margin: 0 0 0.65rem;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--mfk-coral-light, #ff9a55);
    }
    ul { list-style: none; margin: 0; padding: 0; }
    li { margin-bottom: 0.4rem; }
    a {
      color: #e2e8f0;
      text-decoration: none;
      font-size: 0.95rem;
    }
    a:hover { color: var(--mfk-coral-light, #ff9a55); }
    a:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; border-radius: 4px; }
    .bottom {
      margin-top: 2rem;
      padding-top: 1.25rem;
      border-top: 1px solid #334155;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .disclaimer {
      margin: 0;
      font-size: 0.8rem;
      color: #94a3b8;
      max-width: 48rem;
    }
    .copy {
      margin: 0;
      font-size: 0.8rem;
      color: #94a3b8;
    }
  `;

  class MfkFooter extends HTMLElement {
    static get observedAttributes() {
      return ["brand"];
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

    get brand() {
      return this.getAttribute("brand") || "MadeForMyKids";
    }

    render() {
      const year = new Date().getFullYear();
      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <footer>
          <div class="inner">
            <div class="grid">
              <div>
                <p class="brand">${this.brand}</p>
                <p class="mission">Helping kids thrive in the subjects they need — practice that builds confidence, curiosity, and real skill. Built for our family, and shared with families who want the same.</p>
              </div>
              <div>
                <h3>Explore</h3>
                <ul>
                  <li><a href="/">Home</a></li>
                  <li><a href="/typing.html">Typing Adventure</a></li>
                  <li><a href="/amc/">Olympiad Forge (AMC)</a></li>
                </ul>
              </div>
              <div>
                <h3>For families</h3>
                <ul>
                  <li><a href="/#practice-together">Practice together</a></li>
                  <li><a href="/#coming-soon">Coming soon</a></li>
                </ul>
              </div>
            </div>
            <div class="bottom">
              <p class="disclaimer">Education disclaimer: ${this.brand} provides practice tools and learning activities for personal and family use. It is not affiliated with the Mathematical Association of America or any school district. Content is offered as educational support, not as a substitute for classroom instruction or professional tutoring.</p>
              <p class="copy">© ${year} ${this.brand}. Made with care for growing minds.</p>
            </div>
          </div>
        </footer>
      `;
    }
  }

  customElements.define("mfk-footer", MfkFooter);
  window.MFK = window.MFK || {};
  window.MFK.Footer = MfkFooter;
})();
