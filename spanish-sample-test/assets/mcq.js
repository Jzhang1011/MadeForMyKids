/* Spanish STAMP practice — Reading & Listening engine (fixed level or adaptive).
   Requires common.js and scoring.js. Body: data-section="reading|listening", data-level="1|2|3|adaptive". */
(function () {
  'use strict';
  var F, S, C, kind, app, timer;
  var MAX_PLAYS = 2;

  /* ---------- Speech (listening) ---------- */
  var voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    var vs = speechSynthesis.getVoices() || [];
    voice = vs.filter(function (v) { return /^es(-|_)ES/i.test(v.lang); })[0] || vs.filter(function (v) { return /^es(-|_)(US|MX|419)/i.test(v.lang); })[0] || vs.filter(function (v) { return /^es/i.test(v.lang); })[0] || null;
    var note = document.querySelector('[data-voice-note]');
    if (note) note.textContent = voice ? 'Spanish voice: ' + voice.name : 'No Spanish voice found on this device — the browser will try es-ES anyway. Use “Show transcript” if the audio sounds wrong.';
  }
  /* Speak synchronously inside the click handler (iOS Safari requirement). Keeps global refs so
     utterances are not garbage-collected, resumes a paused engine, chunks long text by sentence and
     pings pause/resume to dodge Chrome's ~15s stall, and surfaces errors with the transcript. */
  var queue = [], keepAlive = null, speakingKey = null;
  window.__fstUtterances = queue;
  function stopKeepAlive() { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } }
  function chunks(text) {
    var parts = String(text).match(/[^.!?…]+[.!?…]*\s*/g) || [String(text)], out = [], cur = '';
    parts.forEach(function (p) { if ((cur + p).length > 180 && cur) { out.push(cur); cur = p; } else cur += p; });
    if (cur.trim()) out.push(cur);
    return out;
  }
  function speechFailed(key, msg) {
    stopKeepAlive();
    var box = key && app.querySelector('[data-txt="' + key + '"]');
    if (box) box.classList.remove('fst-hidden');
    var note = document.querySelector('[data-voice-note]');
    if (note) note.textContent = msg || 'Audio could not play on this device. The transcript is shown — have a parent read it aloud.';
  }
  function speak(text, key) {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return false;
    var ss = window.speechSynthesis;
    try {
      if (ss.speaking || ss.pending) ss.cancel();
      if (ss.paused) ss.resume();
      if (!voice) pickVoice();
      stopKeepAlive(); queue.length = 0; speakingKey = key;
      var started = false, list = chunks(text);
      list.forEach(function (part, i) {
        var u = new SpeechSynthesisUtterance(part);
        u.lang = (voice ? voice.lang.replace('_', '-') : 'es-ES'); u.rate = C.level === '1' ? 0.85 : 0.92; u.pitch = 1; u.volume = 1;
        if (voice) u.voice = voice;
        u.onstart = function () { started = true; };
        u.onend = function () { if (i === list.length - 1) stopKeepAlive(); };
        u.onerror = function (ev) {
          var err = ev && ev.error;
          if (err === 'interrupted' || err === 'canceled') return;
          speechFailed(key, 'Audio error (' + (err || 'unknown') + '). The transcript is shown — have a parent read it aloud.');
        };
        queue.push(u);
        ss.speak(u);
      });
      if (ss.paused) ss.resume();
      keepAlive = setInterval(function () {
        if (!ss.speaking) { stopKeepAlive(); return; }
        if (!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) { ss.pause(); ss.resume(); }
      }, 10000);
      setTimeout(function () {
        if (!started && speakingKey === key && !ss.speaking) speechFailed(key, 'No audio started — check the volume / silent switch, or install a voice for this language. The transcript is shown.');
      }, 4000);
      return true;
    } catch (e) { speechFailed(key); return false; }
  }

  /* ---------- Rendering ---------- */
  function stimulus(item, key) {
    if (kind === 'reading') {
      return '<div class="fst-passage' + (item.sign ? ' fst-passage--sign' : '') + '" lang="es">' + F.esc(item.passage) + '</div>';
    }
    return '<div class="fst-row">' +
      '<button type="button" class="fst-btn" data-play="' + key + '">▶ Play audio</button>' +
      '<span class="fst-plays" data-plays="' + key + '">' + MAX_PLAYS + ' plays left</span>' +
      '<button type="button" class="fst-btn fst-btn--ghost" data-tx="' + key + '">Show transcript (parents)</button></div>' +
      '<div class="fst-passage fst-hidden" lang="es" data-txt="' + key + '">' + F.esc(item.say) + '</div>';
  }
  function questionCard(item, key, label, practice) {
    var opts = item.options.map(function (o, i) {
      return '<li><label data-opt="' + key + ':' + i + '"><input type="radio" name="q-' + key + '" value="' + i + '"> <span>' + F.esc(o) + '</span></label></li>';
    }).join('');
    return '<article class="fst-card fst-q' + (practice ? ' fst-q--practice' : '') + '" data-q="' + key + '">' +
      (practice ? '<span class="fst-pill fst-pill--practice">Practice — not scored</span>' : '') +
      '<p class="fst-q-num">' + label + '</p>' + stimulus(item, key) +
      '<p><strong>' + F.esc(item.q) + '</strong></p><ul class="fst-options">' + opts + '</ul>' +
      (practice ? '<div class="fst-row"><button type="button" class="fst-btn fst-btn--ghost" data-check-practice>Check practice answer</button></div><p class="fst-feedback" data-practice-fb></p>' : '') +
      '</article>';
  }
  function chosen(key) { var r = app.querySelector('input[name="q-' + key + '"]:checked'); return r ? +r.value : -1; }

  var plays = {}, items = {};
  function wireCommon() {
    app.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      if (t.hasAttribute('data-play')) {
        var k = t.getAttribute('data-play'); plays[k] = plays[k] || 0;
        if (plays[k] >= MAX_PLAYS) return;
        if (!speak(items[k].say, k)) { app.querySelector('[data-txt="' + k + '"]').classList.remove('fst-hidden'); return; }
        plays[k]++;
        var left = MAX_PLAYS - plays[k];
        app.querySelector('[data-plays="' + k + '"]').textContent = left ? left + ' play left' : 'No plays left';
        if (!left) t.disabled = true;
      } else if (t.hasAttribute('data-tx')) {
        var box = app.querySelector('[data-txt="' + t.getAttribute('data-tx') + '"]');
        box.classList.toggle('fst-hidden');
        t.textContent = box.classList.contains('fst-hidden') ? 'Show transcript (parents)' : 'Hide transcript';
      } else if (t.hasAttribute('data-check-practice')) {
        var a = chosen('p'), fb = app.querySelector('[data-practice-fb]'), ans = items.p.answer;
        if (a < 0) { fb.textContent = 'Pick an answer first.'; fb.className = 'fst-feedback'; return; }
        fb.textContent = a === ans ? 'Correct! Practice items are not scored.' : 'Not quite — the answer is “' + items.p.options[ans] + '”. Practice items are not scored.';
        fb.className = 'fst-feedback ' + (a === ans ? 'ok' : 'no');
      }
    });
  }
  function hero(title, lead) {
    var lvl = C.level === 'adaptive' ? 'Adaptive tiered test' : 'Level ' + C.level + ' · ' + S.THRESHOLDS[C.level].name;
    return '<header class="fst-hero"><p class="fst-eyebrow">Spanish STAMP-style practice · ' + F.esc(lvl) + '</p><h1>' + title + '</h1><p>' + lead + '</p></header>';
  }
  function toolbar(extra) {
    return '<div class="fst-toolbar"><div class="fst-row" style="margin:0"><span class="fst-timer" data-timer>40:00</span>' +
      '<button type="button" class="fst-btn fst-btn--ghost" data-timer-toggle>Start timer (optional)</button></div>' + (extra || '') + '</div>';
  }
  function instructions() {
    var r = kind === 'reading'
      ? 'Read each Spanish text, then choose the best answer in English. You have about 35–40 minutes for 30 questions.'
      : 'Press Play to hear each Spanish recording. Each one can be played <strong>two times</strong>, like a real test. Choose the best answer. About 35–40 minutes for 30 questions.';
    return '<div class="fst-card"><h2>Instructions</h2><p>' + r + '</p><p>Start with the practice question — it is <strong>not scored</strong>. The timer is optional and can be paused.</p>' +
      (kind === 'listening' ? '<p class="fst-note" data-voice-note>Checking for a Spanish voice…</p>' : '') + '</div>';
  }

  /* ---------- Fixed-level mode ---------- */
  function bootFixed() {
    var data = window.FST_DATA[kind + '-' + C.level];
    items.p = data.practice;
    var html = hero(kind === 'reading' ? 'Reading' : 'Listening', 'Level ' + C.level + ' target: ' + S.THRESHOLDS[C.level].name + '. Pass mark: ' + S.THRESHOLDS[C.level].mcq + '% of the 30 scored questions.') +
      toolbar('<button type="button" class="fst-btn" data-submit>Submit answers</button>') + instructions() +
      questionCard(data.practice, 'p', 'Practice question', true);
    data.items.forEach(function (it, i) { items[i] = it; html += questionCard(it, String(i), 'Question ' + (i + 1) + ' of ' + data.items.length, false); });
    html += '<div class="fst-row"><button type="button" class="fst-btn" data-submit>Submit answers</button></div><section data-result></section>';
    app.innerHTML = html;
    timer = F.wireTimer(app, 40, function () { alert('Time is up! You can still finish and submit.'); });
    wireCommon();
    app.querySelectorAll('[data-submit]').forEach(function (b) { b.addEventListener('click', function () { submitFixed(data); }); });
  }
  function submitFixed(data) {
    var unanswered = data.items.filter(function (_, i) { return chosen(String(i)) < 0; }).length;
    if (unanswered && !confirm(unanswered + ' question(s) are unanswered. Submit anyway?')) return;
    if (timer) timer.pause();
    var correct = 0, review = '';
    data.items.forEach(function (it, i) {
      var a = chosen(String(i)), ok = a === it.answer; if (ok) correct++;
      app.querySelectorAll('[data-opt^="' + i + ':"]').forEach(function (l) {
        var oi = +l.getAttribute('data-opt').split(':')[1];
        l.classList.toggle('is-correct', oi === it.answer); l.classList.toggle('is-wrong', oi === a && !ok);
      });
      app.querySelectorAll('input[name="q-' + i + '"]').forEach(function (r) { r.disabled = true; });
      if (!ok) review += '<li>Q' + (i + 1) + ': ' + F.esc(it.q) + ' — <strong>' + F.esc(it.options[it.answer]) + '</strong>' + (a >= 0 ? ' (you chose “' + F.esc(it.options[a]) + '”)' : ' (no answer)') + '</li>';
    });
    var r = S.mcqPass(C.level, correct, data.items.length);
    F.saveSection(C.level, kind, { correct: correct, total: data.items.length, percent: r.percent, pass: r.pass });
    app.querySelectorAll('[data-submit]').forEach(function (b) { b.disabled = true; });
    var box = app.querySelector('[data-result]');
    box.innerHTML = '<div class="fst-card"><span class="fst-pill">Unofficial practice estimate</span><h2>Your result</h2>' +
      '<p class="fst-score">' + correct + ' / ' + data.items.length + ' (' + r.percent + '%)</p>' +
      '<p><span class="fst-level">' + (r.pass ? 'PASS' : 'NOT YET') + '</span> &nbsp;Level ' + C.level + ' pass mark is ' + S.THRESHOLDS[C.level].mcq + '%. The practice question was not counted.</p>' +
      (review ? '<h3>Review: correct answers for missed questions</h3><ul>' + review + '</ul>' : '<p>Perfect score — every answer correct!</p>') +
      '<p>Correct answers are highlighted in green above.</p><div class="fst-row"><a class="fst-btn" href="' + C.root + 'results.html">See all results</a><a class="fst-btn fst-btn--ghost" href="index.html">Back to Level ' + C.level + '</a></div>' +
      '<p class="fst-warn">Unofficial practice only — not an Avant or FCPS score.</p></div>';
    box.scrollIntoView({ behavior: 'smooth' });
  }

  /* ---------- Adaptive mode ---------- */
  var ad, current, adTotal = 30;
  function bootAdaptive() {
    var banks = {};
    [1, 2, 3].forEach(function (t) { banks[t] = window.FST_DATA[kind + '-' + t].items; });
    items.p = window.FST_DATA[kind + '-1'].practice;
    ad = new S.AdaptiveMCQ(banks, { total: adTotal, startTier: 1 });
    app.innerHTML = hero(kind === 'reading' ? 'Adaptive Reading' : 'Adaptive Listening', 'Questions come one at a time. You start at the Beginner tier. 3 correct in a row moves you up a tier; 2 wrong in a row moves you down (never below Beginner).') +
      toolbar('<div class="fst-tier" data-tier aria-live="polite"></div>') + instructions() +
      questionCard(items.p, 'p', 'Practice question', true) +
      '<div class="fst-row"><button type="button" class="fst-btn" data-begin>Start scored questions</button></div><section data-stage></section>';
    timer = F.wireTimer(app, 40, function () { alert('Time is up! You can still finish.'); });
    wireCommon(); showTier();
    app.querySelector('[data-begin]').addEventListener('click', function (e) { e.target.closest('.fst-row').remove(); app.querySelector('[data-q="p"]').remove(); nextAdaptive(); });
  }
  function showTier(change) {
    var t = ad.tier, el = app.querySelector('[data-tier]');
    el.innerHTML = '<span class="fst-eyebrow">Current tier</span> <span class="fst-meter">' + [1, 2, 3].map(function (i) { return '<span class="fst-meter-seg' + (i <= t ? ' is-on' : '') + '"></span>'; }).join('') + '</span> <strong>' + S.TIER_NAMES[t] + '</strong>' +
      (change ? ' <span class="fst-tier-note">' + (change.to > change.from ? '▲ Moved up!' : '▼ Moved down') + '</span>' : '');
  }
  function nextAdaptive() {
    current = ad.next();
    var stage = app.querySelector('[data-stage]');
    if (!current) { finishAdaptive(); return; }
    items.a = current.item; plays.a = 0;
    var n = ad.history.length + 1;
    stage.innerHTML = questionCard(current.item, 'a', 'Question ' + n + ' of ' + adTotal + ' · ' + S.TIER_NAMES[current.tier] + ' tier', false) +
      '<div class="fst-row"><button type="button" class="fst-btn" data-next>' + (n === adTotal ? 'Finish' : 'Next question') + '</button></div>';
    stage.querySelector('[data-next]').addEventListener('click', function () {
      var a = chosen('a');
      if (a < 0 && !confirm('No answer selected. Skip (counts as wrong)?')) return;
      var ch = ad.record(current, a === current.item.answer);
      ad.history[ad.history.length - 1].chosen = a;
      showTier(ch); nextAdaptive();
    });
  }
  function finishAdaptive() {
    if (timer) timer.pause();
    var h = ad.history, correct = h.filter(function (x) { return x.correct; }).length;
    var sus = S.sustainedTier(h, 'mcq'), hi = S.highestTier(h);
    F.saveSection('adaptive', kind, { correct: correct, total: h.length, endTier: ad.tier, highest: hi, sustained: sus, history: h.map(function (x) { return { id: x.id, tier: x.tier, correct: x.correct }; }) });
    var review = h.map(function (x, i) {
      var p = x.id.split(':'), it = window.FST_DATA[kind + '-' + p[0]].items[+p[1]];
      return '<li>' + (x.correct ? '✅' : '❌') + ' Q' + (i + 1) + ' (' + S.TIER_NAMES[x.tier] + '): ' + F.esc(it.q) + ' — <strong>' + F.esc(it.options[it.answer]) + '</strong></li>';
    }).join('');
    app.querySelector('[data-stage]').innerHTML = '<div class="fst-card"><span class="fst-pill">Unofficial practice estimate</span><h2>Adaptive ' + kind + ' complete</h2>' +
      '<p class="fst-score">' + correct + ' / ' + h.length + '</p><p>Ended at: <strong>' + S.TIER_NAMES[ad.tier] + '</strong> · Highest reached: <strong>' + S.TIER_NAMES[hi] + '</strong> · Sustained: <strong>' + (sus ? S.TIER_NAMES[sus] : 'none yet') + '</strong></p>' +
      '<p>Sustained tier = the highest tier with at least 5 scored items answered at 60% or better.</p><h3>Review (correct answers)</h3><ul>' + review + '</ul>' +
      '<div class="fst-row"><a class="fst-btn" href="' + C.root + 'results.html#adaptive">See adaptive results</a><a class="fst-btn fst-btn--ghost" href="index.html">Back to adaptive test</a></div>' +
      '<p class="fst-warn">Unofficial practice only — not an Avant or FCPS score.</p></div>';
  }

  function boot() {
    F = window.FST; S = window.FSTScore; C = F.ctx(); kind = C.section; app = document.querySelector('[data-app]');
    var levels = C.level === 'adaptive' ? [1, 2, 3] : [C.level];
    F.loadScripts(levels.map(function (l) { return C.root + 'data/level-' + l + '-' + kind + '.js'; }), function () {
      var need = levels.every(function (l) { return window.FST_DATA && window.FST_DATA[kind + '-' + l]; });
      if (!need) { app.innerHTML = '<div class="fst-card"><p>Sorry — the questions could not be loaded. Please refresh the page.</p></div>'; return; }
      if (C.level === 'adaptive') bootAdaptive(); else bootFixed();
      if (kind === 'listening') {
        pickVoice();
        if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = pickVoice;
        else { var n = document.querySelector('[data-voice-note]'); if (n) n.textContent = 'This browser has no speech support. Use “Show transcript” and have a parent read each item aloud.'; }
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
