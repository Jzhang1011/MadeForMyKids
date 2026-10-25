/* Results page: fixed-level pass/not-yet status and adaptive tier estimate.
   UNOFFICIAL PRACTICE ESTIMATE — not an Avant or FCPS score. */
(function () {
  'use strict';
  var F, S, app;
  var MEANING = {
    0: 'Not at Novice High yet: the student is building first words and memorized phrases. Keep practicing Level 1 topics.',
    3: 'Novice High: can handle short, simple sentences on very familiar topics (self, family, school, food). FCPS tier: 1 credit.',
    4: 'Intermediate Low: can create simple sentences of their own and understand short texts with related details. FCPS tier: 2 credits.',
    5: 'Intermediate Mid: can connect sentences to describe experiences and tell simple stories. FCPS tier: 3 credits.'
  };
  var SECLAB = { reading: 'Reading', listening: 'Listening', writing: 'Writing', speaking: 'Speaking' };

  function badge(r) {
    if (!r) return '<span class="fst-status fst-status--none">Not taken</span>';
    return '<span class="fst-status fst-status--' + (r.pass ? 'pass">Pass' : 'notyet">Not yet') + '</span>';
  }
  function detail(s, r) {
    if (!r) return '—';
    if (r.percent != null) return r.correct + '/' + r.total + ' (' + r.percent + '%)';
    return (r.promptLevels || []).map(function (l) { return S.LEVELS[l]; }).join(', ');
  }
  function fixedHtml(all) {
    var fixed = all.fixed || {}, rec = S.recommend(fixed);
    var html = '<section class="fst-card"><span class="fst-pill">UNOFFICIAL PRACTICE ESTIMATE</span><h2>Fixed-level tests</h2><p><strong>Recommended next step:</strong> ' + F.esc(rec.text) + '</p>';
    [1, 2, 3].forEach(function (L) {
      var r = fixed[L] || {}, st = S.levelStatus(r), T = S.THRESHOLDS[L];
      var stLab = { passed: ['pass', 'Passed'], 'in-progress': ['progress', 'In progress'], 'not-started': ['none', 'Not started'] }[st];
      html += '<div class="fst-card" style="box-shadow:none"><h3>Level ' + L + ' · ' + T.name + ' <span class="fst-status fst-status--' + stLab[0] + '">' + stLab[1] + '</span></h3>' +
        '<p>' + F.esc(MEANING[T.target]) + '</p><table class="fst-table"><thead><tr><th>Section</th><th>Result</th><th>Details</th></tr></thead><tbody>' +
        S.SECTIONS.map(function (s) { return '<tr><td><a href="level-' + L + '/' + s + '.html">' + SECLAB[s] + '</a></td><td>' + badge(r[s]) + '</td><td>' + detail(s, r[s]) + '</td></tr>'; }).join('') +
        '</tbody></table><div class="fst-row"><a class="fst-btn fst-btn--ghost" href="level-' + L + '/index.html">Open Level ' + L + '</a><button type="button" class="fst-btn fst-btn--ghost" data-reset="' + L + '">Reset Level ' + L + '</button></div></div>';
    });
    return html + '</section>';
  }
  function adaptiveHtml(all) {
    var a = all.adaptive || {}, sus = {};
    S.SECTIONS.forEach(function (s) { if (a[s]) sus[s] = a[s].sustained; });
    var ov = S.adaptiveOverall(sus);
    var rows = S.SECTIONS.map(function (s) {
      var r = a[s];
      return '<tr><td><a href="adaptive/' + s + '.html">' + SECLAB[s] + '</a></td><td>' + (r ? S.TIER_NAMES[r.highest] || '—' : '<span class="fst-status fst-status--none">Not taken</span>') + '</td><td>' + (r ? (r.sustained ? S.TIER_NAMES[r.sustained] : 'None yet') : '—') + '</td><td>' + (r && r.correct != null ? r.correct + '/' + r.total : r && r.history ? r.history.filter(function (h) { return h.pass; }).length + '/' + r.history.length + ' prompts met target' : '—') + '</td></tr>';
    }).join('');
    var overall, next;
    if (!ov.complete) {
      overall = '<p><strong>Overall estimate:</strong> finish ' + ov.missing.map(function (s) { return SECLAB[s]; }).join(', ') + ' to see it.</p>';
      next = 'Take the missing section(s) above.';
    } else {
      overall = '<p><strong>Overall estimate:</strong> <span class="fst-level">' + ov.level + '</span> · ' + (ov.credits ? ov.credits + ' credit' + (ov.credits > 1 ? 's' : '') + ' tier' : '0 credits yet') + '</p><p>' + F.esc(MEANING[ov.levelIdx]) + '</p>';
      next = ov.levelIdx === 5 ? 'Top tier sustained in every section — keep practicing connected storytelling.' : ov.levelIdx === 0 ? 'Practice Level 1 topics, then retake the adaptive test or try fixed Level 1.' : 'Try fixed Level ' + (ov.tier + 1) + ' to work toward the next tier, focusing on your lowest section.';
    }
    return '<section class="fst-card" id="adaptive"><span class="fst-pill">UNOFFICIAL PRACTICE ESTIMATE</span><h2>Adaptive tiered test</h2>' +
      '<table class="fst-table"><thead><tr><th>Section</th><th>Highest tier reached</th><th>Sustained tier</th><th>Score</th></tr></thead><tbody>' + rows + '</tbody></table>' + overall +
      '<p><strong>Recommended next step:</strong> ' + F.esc(next) + '</p><div class="fst-row"><a class="fst-btn fst-btn--ghost" href="adaptive/index.html">Open adaptive test</a><button type="button" class="fst-btn fst-btn--ghost" data-reset="adaptive">Reset adaptive results</button></div></section>';
  }
  function rulesHtml() {
    return '<section class="fst-card"><h2>How these estimates are calculated</h2><h3>Fixed-level tests</h3><ul>' +
      [1, 2, 3].map(function (L) { var T = S.THRESHOLDS[L]; return '<li>Level ' + L + ' (' + T.name + ', ' + T.credits + ' credit' + (T.credits > 1 ? 's' : '') + '): Reading and Listening ≥ ' + T.mcq + '% correct; Writing and Speaking need ' + S.PROMPTS_TO_PASS + ' of 3 prompts estimated at ' + T.name + ' or higher.</li>'; }).join('') +
      '<li>A level is <strong>passed</strong> only when all four sections pass. <strong>In progress</strong> = at least one section taken. Practice items never count.</li></ul>' +
      '<h3>Adaptive test</h3><ul><li><strong>Sustained tier</strong> = the highest tier where the student answered at least 5 scored questions (Reading/Listening) or at least 1 prompt (Writing/Speaking) with 60% or more correct / meeting the target.</li>' +
      '<li><strong>Overall estimate</strong> = the <em>lowest</em> sustained tier across the four sections. Beginner → Novice High (1 credit), Early intermediate → Intermediate Low (2 credits), Intermediate → Intermediate Mid (3 credits). No sustained tier in a section → below Novice High (0 credits yet).</li></ul>' +
      '<p>Writing and Speaking estimates come from simple checks in your browser (see the <a href="rubric.html">rubric</a>), not from a trained rater.</p></section>';
  }
  function render() {
    var all = F.load();
    app.innerHTML = '<header class="fst-hero"><p class="fst-eyebrow">Spanish STAMP-style practice</p><h1>My results</h1><p>Saved only in this browser.</p></header>' +
      '<p class="fst-warn">UNOFFICIAL PRACTICE ESTIMATE — this is not an Avant or FCPS score and does not predict an official result. It is only an estimate from a fixed practice set.</p>' +
      fixedHtml(all) + adaptiveHtml(all) + rulesHtml();
  }
  function boot() {
    F = window.FST; S = window.FSTScore; app = document.querySelector('[data-app]');
    render();
    app.addEventListener('click', function (e) {
      var k = e.target.getAttribute && e.target.getAttribute('data-reset'); if (!k) return;
      if (!confirm('Reset ' + (k === 'adaptive' ? 'the adaptive test' : 'Level ' + k) + ' results?')) return;
      F.resetLevel(k); render();
    });
    if (location.hash === '#adaptive') { var el = document.getElementById('adaptive'); if (el) el.scrollIntoView(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
