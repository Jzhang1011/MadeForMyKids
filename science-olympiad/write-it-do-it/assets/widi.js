/**
 * WIDI engine — Write It Do It practice center (Science Olympiad Division B).
 * Piece geometry, SVG renderer, connection validation, model comparison,
 * and localStorage progress. No dependencies; plain JS.
 *
 * Coordinate system: grid 8x8. x = column 0..7 (A..H, left to right).
 * y = row 0..7, where y=0 is the FRONT edge (row label "1", bottom of screen).
 *
 * Piece shapes:
 *   rod:  { t:'rod', color, len (2|3|4), x, y, dir ('H'|'V') }
 *           H rod at (x,y) occupies (x..x+len-1, y). V rod occupies (x, y..y+len-1).
 *   conn: { t:'conn', kind ('straight'|'elbow'|'tee'|'cross'), rot, x, y }
 *           rot: straight -> 'NS'|'EW'; elbow -> 'NE'|'SE'|'SW'|'NW';
 *                tee -> 'N'|'E'|'S'|'W' (the side MISSING a port); cross -> 'X'.
 *
 * Connection rule (validated): every rod end must touch a connector cell whose
 * port faces the rod end. Connectors may join port-to-port. Unused ports are OK.
 */
(function () {
  "use strict";

  var GRID = 8;
  var DIRS = { N: [0, 1], E: [1, 0], S: [0, -1], W: [-1, 0] };
  var OPP = { N: "S", E: "W", S: "N", W: "E" };

  var ROD_COLORS = {
    red:    { fill: "#ef4444", dark: "#b91c1c", label: "red" },
    blue:   { fill: "#3b82f6", dark: "#1d4ed8", label: "blue" },
    yellow: { fill: "#f59e0b", dark: "#b45309", label: "yellow" },
    green:  { fill: "#22c55e", dark: "#15803d", label: "green" },
  };
  var CONN_FILL = "#1e293b";
  var CONN_PORT = "#64748b";

  var KIND_LABEL = { straight: "straight connector", elbow: "elbow connector", tee: "T connector", cross: "cross connector" };

  function ports(kind, rot) {
    if (kind === "straight") return rot === "NS" ? ["N", "S"] : ["E", "W"];
    if (kind === "elbow") return [rot[0], rot[1]]; // 'NE' -> ['N','E']
    if (kind === "tee") return ["N", "E", "S", "W"].filter(function (d) { return d !== rot; });
    if (kind === "cross") return ["N", "E", "S", "W"];
    return [];
  }

  /** All cells a piece occupies. */
  function cellsOf(p) {
    var cells = [];
    if (p.t === "rod") {
      for (var i = 0; i < p.len; i++) {
        cells.push(p.dir === "H" ? [p.x + i, p.y] : [p.x, p.y + i]);
      }
    } else {
      cells.push([p.x, p.y]);
    }
    return cells;
  }

  /** The two end cells of a rod: [nearEnd, farEnd] with outward directions. */
  function rodEnds(p) {
    if (p.dir === "H") {
      return [
        { cell: [p.x, p.y], out: "W" },
        { cell: [p.x + p.len - 1, p.y], out: "E" },
      ];
    }
    return [
      { cell: [p.x, p.y], out: "S" },
      { cell: [p.x, p.y + p.len - 1], out: "N" },
    ];
  }

  function key(x, y) { return x + "," + y; }

  function buildCellMap(model) {
    var map = {};
    model.pieces.forEach(function (p, idx) {
      cellsOf(p).forEach(function (c) {
        var k = key(c[0], c[1]);
        (map[k] = map[k] || []).push(idx);
      });
    });
    return map;
  }

  /** Validate geometry: bounds, overlaps, and the rod-end connection rule. */
  function validate(model) {
    var issues = [];
    var cellMap = buildCellMap(model);
    model.pieces.forEach(function (p, idx) {
      cellsOf(p).forEach(function (c) {
        if (c[0] < 0 || c[0] >= GRID || c[1] < 0 || c[1] >= GRID) {
          issues.push({ type: "out-of-bounds", piece: idx, message: pieceName(p) + " goes off the grid." });
        }
        var occupants = cellMap[key(c[0], c[1])] || [];
        if (occupants.length > 1) {
          issues.push({ type: "overlap", piece: idx, message: pieceName(p) + " overlaps another piece." });
        }
      });
    });
    model.pieces.forEach(function (p, idx) {
      if (p.t !== "rod") return;
      rodEnds(p).forEach(function (e) {
        var d = DIRS[e.out];
        var nx = e.cell[0] + d[0], ny = e.cell[1] + d[1];
        var found = false;
        (cellMap[key(nx, ny)] || []).forEach(function (oi) {
          var op = model.pieces[oi];
          if (op.t === "conn" && ports(op.kind, op.rot).indexOf(OPP[e.out]) !== -1) found = true;
        });
        if (!found) {
          issues.push({
            type: "floating",
            piece: idx,
            message: pieceName(p) + " has a loose end — nothing connects on its " +
              ({ N: "back", E: "right", S: "front", W: "left" }[e.out]) + " side.",
          });
        }
      });
    });
    return issues;
  }

  function pieceName(p) {
    if (p.t === "rod") {
      return "The " + p.color + " rod (" + p.len + ")";
    }
    return "The " + KIND_LABEL[p.kind];
  }

  function sig(p) {
    if (p.t === "rod") return "r:" + p.color + ":" + p.len + ":" + p.dir + ":" + p.x + "," + p.y;
    return "c:" + p.kind + ":" + p.rot + ":" + p.x + "," + p.y;
  }

  /** Compare a student build against the target. Returns accuracy + classified errors. */
  function compare(target, build) {
    var tSigs = {}, bSigs = {};
    target.pieces.forEach(function (p) { tSigs[sig(p)] = p; });
    build.pieces.forEach(function (p) { bSigs[sig(p)] = p; });

    var matched = 0, missing = [], extra = [];
    Object.keys(tSigs).forEach(function (s) {
      if (bSigs[s]) matched++;
      else missing.push(tSigs[s]);
    });
    Object.keys(bSigs).forEach(function (s) {
      if (!tSigs[s]) extra.push(bSigs[s]);
    });

    var errors = [];
    var usedExtra = {};
    // Try to explain each missing piece as a near-miss of an extra piece.
    missing.forEach(function (mp) {
      var explanation = null;
      for (var i = 0; i < extra.length; i++) {
        if (usedExtra[i]) continue;
        var ep = extra[i];
        if (ep.t !== mp.t) continue;
        if (ep.t === "rod") {
          if (ep.color === mp.color && ep.len === mp.len && ep.dir === mp.dir) {
            explanation = { type: "wrong-position", target: mp, built: ep,
              message: pieceName(mp) + " is in the wrong spot — check its position against your reference edges." };
            break;
          }
          if (ep.color === mp.color && ep.len === mp.len) {
            explanation = { type: "wrong-orientation", target: mp, built: ep,
              message: pieceName(mp) + " points the wrong way — horizontal vs. vertical mix-up." };
            break;
          }
          if (ep.len === mp.len && ep.dir === mp.dir && ep.x === mp.x && ep.y === mp.y) {
            explanation = { type: "wrong-color", target: mp, built: ep,
              message: "Right piece, wrong color where " + pieceName(mp) + " belongs." };
            break;
          }
        } else {
          if (ep.kind === mp.kind && ep.x === mp.x && ep.y === mp.y) {
            explanation = { type: "wrong-orientation", target: mp, built: ep,
              message: pieceName(mp) + " is rotated wrong — its openings face the wrong directions." };
            break;
          }
          if (ep.kind === mp.kind) {
            explanation = { type: "wrong-position", target: mp, built: ep,
              message: pieceName(mp) + " is in the wrong spot." };
            break;
          }
        }
      }
      if (explanation) { usedExtra[i] = true; errors.push(explanation); }
      else errors.push({ type: "missing-piece", target: mp, built: null,
        message: pieceName(mp) + " is missing from your build." });
    });
    extra.forEach(function (ep, i) {
      if (!usedExtra[i]) errors.push({ type: "extra-piece", target: null, built: ep,
        message: pieceName(ep) + " doesn't belong in the target — extra piece." });
    });

    var total = target.pieces.length;
    var accuracy = total ? Math.round((matched / total) * 100) : 0;
    return { accuracy: accuracy, matched: matched, total: total, errors: errors };
  }

  /* ---------------- SVG renderer ---------------- */

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  /**
   * Render a model as SVG. opts: cell (px, default 44), showGrid, labels,
   * pieceAttrs(i, piece) -> extra attributes for <g> (for click handling),
   * highlight: {cells:[[x,y]]} to outline cells, dimNonTarget.
   */
  function renderSVG(model, opts) {
    opts = opts || {};
    var cell = opts.cell || 44;
    var pad = opts.labels === false ? 6 : 26;
    var W = GRID * cell + pad * 2, H = GRID * cell + pad * 2;
    var ox = pad, oy = pad; // svg coords of grid cell (0,7) top-left
    function X(c) { return ox + c * cell; }
    function Y(r) { return oy + (GRID - 1 - r) * cell; } // r=0 (front) at bottom

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="widi-svg" role="img" aria-label="Structure diagram">';
    // grid
    if (opts.showGrid !== false) {
      s += '<g class="widi-grid">';
      for (var c = 0; c <= GRID; c++) {
        s += '<line x1="' + X(c) + '" y1="' + Y(7) + '" x2="' + X(c) + '" y2="' + (Y(0) + cell) + '"/>';
      }
      for (var r = 0; r <= GRID; r++) {
        var yy = oy + r * cell;
        s += '<line x1="' + X(0) + '" y1="' + yy + '" x2="' + (X(7) + cell) + '" y2="' + yy + '"/>';
      }
      s += "</g>";
      if (opts.labels !== false) {
        s += '<g class="widi-labels">';
        for (var cc = 0; cc < GRID; cc++) {
          s += '<text x="' + (X(cc) + cell / 2) + '" y="' + (Y(0) + cell + 17) + '">' + "ABCDEFGH"[cc] + "</text>";
        }
        for (var rr = 0; rr < GRID; rr++) {
          s += '<text x="' + (X(0) - 10) + '" y="' + (Y(rr) + cell / 2 + 4) + '">' + (rr + 1) + "</text>";
        }
        s += "</g>";
        // FRONT edge marker
        s += '<text x="' + (X(0) + GRID * cell / 2) + '" y="' + (H - 4) + '" class="widi-front">FRONT</text>';
      }
    }
    // pieces
    model.pieces.forEach(function (p, i) {
      var attrs = opts.pieceAttrs ? opts.pieceAttrs(i, p) : "";
      s += '<g class="widi-piece" ' + attrs + ">";
      if (p.t === "rod") {
        var col = ROD_COLORS[p.color] || ROD_COLORS.red;
        var rx = X(p.x), ry = p.dir === "H" ? Y(p.y) : Y(p.y + p.len - 1);
        var rw = p.dir === "H" ? p.len * cell : cell;
        var rh = p.dir === "H" ? cell : p.len * cell;
        var m = 5;
        s += '<rect x="' + (rx + m) + '" y="' + (ry + m) + '" width="' + (rw - 2 * m) + '" height="' + (rh - 2 * m) +
          '" rx="9" fill="' + col.fill + '" stroke="' + col.dark + '" stroke-width="2.5"/>';
        // end caps
        var capR = 4;
        if (p.dir === "H") {
          s += '<circle cx="' + (rx + m + 8) + '" cy="' + (ry + cell / 2) + '" r="' + capR + '" fill="' + col.dark + '"/>';
          s += '<circle cx="' + (rx + rw - m - 8) + '" cy="' + (ry + cell / 2) + '" r="' + capR + '" fill="' + col.dark + '"/>';
        } else {
          s += '<circle cx="' + (rx + cell / 2) + '" cy="' + (ry + m + 8) + '" r="' + capR + '" fill="' + col.dark + '"/>';
          s += '<circle cx="' + (rx + cell / 2) + '" cy="' + (ry + rh - m - 8) + '" r="' + capR + '" fill="' + col.dark + '"/>';
        }
      } else {
        var cx = X(p.x) + cell / 2, cy = Y(p.y) + cell / 2;
        var ps = ports(p.kind, p.rot);
        ps.forEach(function (d) {
          var dd = DIRS[d];
          // port nub: small rect from center toward the port side
          var nx = cx + dd[0] * cell * 0.32, ny = cy - dd[1] * cell * 0.32;
          s += '<rect x="' + (nx - 7) + '" y="' + (ny - 7) + '" width="14" height="14" rx="4" fill="' + CONN_PORT + '"/>';
        });
        s += '<rect x="' + (cx - 13) + '" y="' + (cy - 13) + '" width="26" height="26" rx="7" fill="' + CONN_FILL + '"/>';
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="#0f172a"/>';
      }
      s += "</g>";
    });
    // cell highlights (for spot-the-difference reveals etc.)
    (opts.highlightCells || []).forEach(function (hc) {
      s += '<rect x="' + X(hc[0]) + '" y="' + Y(hc[1]) + '" width="' + cell + '" height="' + cell +
        '" fill="none" stroke="#dc2626" stroke-width="3" rx="6"/>';
    });
    s += "</svg>";
    return s;
  }

  /* ---------------- progress storage ---------------- */

  var LS_KEY = "mfk_widi_progress_v1";
  var store = {
    load: function () {
      try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
      catch (e) { return {}; }
    },
    save: function (d) { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch (e) {} },
    reset: function () { try { localStorage.removeItem(LS_KEY); } catch (e) {} },
    recordBuild: function (id, accuracy, errors) {
      var d = store.load();
      d.builds = d.builds || {};
      var prev = d.builds[id] || { attempts: 0, best: 0, errors: {} };
      prev.attempts++;
      prev.best = Math.max(prev.best, accuracy);
      prev.last = Date.now();
      (errors || []).forEach(function (e) {
        prev.errors[e.type] = (prev.errors[e.type] || 0) + 1;
      });
      d.builds[id] = prev;
      store.save(d);
    },
    recordWriting: function (id) {
      var d = store.load();
      d.writing = d.writing || {};
      d.writing[id] = { saved: Date.now() };
      store.save(d);
    },
    recordObserve: function (activityId, correct) {
      var d = store.load();
      d.observe = d.observe || {};
      var o = d.observe[activityId] || { attempts: 0, correct: 0 };
      o.attempts++; if (correct) o.correct++;
      d.observe[activityId] = o;
      store.save(d);
    },
    recordLesson: function (id) {
      var d = store.load();
      d.lessons = d.lessons || {};
      if (!d.lessons[id]) d.lessons[id] = { done: Date.now() };
      store.save(d);
    },
    recordVisit: function (page) {
      var d = store.load();
      d.lastVisit = { page: page, at: Date.now() };
      store.save(d);
    },
    summary: function () {
      var d = store.load();
      var builds = d.builds || {};
      var ids = Object.keys(builds);
      var completed = ids.length;
      var latest = null, latestAcc = null;
      var errCounts = {};
      ids.forEach(function (id) {
        var b = builds[id];
        if (!latest || b.last > latest) { latest = b.last; latestAcc = b.best; }
        Object.keys(b.errors || {}).forEach(function (t) { errCounts[t] = (errCounts[t] || 0) + b.errors[t]; });
      });
      var topErr = null, topN = 0;
      Object.keys(errCounts).forEach(function (t) { if (errCounts[t] > topN) { topN = errCounts[t]; topErr = t; } });
      var lessons = (d.lessons && Object.keys(d.lessons).length) || 0;
      return { completed: completed, latestAccuracy: latestAcc, topError: topErr, builds: builds, lessons: lessons, lessonIds: (d.lessons || {}), lastVisit: d.lastVisit || null, observe: d.observe || {} };
    },
  };

  var ERROR_LABEL = {
    "missing-piece": "Missing piece",
    "extra-piece": "Extra piece",
    "wrong-position": "Wrong position",
    "wrong-orientation": "Wrong orientation",
    "wrong-color": "Wrong color or size",
    "floating": "Loose connection",
    "overlap": "Overlapping pieces",
    "out-of-bounds": "Off the grid",
  };

  var ERROR_TIP = {
    "missing-piece": "Re-read your instructions step by step and count pieces as you go — most missing pieces were never mentioned.",
    "extra-piece": "Check your piece inventory first. Builders add extras when the inventory or the stopping point is unclear.",
    "wrong-position": "Anchor every piece to a named reference edge (front, back, left, right) plus a distance. \u201cNear the middle\u201d is not a position.",
    "wrong-orientation": "State horizontal vs. vertical for every rod, and which way each connector opening faces.",
    "wrong-color": "Name the color of every single piece, every time — even when it feels obvious.",
    "floating": "Every rod end must plug into a connector opening. Trace each rod from end to end in your instructions.",
    "overlap": "Two pieces can't share a square. Walk through the build order and check each placement.",
    "out-of-bounds": "Keep all pieces inside the 8\u00d78 grid in your description.",
  };

  window.WIDI = {
    GRID: GRID,
    ROD_COLORS: ROD_COLORS,
    KIND_LABEL: KIND_LABEL,
    ports: ports,
    cellsOf: cellsOf,
    validate: validate,
    compare: compare,
    renderSVG: renderSVG,
    pieceName: pieceName,
    store: store,
    ERROR_LABEL: ERROR_LABEL,
    ERROR_TIP: ERROR_TIP,
    /* Lesson template framing: optional video intro up top, review + next-lesson footer.
       Call as WIDI.lessonFrame({ n, title, videoId, practiceId, reviewQ, strategyTip, nextHref, nextLabel }).
       Videos are optional — a "skip to practice" link is always shown. */
    lessonFrame: function (o) {
      function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
      var watch = document.getElementById("lesson-watch");
      var review = document.getElementById("lesson-review");
      function render(video) {
        if (watch) {
          var vHtml = "";
          if (video && video.url) {
            vHtml = '<div class="widi-video-card" style="margin-bottom:0.8rem">' +
              '<h3>🎬 ' + esc(video.title) + '</h3>' +
              '<div class="widi-video-meta"><span>' + esc(video.source) + "</span>" +
              (video.duration ? "<span>⏱ " + esc(video.duration) + "</span>" : "") +
              (video.captions ? "<span>💬 Captions</span>" : "") + "</div>" +
              '<p class="widi-note" style="margin:0"><strong>Watch for:</strong> ' + esc(video.watchFor || "") + "</p>" +
              '<div style="display:flex;gap:0.5rem;flex-wrap:wrap">' +
              '<a class="widi-toolbtn primary" href="' + esc(video.url) + '" target="_blank" rel="noopener" style="text-decoration:none">▶ Watch</a>' +
              (o.practiceId ? '<a class="widi-toolbtn" href="#' + o.practiceId + '" style="text-decoration:none">Skip to practice ↓</a>' : "") +
              "</div></div>";
          } else if (o.practiceId) {
            vHtml = '<p><a class="widi-btn ghost" href="#' + o.practiceId + '">Skip to practice ↓</a></p>';
          }
          watch.innerHTML = '<p class="widi-section-sub" style="margin-top:0"><strong>Lesson ' + o.n + ":</strong> " + esc(o.title) + ' <span class="widi-note">— video optional</span></p>' + vHtml;
        }
        if (review) {
          review.innerHTML = '<div class="widi-panel" style="background:var(--mfk-tint)">' +
            "<h2>Review &amp; next step</h2>" +
            '<p class="widi-note"><strong>Strategy reminder:</strong> ' + esc(o.strategyTip || "") + "</p>" +
            '<p class="widi-note"><strong>Check yourself:</strong> ' + esc(o.reviewQ || "") + "</p>" +
            (o.nextHref ? '<a class="widi-btn primary" href="' + o.nextHref + '">' + esc(o.nextLabel || "Next lesson") + " →</a>" : "") +
            "</div>";
        }
      }
      if (o.videoId) {
        fetch("data/videos.json").then(function (r) { return r.json(); }).then(function (data) {
          var v = (data.resources || []).filter(function (x) { return x.id === o.videoId && x.url; })[0];
          render(v || null);
        }).catch(function () { render(null); });
      } else { render(null); }
    },
  };
})();
