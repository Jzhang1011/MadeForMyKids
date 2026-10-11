/* Shared helpers for the Geometry Proofs practice section.
   Data fields (statement, names) are trusted author HTML — render as-is.
   Only user-influenced strings should go through Proofs.esc(). */
(function () {
  "use strict";

  var KEY = "mfk-proofs-progress";
  var cache = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function loadData() {
    if (cache) return Promise.resolve(cache);
    return Promise.all([
      fetch("data/proofs.json").then(function (r) {
        if (!r.ok) throw new Error("proofs.json " + r.status);
        return r.json();
      }),
      fetch("data/quiz.json").then(function (r) {
        if (!r.ok) throw new Error("quiz.json " + r.status);
        return r.json();
      })
    ]).then(function (pair) {
      var proofs = pair[0];
      var quizDoc = pair[1];
      var byId = {};
      proofs.reasons.forEach(function (r) { byId[r.id] = r; });
      cache = {
        proofs: proofs,
        reasons: proofs.reasons,
        byId: byId,
        spotErrors: proofs.spotErrors,
        tellApart: proofs.tellApart,
        videos: proofs.videos,
        quiz: quizDoc.items || quizDoc
      };
      return cache;
    });
  }

  function blankProgress() {
    return { visits: 0, quizzesTaken: 0, bestScore: null, misses: {} };
  }

  function getProgress() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return blankProgress();
      var p = JSON.parse(raw);
      return {
        visits: p.visits || 0,
        quizzesTaken: p.quizzesTaken || 0,
        bestScore: (typeof p.bestScore === "number") ? p.bestScore : null,
        misses: p.misses || {}
      };
    } catch (e) {
      return blankProgress();
    }
  }

  function saveProgress(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* private mode */ }
  }

  function recordVisit() {
    var p = getProgress();
    p.visits += 1;
    saveProgress(p);
  }

  function recordQuizResult(correct, total) {
    var p = getProgress();
    p.quizzesTaken += 1;
    var pct = total ? Math.round((100 * correct) / total) : 0;
    if (p.bestScore === null || pct > p.bestScore) p.bestScore = pct;
    saveProgress(p);
    return pct;
  }

  function recordMiss(reasonId) {
    var p = getProgress();
    p.misses[reasonId] = (p.misses[reasonId] || 0) + 1;
    saveProgress(p);
  }

  function clearMiss(reasonId) {
    var p = getProgress();
    if (p.misses[reasonId]) {
      delete p.misses[reasonId];
      saveProgress(p);
    }
  }

  function getWeakReasons(limit) {
    var p = getProgress();
    return Object.keys(p.misses)
      .sort(function (a, b) { return p.misses[b] - p.misses[a]; })
      .slice(0, limit || 8);
  }

  function showLoadError(el, what) {
    if (el) {
      el.innerHTML = '<p style="color:var(--mfk-slate-soft);padding:2rem;text-align:center">' +
        'Could not load the ' + esc(what) + ' — check your connection and refresh.</p>';
    }
  }

  window.Proofs = {
    esc: esc,
    shuffle: shuffle,
    loadData: loadData,
    showLoadError: showLoadError,
    getProgress: getProgress,
    recordVisit: recordVisit,
    recordQuizResult: recordQuizResult,
    recordMiss: recordMiss,
    clearMiss: clearMiss,
    getWeakReasons: getWeakReasons
  };
})();
