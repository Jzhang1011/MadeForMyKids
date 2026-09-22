/**
 * <mfk-activity-feedback state="correct|incorrect|completed|hint" message="…">
 * In-activity status banner (Correct / Incorrect / Completed / Hint).
 * Distinct from <mfk-feedback> (site thumbs + optional comment).
 *
 * Attributes:
 *   state   — correct | incorrect | completed | hint (aliases: success, error, done, tip)
 *   message — optional override copy
 *   hidden  — when present, host is not shown (or use MFK.activityFeedback.hide)
 *
 * Programmatic:
 *   MFK.activityFeedback.show({ state: 'correct', message: 'Nice work!' })
 *   MFK.activityFeedback.hide()
 */
(function () {
  if (customElements.get("mfk-activity-feedback")) return;

  const STATES = {
    correct: {
      label: "Correct",
      icon: "✅",
      bg: "var(--mfk-success-soft, #dcfce7)",
      fg: "var(--mfk-success, #16a34a)",
      border: "var(--mfk-success, #16a34a)",
      defaultMsg: "Great job — that is correct!",
    },
    incorrect: {
      label: "Incorrect",
      icon: "❌",
      bg: "var(--mfk-error-soft, #fee2e2)",
      fg: "var(--mfk-error, #dc2626)",
      border: "var(--mfk-error, #dc2626)",
      defaultMsg: "Not quite — try again.",
    },
    completed: {
      label: "Completed",
      icon: "🎉",
      bg: "var(--mfk-coral-soft, #fff0e6)",
      fg: "var(--mfk-coral-dark, #e8661a)",
      border: "var(--mfk-coral, #ff7d26)",
      defaultMsg: "Activity complete — nice work!",
    },
    hint: {
      label: "Hint",
      icon: "💡",
      bg: "var(--mfk-info-soft, #dbeafe)",
      fg: "var(--mfk-info, #2563eb)",
      border: "var(--mfk-info, #2563eb)",
      defaultMsg: "Here is a hint to keep you moving.",
    },
  };

  const ALIASES = {
    success: "correct",
    right: "correct",
    error: "incorrect",
    wrong: "incorrect",
    fail: "incorrect",
    done: "completed",
    complete: "completed",
    tip: "hint",
    help: "hint",
  };

  function normalizeState(raw) {
    const key = String(raw || "hint").toLowerCase().trim();
    return ALIASES[key] || (STATES[key] ? key : "hint");
  }

  const STYLES = `
    :host {
      display: block;
    }
    :host([hidden]) { display: none !important; }
    .banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.85rem 1.1rem;
      border-radius: var(--mfk-radius, 12px);
      border: 1px solid transparent;
      border-left-width: 4px;
      background: var(--banner-bg);
      color: var(--banner-fg);
      border-color: color-mix(in srgb, var(--banner-border) 35%, transparent);
      border-left-color: var(--banner-border);
    }
    .icon { font-size: 1.25rem; line-height: 1.2; flex-shrink: 0; }
    .text { min-width: 0; }
    .label {
      font-family: var(--mfk-font-display, Fredoka, system-ui, sans-serif);
      font-weight: 600;
      font-size: 0.95rem;
      margin: 0 0 0.15rem;
    }
    .msg {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.45;
      color: var(--mfk-slate-mid, #334155);
    }
  `;

  class MfkActivityFeedback extends HTMLElement {
    static get observedAttributes() {
      return ["state", "message", "hidden"];
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
      const stateKey = normalizeState(this.getAttribute("state"));
      const conf = STATES[stateKey];
      const message = this.getAttribute("message") || conf.defaultMsg;

      this.shadowRoot.innerHTML = `
        <style>${STYLES}</style>
        <div class="banner" role="status" aria-live="polite"
             style="--banner-bg:${conf.bg};--banner-fg:${conf.fg};--banner-border:${conf.border}">
          <span class="icon" aria-hidden="true">${conf.icon}</span>
          <div class="text">
            <p class="label">${conf.label}</p>
            <p class="msg">${message}</p>
          </div>
        </div>
      `;
    }
  }

  customElements.define("mfk-activity-feedback", MfkActivityFeedback);

  window.MFK = window.MFK || {};
  window.MFK.ActivityFeedback = MfkActivityFeedback;
  window.MFK.activityFeedback = {
    normalize: normalizeState,
    states: Object.keys(STATES),
    show: function (opts) {
      opts = opts || {};
      var el =
        document.querySelector("mfk-activity-feedback#mfk-activity-feedback-live") ||
        document.querySelector("mfk-activity-feedback");
      if (!el) {
        el = document.createElement("mfk-activity-feedback");
        el.id = "mfk-activity-feedback-live";
        (document.querySelector("main") || document.body).prepend(el);
      }
      if (opts.state) el.setAttribute("state", opts.state);
      if (opts.message != null) el.setAttribute("message", opts.message);
      el.removeAttribute("hidden");
      return el;
    },
    hide: function () {
      document.querySelectorAll("mfk-activity-feedback").forEach(function (el) {
        el.setAttribute("hidden", "");
      });
    },
  };
})();
