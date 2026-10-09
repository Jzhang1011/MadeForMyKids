/* Solar System learning experience — shared engine.
   SOLAR.store: localStorage progress (lessons completed, quiz accuracy).
   SOLAR.quiz: renders a question set with immediate explanatory feedback.
   SOLAR.embed: YouTube watch URL -> responsive iframe embed. */
(function () {
  "use strict";
  var KEY = "mfk.solar.v1";

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  var store = {
    load: function () {
      try { return JSON.parse(localStorage.getItem(KEY)) || { lessons: {}, quiz: { n: 0, correct: 0 } }; }
      catch (e) { return { lessons: {}, quiz: { n: 0, correct: 0 } }; }
    },
    save: function (s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} },
    completeLesson: function (id) {
      var s = this.load();
      if (!s.lessons[id]) { s.lessons[id] = { done: true, at: Date.now() }; this.save(s); }
    },
    isDone: function (id) { return !!this.load().lessons[id]; },
    recordQuiz: function (correct, total) {
      var s = this.load();
      s.quiz.n += total; s.quiz.correct += correct; this.save(s);
    },
    stats: function () {
      var s = this.load();
      var done = Object.keys(s.lessons).length;
      return { lessonsDone: done, quizN: s.quiz.n, accuracy: s.quiz.n ? Math.round(100 * s.quiz.correct / s.quiz.n) : null };
    },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };

  function ytEmbedUrl(url) {
    var m = String(url || "").match(/[?&]v=([A-Za-z0-9_-]{11})/);
    return m ? "https://www.youtube.com/embed/" + m[1] : null;
  }

  /* Render an inline YouTube player with a fallback link. Returns HTML string. */
  function embedPlayer(url, title) {
    var embed = ytEmbedUrl(url);
    if (!embed) return "";
    return '<div class="solar-embed"><iframe src="' + esc(embed) + '" title="' + esc(title || "Video") + '"' +
      ' loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>' +
      '<p class="solar-note">Video not loading? <a href="' + esc(url) + '" target="_blank" rel="noopener">Watch on YouTube →</a></p>';
  }

  /* Render quiz questions into a container. Each question:
     { text, options: [..], answer: idx, why, wrongWhy (optional) }
     Answers are never revealed before an attempt. */
  function quiz(containerId, questions, opts) {
    var host = document.getElementById(containerId);
    if (!host) return;
    opts = opts || {};
    var answered = 0, correct = 0, locked = false;
    host.innerHTML = questions.map(function (q, qi) {
      return '<div class="solar-quiz-q" data-q="' + qi + '">' +
        '<p class="q-text">' + (qi + 1) + ". " + esc(q.text) + "</p>" +
        '<div class="solar-quiz-opts">' +
        q.options.map(function (o, oi) {
          return '<button type="button" class="solar-quiz-opt" data-o="' + oi + '">' + esc(o) + "</button>";
        }).join("") +
        "</div>" +
        '<div class="solar-feedback" role="status"></div>' +
        "</div>";
    }).join("");

    host.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".solar-quiz-opt");
      if (!btn || locked) return;
      var qEl = btn.closest(".solar-quiz-q");
      var qi = +qEl.getAttribute("data-q");
      var q = questions[qi];
      if (qEl.classList.contains("done")) return;
      qEl.classList.add("done");
      var picked = +btn.getAttribute("data-o");
      var ok = picked === q.answer;
      answered++; if (ok) correct++;
      var btns = qEl.querySelectorAll(".solar-quiz-opt");
      btns.forEach(function (b) {
        b.disabled = true;
        if (+b.getAttribute("data-o") === q.answer) b.classList.add("correct");
      });
      if (!ok) btn.classList.add("wrong");
      var fb = qEl.querySelector(".solar-feedback");
      fb.className = "solar-feedback show " + (ok ? "good" : "bad");
      fb.innerHTML = "<strong>" + (ok ? "✓ Correct." : "✗ Not quite.") + "</strong>" +
        esc(ok ? q.why : (q.wrongWhy ? q.wrongWhy + " " + q.why : q.why));
      if (answered === questions.length) {
        locked = true;
        store.recordQuiz(correct, questions.length);
        var done = document.createElement("p");
        done.className = "solar-note";
        done.innerHTML = "<strong>You got " + correct + " of " + questions.length + ".</strong> " +
          (opts.onDone ? opts.onDone(correct, questions.length) : "");
        host.appendChild(done);
        if (opts.onDone) {
          var evt = new CustomEvent("solar:quizdone", { detail: { correct: correct, total: questions.length } });
          host.dispatchEvent(evt);
        }
      }
    });
  }

  /* Mark a lesson complete and show the check on its hub card (hub reads store). */
  function completeLesson(id) { store.completeLesson(id); }

  window.SOLAR = { store: store, quiz: quiz, embedPlayer: embedPlayer, completeLesson: completeLesson, esc: esc };
})();
