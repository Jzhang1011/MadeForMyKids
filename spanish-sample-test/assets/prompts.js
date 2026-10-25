/* Spanish STAMP practice — Writing & Speaking engine (fixed level or adaptive).
   Requires common.js and scoring.js. Body: data-section="writing|speaking", data-level="1|2|3|adaptive".
   Recordings stay in this browser tab only; nothing is uploaded. */
(function () {
  'use strict';
  var F, S, C, kind, app, MAX = 2500;

  function hero(title, lead) {
    var lvl = C.level === 'adaptive' ? 'Adaptive tiered test' : 'Level ' + C.level + ' · ' + S.THRESHOLDS[C.level].name;
    return '<header class="fst-hero"><p class="fst-eyebrow">Spanish STAMP-style practice · ' + F.esc(lvl) + '</p><h1>' + title + '</h1><p>' + lead + '</p></header>';
  }
  function toolbar(extra) {
    return '<div class="fst-toolbar"><div class="fst-row" style="margin:0"><span class="fst-timer" data-timer>25:00</span>' +
      '<button type="button" class="fst-btn fst-btn--ghost" data-timer-toggle>Start timer (optional)</button></div>' + (extra || '') + '</div>';
  }
  function instructions() {
    if (kind === 'writing') return '<div class="fst-card"><h2>Instructions</h2><p>Write your answers <strong>in Spanish</strong>. Use connected sentences and add details. Each answer can be up to 2,500 characters. Plan for about 20–25 minutes for all three prompts. Your writing is saved automatically in this browser.</p><p>The practice prompt is <strong>not scored</strong>.</p></div>';
    return '<div class="fst-card"><h2>Instructions</h2><p>Answer each prompt out loud <strong>in Spanish</strong>. Use the prep timer to think, then speak until the response timer ends. Plan for about 20–25 minutes total.</p><p>Recording is optional: it stays on this device and is never uploaded. A parent can then fill in the checklist for each answer. The practice prompt is <strong>not scored</strong>.</p><p class="fst-note" data-mic-note>Checking microphone support…</p></div>';
  }
  function tip(level) {
    var t = { 1: 'Strong Level 1 answers use several simple sentences (soy…, tengo…, me gusta…) with familiar words.', 2: 'Strong Level 2 answers use 5+ sentences joined with y, pero, porque, and add related details.', 3: 'Strong Level 3 answers tell a connected story in order (primero, después, al final), include past or future events, and explain feelings or reasons.' };
    return '<p class="fst-note"><strong>What a strong answer includes:</strong> ' + t[level] + ' <a href="' + C.root + 'rubric.html">See the rubric</a>.</p>';
  }
  function promptHead(p, label, practice) {
    return (practice ? '<span class="fst-pill fst-pill--practice">Practice — not scored</span>' : '') +
      '<p class="fst-q-num">' + label + '</p><h3>' + F.esc(p.title) + '</h3><p>' + F.esc(p.prompt) + '</p>';
  }

  /* ---------- Writing ---------- */
  function writingBlock(p, key, label, practice, level) {
    return '<article class="fst-card fst-q' + (practice ? ' fst-q--practice' : '') + '" data-p="' + key + '">' + promptHead(p, label, practice) +
      '<textarea class="fst-textarea" lang="es" spellcheck="false" maxlength="' + MAX + '" data-ta="' + key + '" placeholder="Escribe aquí en español…"></textarea>' +
      '<div class="fst-counter" data-count="' + key + '">0 / ' + MAX + ' characters</div>' + (practice ? '' : tip(level)) + '<div data-fb="' + key + '"></div></article>';
  }
  function wireTextarea(key) {
    var ta = app.querySelector('[data-ta="' + key + '"]'), ct = app.querySelector('[data-count="' + key + '"]');
    var store = 'mfk-sst-draft-' + C.level + '-' + key;
    try { ta.value = localStorage.getItem(store) || ''; } catch (e) {}
    function upd() {
      if (ta.value.length > MAX) ta.value = ta.value.slice(0, MAX);
      var n = ta.value.length; ct.textContent = n + ' / ' + MAX + ' characters';
      ct.className = 'fst-counter' + (n >= MAX ? ' is-max' : n > MAX * 0.9 ? ' is-near' : '');
      try { localStorage.setItem(store, ta.value); } catch (e) {}
    }
    ta.addEventListener('input', upd); upd();
    return ta;
  }
  function writingFeedback(r, target) {
    var flags = r.flags.length ? '<p><strong>Gentle tips:</strong></p><ul class="fst-tips">' + r.flags.slice(0, 8).map(function (f) { return '<li>' + F.esc(f) + '</li>'; }).join('') + '</ul>' : '';
    return '<div class="fst-note"><p>Estimated level: <span class="fst-level">' + r.level + '</span>' + (target ? ' &nbsp;<span class="fst-status fst-status--' + (r.levelIdx >= target ? 'pass">Meets target' : 'notyet">Not yet') + '</span>' : '') + '</p>' +
      '<p>' + r.sentences + ' sentences · ' + r.words + ' words · ' + r.unique + ' different words · ' + r.distinctConnectors + ' kinds of connectors · ' + r.verbHits + ' verb forms' + (r.timeFrames ? ' · past/future used' : '') + '</p>' +
      '<ul class="fst-tips">' + r.feedback.map(function (f) { return '<li>' + F.esc(f) + '</li>'; }).join('') + '</ul>' + flags + '</div>';
  }

  /* ---------- Speaking ---------- */
  var micOK = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recs = {};
  function speakingBlock(p, key, label, practice) {
    var checks = S.CHECKLIST.map(function (c) { return '<label><input type="checkbox" data-chk="' + key + ':' + c[0] + '"> ' + F.esc(c[1]) + '</label>'; }).join('');
    return '<article class="fst-card fst-q' + (practice ? ' fst-q--practice' : '') + '" data-p="' + key + '">' + promptHead(p, label, practice) +
      '<div class="fst-row"><button type="button" class="fst-btn fst-btn--ghost" data-prep="' + key + '">Start prep (' + p.prep + 's)</button>' +
      '<button type="button" class="fst-btn fst-btn--ghost" data-resp="' + key + '">Start response timer (' + p.response + 's)</button><span class="fst-timer" data-ptimer="' + key + '"></span></div>' +
      (micOK ? '<div class="fst-row"><button type="button" class="fst-btn" data-rec="' + key + '">● Record</button><button type="button" class="fst-btn fst-btn--ghost" data-stop="' + key + '" disabled>■ Stop</button><span data-recstate="' + key + '"></span></div><audio controls class="fst-hidden" data-audio="' + key + '"></audio>' : '') +
      (practice ? '' : '<details class="fst-check-wrap" open><summary><strong>Parent checklist</strong> (tick what you heard)</summary><div class="fst-check">' + checks + '</div></details>' +
        '<div class="fst-row"><button type="button" class="fst-btn" data-score="' + key + '">Score this answer</button></div>' + tip(C.level === 'adaptive' ? 1 : C.level)) +
      '<div data-fb="' + key + '"></div></article>';
  }
  function countdown(key, secs, label) {
    var el = app.querySelector('[data-ptimer="' + key + '"]'), left = secs;
    clearInterval(recs['t' + key]);
    el.textContent = label + ' ' + left + 's';
    recs['t' + key] = setInterval(function () { left--; el.textContent = left > 0 ? label + ' ' + left + 's' : label + ' done'; if (left <= 0) clearInterval(recs['t' + key]); }, 1000);
  }
  function startRec(key) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var mr = new MediaRecorder(stream), chunks = [], st = Date.now(), r = { words: null };
      recs[key] = r; r.mr = mr; r.stream = stream;
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = function () {
        r.seconds = Math.round((Date.now() - st) / 1000);
        var a = app.querySelector('[data-audio="' + key + '"]');
        if (r.url) URL.revokeObjectURL(r.url);
        r.url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || 'audio/webm' }));
        a.src = r.url; a.classList.remove('fst-hidden');
        stream.getTracks().forEach(function (t) { t.stop(); });
        app.querySelector('[data-recstate="' + key + '"]').textContent = 'Recorded ' + r.seconds + 's' + (r.words != null ? ' · ~' + r.words + ' Spanish words recognized' : '') + ' (kept on this device only)';
      };
      mr.start();
      if (SR) {
        try {
          var rec = new SR(); rec.lang = /^es-(US|MX|419)/i.test(navigator.language || '') ? 'es-US' : 'es-ES'; rec.continuous = true; rec.interimResults = false; r.words = 0;
          rec.onresult = function (e) { var n = 0; for (var i = 0; i < e.results.length; i++) n += e.results[i][0].transcript.trim().split(/\s+/).filter(Boolean).length; r.words = n; };
          rec.onerror = function () {}; rec.start(); r.sr = rec;
        } catch (e) { r.words = null; }
      }
      app.querySelector('[data-rec="' + key + '"]').disabled = true; app.querySelector('[data-stop="' + key + '"]').disabled = false;
      app.querySelector('[data-recstate="' + key + '"]').innerHTML = '<span class="fst-rec-dot"></span> Recording…';
    }).catch(function () {
      app.querySelector('[data-recstate="' + key + '"]').textContent = 'Microphone not available — that’s fine, just speak and use the checklist.';
    });
  }
  function stopRec(key) {
    var r = recs[key]; if (!r || !r.mr) return;
    if (r.sr) try { r.sr.stop(); } catch (e) {}
    setTimeout(function () { r.mr.stop(); }, 300);
    app.querySelector('[data-rec="' + key + '"]').disabled = false; app.querySelector('[data-stop="' + key + '"]').disabled = true;
  }
  function speakingResult(key) {
    var checks = {};
    S.CHECKLIST.forEach(function (c) { var b = app.querySelector('[data-chk="' + key + ':' + c[0] + '"]'); checks[c[0]] = b && b.checked; });
    var r = recs[key], rec = r && typeof r.seconds === 'number' ? { seconds: r.seconds, words: r.words } : null;
    return S.scoreSpeaking(checks, rec);
  }
  function speakingFeedback(r, target) {
    return '<div class="fst-note"><p>Estimated level: <span class="fst-level">' + r.level + '</span>' + (target ? ' &nbsp;<span class="fst-status fst-status--' + (r.levelIdx >= target ? 'pass">Meets target' : 'notyet">Not yet') + '</span>' : '') + '</p><p>' + r.checked + ' of ' + S.CHECKLIST.length + ' checklist items.</p>' +
      (r.notes.length ? '<ul class="fst-tips">' + r.notes.map(function (n) { return '<li>' + F.esc(n) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
  }
  function wireSpeaking(getPrompt) {
    var note = app.querySelector('[data-mic-note]');
    if (note) note.textContent = micOK ? 'Recording is available. Your browser will ask for microphone permission the first time.' + (SR ? ' Spanish speech recognition is available to count words (processed by your browser).' : '') : 'Recording is not available in this browser. You can still practice out loud and use the parent checklist.';
    app.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var k;
      if ((k = b.getAttribute('data-prep'))) countdown(k, getPrompt(k).prep, 'Prep');
      else if ((k = b.getAttribute('data-resp'))) countdown(k, getPrompt(k).response, 'Speak');
      else if ((k = b.getAttribute('data-rec'))) startRec(k);
      else if ((k = b.getAttribute('data-stop'))) stopRec(k);
    });
  }

  /* ---------- Fixed mode ---------- */
  function bootFixed() {
    var lvl = C.level, data = window.FST_DATA['prompts-' + lvl][kind], target = S.THRESHOLDS[lvl].target, block = kind === 'writing' ? writingBlock : speakingBlock;
    var html = hero(kind === 'writing' ? 'Writing' : 'Speaking', 'Level ' + lvl + ' target: ' + S.THRESHOLDS[lvl].name + '. To pass, at least ' + S.PROMPTS_TO_PASS + ' of the 3 scored prompts must reach ' + S.THRESHOLDS[lvl].name + ' or higher.') +
      toolbar('<button type="button" class="fst-btn" data-submit>Submit section</button>') + instructions() + block(data.practice, 'p', 'Practice prompt', true, lvl);
    data.items.forEach(function (p, i) { html += block(p, String(i), 'Prompt ' + (i + 1) + ' of 3', false, lvl); });
    html += '<div class="fst-row"><button type="button" class="fst-btn" data-submit>Submit section</button></div><section data-result></section>';
    app.innerHTML = html;
    var timer = F.wireTimer(app, 25, function () { alert('Time is up! You can still finish and submit.'); });
    var results = {};
    if (kind === 'writing') { ['p', '0', '1', '2'].forEach(wireTextarea); }
    else {
      wireSpeaking(function (k) { return k === 'p' ? data.practice : data.items[+k]; });
      app.addEventListener('click', function (e) {
        var k = e.target.getAttribute && e.target.getAttribute('data-score'); if (!k) return;
        results[k] = speakingResult(k); app.querySelector('[data-fb="' + k + '"]').innerHTML = speakingFeedback(results[k], target);
      });
    }
    app.querySelectorAll('[data-submit]').forEach(function (b) {
      b.addEventListener('click', function () {
        var levels = [];
        for (var i = 0; i < 3; i++) {
          var k = String(i), r;
          if (kind === 'writing') { r = S.analyzeWriting(app.querySelector('[data-ta="' + k + '"]').value); app.querySelector('[data-fb="' + k + '"]').innerHTML = writingFeedback(r, target); }
          else { r = results[k] || speakingResult(k); app.querySelector('[data-fb="' + k + '"]').innerHTML = speakingFeedback(r, target); }
          levels.push(r.levelIdx);
        }
        if (timer) timer.pause();
        var pp = S.promptsPass(lvl, levels);
        F.saveSection(lvl, kind, { promptLevels: levels, pass: pp.pass, hits: pp.hits });
        var best = levels.slice().sort().reverse()[1];
        app.querySelector('[data-result]').innerHTML = '<div class="fst-card"><span class="fst-pill">Unofficial practice estimate</span><h2>Section result</h2>' +
          '<p>Prompt estimates: ' + levels.map(function (l, i) { return 'Prompt ' + (i + 1) + ': <strong>' + S.LEVELS[l] + '</strong>'; }).join(' · ') + '</p>' +
          '<p>Section level (second-best prompt): <span class="fst-level">' + S.LEVELS[best] + '</span></p>' +
          '<p><span class="fst-status fst-status--' + (pp.pass ? 'pass">PASS' : 'notyet">NOT YET') + '</span> ' + pp.hits + ' of 3 prompts reached ' + S.THRESHOLDS[lvl].name + ' (need ' + S.PROMPTS_TO_PASS + ').</p>' +
          '<p>You can edit and submit again any time.</p><div class="fst-row"><a class="fst-btn" href="' + C.root + 'results.html">See all results</a><a class="fst-btn fst-btn--ghost" href="index.html">Back to Level ' + lvl + '</a></div>' +
          '<p class="fst-warn">Unofficial practice only — not an Avant or FCPS score. This is a simple local estimate.</p></div>';
        app.querySelector('[data-result]').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /* ---------- Adaptive mode ---------- */
  function bootAdaptive() {
    var saved = F.load().adaptive || {};
    var tier = (saved.listening && saved.listening.endTier) || (saved.reading && saved.reading.endTier) || 1;
    var startTier = tier, history = [], step = 0, timer;
    var block = kind === 'writing' ? writingBlock : speakingBlock;
    var from = saved.listening ? 'your Listening result' : saved.reading ? 'your Reading result' : 'the Beginner tier';
    app.innerHTML = hero(kind === 'writing' ? 'Adaptive Writing' : 'Adaptive Speaking', 'You start at the ' + S.TIER_NAMES[tier] + ' tier (based on ' + from + '). After each prompt, meeting the tier’s target moves you up one tier; not yet moves you down one (never below Beginner).') +
      toolbar('<div class="fst-tier" data-tier aria-live="polite"></div>') + instructions() +
      block(window.FST_DATA['prompts-1'][kind].practice, 'p', 'Practice prompt', true, 1) + '<section data-stage></section>';
    timer = F.wireTimer(app, 25, function () { alert('Time is up! You can still finish.'); });
    if (kind === 'writing') wireTextarea('p');
    else wireSpeaking(function (k) { return k === 'p' ? window.FST_DATA['prompts-1'].speaking.practice : window.FST_DATA['prompts-' + tier].speaking.items[step]; });
    function showTier(change) {
      app.querySelector('[data-tier]').innerHTML = '<span class="fst-eyebrow">Current tier</span> <span class="fst-meter">' + [1, 2, 3].map(function (i) { return '<span class="fst-meter-seg' + (i <= tier ? ' is-on' : '') + '"></span>'; }).join('') + '</span> <strong>' + S.TIER_NAMES[tier] + '</strong>' +
        (change ? ' <span class="fst-tier-note">' + (change > 0 ? '▲ Moved up!' : change < 0 ? '▼ Moved down' : '') + '</span>' : '');
    }
    function render() {
      var stage = app.querySelector('[data-stage]');
      if (step >= 3) { finish(); return; }
      var p = window.FST_DATA['prompts-' + tier][kind].items[step], key = 'a' + step;
      stage.innerHTML = block(p, key, 'Prompt ' + (step + 1) + ' of 3 · ' + S.TIER_NAMES[tier] + ' tier', false, tier).replace(/<div class="fst-row"><button type="button" class="fst-btn" data-score[^<]*<\/button><\/div>/, '') +
        '<div class="fst-row"><button type="button" class="fst-btn" data-adnext>Score &amp; continue</button></div>';
      if (kind === 'writing') { var ta = wireTextarea(key); ta.value = ''; ta.dispatchEvent(new Event('input')); }
      stage.querySelector('[data-adnext]').addEventListener('click', function () {
        var r = kind === 'writing' ? S.analyzeWriting(stage.querySelector('[data-ta="' + key + '"]').value) : speakingResult(key);
        var pass = r.levelIdx >= S.THRESHOLDS[tier].target;
        history.push({ tier: tier, pass: pass, levelIdx: r.levelIdx });
        var before = tier; tier = S.nextPromptTier(tier, pass); step++;
        showTier(tier - before); render();
      });
    }
    function finish() {
      if (timer) timer.pause();
      var sus = S.sustainedTier(history, 'prompt'), hi = S.highestTier(history);
      F.saveSection('adaptive', kind, { startTier: startTier, endTier: tier, highest: hi, sustained: sus, history: history });
      app.querySelector('[data-stage]').innerHTML = '<div class="fst-card"><span class="fst-pill">Unofficial practice estimate</span><h2>Adaptive ' + kind + ' complete</h2><ul>' +
        history.map(function (h, i) { return '<li>Prompt ' + (i + 1) + ' (' + S.TIER_NAMES[h.tier] + '): ' + S.LEVELS[h.levelIdx] + ' — ' + (h.pass ? 'met target' : 'not yet') + '</li>'; }).join('') +
        '</ul><p>Highest tier reached: <strong>' + S.TIER_NAMES[hi] + '</strong> · Sustained: <strong>' + (sus ? S.TIER_NAMES[sus] : 'none yet') + '</strong></p><p>Sustained tier = the highest tier where at least 1 prompt was answered and 60% or more of that tier’s prompts met the target.</p>' +
        '<div class="fst-row"><a class="fst-btn" href="' + C.root + 'results.html#adaptive">See adaptive results</a><a class="fst-btn fst-btn--ghost" href="index.html">Back to adaptive test</a></div><p class="fst-warn">Unofficial practice only — not an Avant or FCPS score.</p></div>';
    }
    showTier(); render();
  }

  function boot() {
    F = window.FST; S = window.FSTScore; C = F.ctx(); kind = C.section; app = document.querySelector('[data-app]');
    var levels = C.level === 'adaptive' ? [1, 2, 3] : [C.level];
    F.loadScripts(levels.map(function (l) { return C.root + 'data/level-' + l + '-prompts.js'; }), function () {
      if (!levels.every(function (l) { return window.FST_DATA && window.FST_DATA['prompts-' + l]; })) { app.innerHTML = '<div class="fst-card"><p>Sorry — the prompts could not be loaded. Please refresh.</p></div>'; return; }
      if (C.level === 'adaptive') bootAdaptive(); else bootFixed();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
