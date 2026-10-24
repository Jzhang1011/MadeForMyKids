/* French STAMP practice — shared helpers: in-section nav, timer, storage, boot.
   Pages set <body data-section="reading" data-level="1|2|3|adaptive" data-root="../">. */
(function () {
  'use strict';
  var STORE = 'mfk-fst-v2';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ctx() {
    var b = document.body;
    return { section: b.getAttribute('data-section') || 'home', level: b.getAttribute('data-level') || '', root: b.getAttribute('data-root') || '' };
  }
  function levelLabel(level) { return level === 'adaptive' ? 'Adaptive' : level ? 'Level ' + level : ''; }

  function renderNav() {
    var host = document.querySelector('[data-fst-nav]');
    if (!host) return;
    var c = ctx(), r = c.root, links;
    if (c.level) {
      links = [
        ['home', 'Home', r + 'index.html'],
        ['level', levelLabel(c.level), 'index.html'],
        ['reading', 'Reading', 'reading.html'], ['writing', 'Writing', 'writing.html'],
        ['listening', 'Listening', 'listening.html'], ['speaking', 'Speaking', 'speaking.html'],
        ['rubric', 'Rubric', r + 'rubric.html'], ['results', 'Results', r + 'results.html']
      ];
    } else {
      links = [
        ['home', 'Home', 'index.html'], ['l1', 'Level 1', 'level-1/index.html'], ['l2', 'Level 2', 'level-2/index.html'],
        ['l3', 'Level 3', 'level-3/index.html'], ['adaptive', 'Adaptive', 'adaptive/index.html'],
        ['rubric', 'Rubric', 'rubric.html'], ['results', 'Results', 'results.html']
      ];
    }
    var cur = c.section === 'index' && c.level ? 'level' : c.section;
    host.className = 'fst-nav';
    host.setAttribute('aria-label', 'French practice sections');
    host.innerHTML = links.map(function (n) {
      return '<a href="' + n[2] + '"' + (n[0] === cur ? ' aria-current="page"' : '') + '>' + esc(n[1]) + '</a>';
    }).join('');
  }

  /* Countdown timer: optional and pausable. */
  function Timer(display, minutes, onEnd) { this.display = display; this.left = Math.round(minutes * 60); this.id = null; this.onEnd = onEnd; this.render(); }
  Timer.prototype.render = function () {
    var m = Math.floor(this.left / 60), s = this.left % 60;
    this.display.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    this.display.classList.toggle('is-low', this.left <= 60 || (this.left <= 300 && this.left < this.startLeft / 4));
  };
  Timer.prototype.start = function () {
    var t = this; if (t.id) return; if (t.startLeft == null) t.startLeft = t.left;
    t.id = setInterval(function () { t.left = Math.max(0, t.left - 1); t.render(); if (t.left === 0) { t.pause(); if (t.onEnd) t.onEnd(); } }, 1000);
  };
  Timer.prototype.pause = function () { clearInterval(this.id); this.id = null; };
  Timer.prototype.running = function () { return !!this.id; };
  Timer.prototype.reset = function (minutes) { this.pause(); this.left = Math.round(minutes * 60); this.startLeft = this.left; this.render(); };

  function wireTimer(root, minutes, onEnd) {
    var disp = root.querySelector('[data-timer]'), btn = root.querySelector('[data-timer-toggle]');
    if (!disp || !btn) return null;
    var t = new Timer(disp, minutes, onEnd);
    btn.addEventListener('click', function () {
      if (t.running()) { t.pause(); btn.textContent = 'Resume timer'; } else { t.start(); btn.textContent = 'Pause timer'; }
    });
    return t;
  }

  /* Storage: { fixed: { "1": { reading: {...} } }, adaptive: { reading: {...} } } */
  function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function save(all) { try { localStorage.setItem(STORE, JSON.stringify(all)); } catch (e) { /* storage blocked */ } }
  function saveSection(level, section, data) {
    var all = load(); data.savedAt = new Date().toISOString();
    if (level === 'adaptive') { all.adaptive = all.adaptive || {}; all.adaptive[section] = data; }
    else { all.fixed = all.fixed || {}; all.fixed[level] = all.fixed[level] || {}; all.fixed[level][section] = data; }
    save(all); return all;
  }
  function resetLevel(level) {
    var all = load();
    if (level === 'adaptive') delete all.adaptive; else if (all.fixed) delete all.fixed[level];
    save(all);
  }

  /* Load per-level data scripts (data/level-N-*.js) then call cb. */
  function loadScripts(srcs, cb) {
    var left = srcs.length; if (!left) { cb(); return; }
    srcs.forEach(function (src) {
      var s = document.createElement('script'); s.src = src;
      s.onload = s.onerror = function () { if (--left === 0) cb(); };
      document.head.appendChild(s);
    });
  }

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }


  window.FST = { esc: esc, ctx: ctx, levelLabel: levelLabel, wireTimer: wireTimer, Timer: Timer, load: load, saveSection: saveSection, resetLevel: resetLevel, loadScripts: loadScripts, onReady: onReady };
  onReady(renderNav);
})();
