/* Shared point math for Geometry Transformations.
   All transforms are about the origin, except reflections, which name
   their line. Answers in the playground are computed here, not looked up. */
(function () {
  "use strict";
  function fmt(n) {
    // Avoid -0 and long decimals from 0.5 steps.
    var v = Math.round(n * 100) / 100;
    return (v === 0 ? 0 : v);
  }
  function pt(x, y) { return { x: fmt(x), y: fmt(y) }; }
  function show(p) { return "(" + p.x + ", " + p.y + ")"; }
  function translate(p, a, b) { return pt(p.x + a, p.y + b); }
  function reflect(p, line) {
    if (line === "x-axis") return pt(p.x, -p.y);
    if (line === "y-axis") return pt(-p.x, p.y);
    if (line === "y=x") return pt(p.y, p.x);
    if (line === "y=-x") return pt(-p.y, -p.x);
    return pt(p.x, p.y);
  }
  function rotate(p, kind) {
    if (kind === "90cw") return pt(p.y, -p.x);
    if (kind === "90ccw") return pt(-p.y, p.x);
    if (kind === "180") return pt(-p.x, -p.y);
    if (kind === "270cw") return pt(-p.y, p.x);
    return pt(p.x, p.y);
  }
  function dilate(p, k) { return pt(p.x * k, p.y * k); }
  function apply(type, params, p) {
    if (type === "translation") return translate(p, params.a, params.b);
    if (type === "reflection") return reflect(p, params.line);
    if (type === "rotation") return rotate(p, params.kind);
    if (type === "dilation") return dilate(p, params.k);
    return pt(p.x, p.y);
  }
  function ruleText(type, params) {
    if (type === "translation") return "(x, y) → (x + " + params.a + ", y + " + params.b + ")";
    if (type === "reflection") {
      if (params.line === "x-axis") return "(x, y) → (x, −y)";
      if (params.line === "y-axis") return "(x, y) → (−x, y)";
      if (params.line === "y=x") return "(x, y) → (y, x)";
      if (params.line === "y=-x") return "(x, y) → (−y, −x)";
    }
    if (type === "rotation") {
      if (params.kind === "90cw") return "(x, y) → (y, −x)  — 90° clockwise";
      if (params.kind === "90ccw") return "(x, y) → (−y, x)  — 90° counterclockwise";
      if (params.kind === "180") return "(x, y) → (−x, −y)  — 180°";
      if (params.kind === "270cw") return "(x, y) → (−y, x)  — 270° clockwise (= 90° counterclockwise)";
    }
    if (type === "dilation") return "(x, y) → (" + params.k + "x, " + params.k + "y)";
    return "";
  }
  function loadData() {
    return fetch("data/transformations.json").then(function (r) {
      if (!r.ok) throw new Error("transformations.json " + r.status);
      return r.json();
    });
  }
  window.Transforms = {
    fmt: fmt, pt: pt, show: show,
    translate: translate, reflect: reflect, rotate: rotate, dilate: dilate,
    apply: apply, ruleText: ruleText, loadData: loadData
  };
})();
