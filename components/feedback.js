/**
 * <mfk-feedback storage-key="mfk-feedback-home" prompt="...">
 * Thumbs + optional short comment; stores in localStorage
 */
(function () {
  if (customElements.get("mfk-feedback")) return;

  const STYLES = `
    :host { display: block; }
    .box {
      background: var(--mfk-white, #fff);
      border: 1px solid var(--mfk-border, #e2e8f0);
      border-radius: var(--mfk-radius, 12px);
      padding: 1.15rem 1.25rem;
    }
    .prompt {
      margin: 0 0 0.75rem;
      font-weight: 600;
      font-size: 0.95rem;
      color: var(--mfk-slate, #1e293b);
    }
    .row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
    button.thumb {
      border: 1px solid var(--mfk-border, #e2e8f0);
      background: var(--mfk-cream, #fffbf7);
      border-radius: 9999px;
      padding: 0.45rem 0.9rem;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--mfk-slate-mid, #334155);
    }
    button.thumb:hover { border-color: var(--mfk-coral, #ff7d26); color: var(--mfk-coral-dark, #e8661a); }
    button.thumb.selected {
      background: var(--mfk-coral-soft, #fff0e6);
      border-color: var(--mfk-coral, #ff7d26);
      color: var(--mfk-coral-dark, #e8661a);
    }
    button.thumb:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
    label {
      display: block;
      font-size: 0.8rem;
      color: var(--mfk-slate-soft, #64748b);
      margin-bottom: 0.35rem;
    }
    textarea {
      width: 100%;
      min-height: 64px;
      border: 1px solid var(--mfk-border, #e2e8f0);
      border-radius: var(--mfk-radius-sm, 8px);
      padding: 0.6rem 0.75rem;
      font: inherit;
      resize: vertical;
    }
    textarea:focus { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 1px; border-color: transparent; }
    .actions { margin-top: 0.65rem; }
    .submit {
      background: var(--mfk-coral, #ff7d26);
      color: #fff;
      border: none;
      border-radius: 9999px;
      padding: 0.5rem 1.1rem;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .submit:hover { background: var(--mfk-coral-dark, #e8661a); }
    .submit:focus-visible { outline: 3px solid var(--mfk-coral, #ff7d26); outline-offset: 2px; }
    .thanks {
      margin: 0;
      color: var(--mfk-success, #16a34a);
      font-weight: 600;
      font-size: 0.95rem;
    }
  `;

  class MfkFeedback extends HTMLElement {
    static get observedAttributes() {
      return ["prompt", "storage-key"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._vote = null;
    }

    connectedCallback() {
      this.render();
    }

    get storageKey() {
      return this.getAttribute("storage-key") || "mfk-feedback";
    }

    render() {
      let saved = null;
      try {
        saved = JSON.parse(localStorage.getItem(this.storageKey) || "null");
      } catch (_) {}

      const prompt =
        this.getAttribute("prompt") || "Was this helpful for your learner?";

      if (saved && saved.vote) {
        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <div class="box"><p class="thanks">Thanks for your feedback — it helps us improve practice for kids.</p></div>
        `;
        return;
      }

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <div class="box">
          <p class="prompt">${prompt}</p>
          <div class="row" role="group" aria-label="Helpfulness">
            <button type="button" class="thumb" data-vote="up" aria-pressed="false">👍 Yes</button>
            <button type="button" class="thumb" data-vote="down" aria-pressed="false">👎 Not really</button>
          </div>
          <label for="mfk-fb-note">Optional note</label>
          <textarea id="mfk-fb-note" maxlength="280" placeholder="What would make practice better?"></textarea>
          <div class="actions">
            <button type="button" class="submit">Send feedback</button>
          </div>
        </div>
      `;

      const thumbs = this.shadowRoot.querySelectorAll(".thumb");
      thumbs.forEach((btn) => {
        btn.addEventListener("click", () => {
          this._vote = btn.dataset.vote;
          thumbs.forEach((b) => {
            const on = b === btn;
            b.classList.toggle("selected", on);
            b.setAttribute("aria-pressed", String(on));
          });
        });
      });

      this.shadowRoot.querySelector(".submit").addEventListener("click", () => {
        if (!this._vote) {
          if (window.MFK && MFK.toast) {
            MFK.toast.show({ message: "Pick thumbs up or down first.", type: "warning" });
          }
          return;
        }
        const note = this.shadowRoot.querySelector("textarea").value.trim();
        const payload = { vote: this._vote, note, at: new Date().toISOString() };
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(payload));
        } catch (_) {}
        if (window.MFK && MFK.toast) {
          MFK.toast.show({ message: "Thanks! Feedback saved on this device.", type: "success" });
        }
        this.render();
      });
    }
  }

  customElements.define("mfk-feedback", MfkFeedback);
  window.MFK = window.MFK || {};
  window.MFK.Feedback = MfkFeedback;
})();
