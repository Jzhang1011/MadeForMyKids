/**
 * Toast notifications via MFK.toast.show({ message, type, duration })
 * Types: success | error | info | warning
 * Auto-injects <mfk-toast-host> if missing
 */
(function () {
  if (customElements.get("mfk-toast-host")) return;

  const STYLES = `
    :host {
      position: fixed;
      bottom: 1.25rem;
      right: 1.25rem;
      z-index: 300;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: min(360px, calc(100vw - 2rem));
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.85rem 1rem;
      border-radius: var(--mfk-radius, 12px);
      box-shadow: var(--mfk-shadow-lg, 0 12px 32px rgba(30,41,59,0.12));
      background: var(--mfk-white, #fff);
      border: 1px solid var(--mfk-border, #e2e8f0);
      font-size: 0.9rem;
      color: var(--mfk-slate, #1e293b);
      animation: slideIn 0.25s ease;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .toast.leaving { opacity: 0; transform: translateY(6px); transition: all 0.2s ease; }
    .icon { flex-shrink: 0; font-size: 1.1rem; }
    .msg { flex: 1; line-height: 1.4; }
    .dismiss {
      border: none; background: transparent; cursor: pointer;
      color: var(--mfk-slate-soft, #64748b); font-size: 1.1rem; line-height: 1;
      padding: 0 0.15rem;
    }
    .dismiss:focus-visible { outline: 2px solid var(--mfk-coral, #ff7d26); border-radius: 4px; }
    .success { border-left: 4px solid var(--mfk-success, #16a34a); }
    .error { border-left: 4px solid var(--mfk-error, #dc2626); }
    .info { border-left: 4px solid var(--mfk-info, #2563eb); }
    .warning { border-left: 4px solid var(--mfk-warning, #ca8a04); }
  `;

  const ICONS = { success: "✅", error: "⚠️", info: "ℹ️", warning: "💡" };

  class MfkToastHost extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<style>${STYLES}</style><div class="list" role="region" aria-label="Notifications" aria-live="polite"></div>`;
    }

    show({ message = "", type = "info", duration = 4000 } = {}) {
      const list = this.shadowRoot.querySelector(".list");
      const el = document.createElement("div");
      el.className = `toast ${type}`;
      el.setAttribute("role", "status");
      el.innerHTML = `
        <span class="icon" aria-hidden="true">${ICONS[type] || ICONS.info}</span>
        <span class="msg">${message}</span>
        <button type="button" class="dismiss" aria-label="Dismiss">×</button>
      `;
      const remove = () => {
        el.classList.add("leaving");
        setTimeout(() => el.remove(), 200);
      };
      el.querySelector(".dismiss").addEventListener("click", remove);
      list.appendChild(el);
      if (duration > 0) setTimeout(remove, duration);
      return el;
    }
  }

  customElements.define("mfk-toast-host", MfkToastHost);

  function ensureHost() {
    let host = document.querySelector("mfk-toast-host");
    if (!host) {
      host = document.createElement("mfk-toast-host");
      document.body.appendChild(host);
    }
    return host;
  }

  window.MFK = window.MFK || {};
  window.MFK.toast = {
    show(opts) {
      return ensureHost().show(opts || {});
    },
  };
})();
