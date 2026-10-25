/* Landing page: fixed vs adaptive toggle (choice remembered in localStorage). */
(function () {
  'use strict';
  var KEY = 'mfk-sst-mode';
  function set(mode) {
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)); });
    document.querySelectorAll('[data-mode-panel]').forEach(function (p) { p.classList.toggle('fst-hidden', p.getAttribute('data-mode-panel') !== mode); });
    try { localStorage.setItem(KEY, mode); } catch (e) {}
  }
  function boot() {
    var saved = 'fixed'; try { saved = localStorage.getItem(KEY) || 'fixed'; } catch (e) {}
    set(saved === 'adaptive' ? 'adaptive' : 'fixed');
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-mode')); }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
