const STATIONS = {
  3: [
    { id: "kernel_stretch", name: "Kernel Stretch", emoji: "🌱", muscle: "sensory_details", blurb: "Where, how, why.", ladder: ["Idea", "Where", "How", "Why", "Read-aloud"] },
    { id: "verb_swap", name: "Verb Swap", emoji: "🔧", muscle: "vocabulary", blurb: "Evict sleepy verbs.", ladder: ["Find it", "Swap it", "Prove it", "Read it", "Stamp"] },
    { id: "sense_addon", name: "Sense Add-On", emoji: "👂", muscle: "sensory_details", blurb: "See, hear, feel.", ladder: ["Sight", "Sound", "Feel", "Cut 'fun'", "Stamp"] },
    { id: "glue_shop", name: "Glue Shop", emoji: "🧩", muscle: "sentence_variety", blurb: "Combine choppy lines.", ladder: ["Spot repeats", "Pick glue", "Combine", "Trim", "Stamp"] },
    { id: "copycat", name: "Copycat", emoji: "🔍", muscle: "voice", blurb: "Steal one move.", ladder: ["Notice", "Name", "Steal", "Check", "Stamp"] },
    { id: "tiny_tale", name: "Tiny Tale", emoji: "📘", muscle: "organization", blurb: "Four-sentence story.", ladder: ["Place", "Trouble", "Reaction", "Snap", "Stamp"] }
  ],
  7: [
    { id: "claim_lock", name: "Claim Lock", emoji: "🎯", muscle: "organization", blurb: "One arguable sentence.", ladder: ["Side", "No padding", "Test", "Sharpen", "Stamp"] },
    { id: "evidence_drop", name: "Evidence Drop", emoji: "📌", muscle: "evidence", blurb: "A scene or a number.", ladder: ["Keep claim", "Drop proof", "Cut fog", "Read", "Stamp"] },
    { id: "because_bridge", name: "Because-Bridge", emoji: "🌉", muscle: "explanation", blurb: "How the proof works.", ladder: ["Mechanism", "Link", "Not a remix", "Read", "Stamp"] },
    { id: "counterpunch", name: "Counterpunch", emoji: "🥊", muscle: "counterargument", blurb: "Fair, then return.", ladder: ["Steel-man", "Limit", "Return", "Tone check", "Stamp"] },
    { id: "zombie_voice", name: "Zombie Voice", emoji: "🧟", muscle: "voice", blurb: "Actor first.", ladder: ["Find actor", "Active verb", "Cut fog", "Read", "Stamp"] },
    { id: "cadence_copy", name: "Cadence Copy", emoji: "🥁", muscle: "sentence_variety", blurb: "Short / long / short.", ladder: ["Count", "Map", "Write", "Hear it", "Stamp"] },
    { id: "assertion_audit", name: "Assertion Audit", emoji: "🔎", muscle: "explanation", blurb: "Fix a shout.", ladder: ["Spot fog", "Shrink", "Rebuild", "Skeptic test", "Stamp"] }
  ]
};

const PATTERNS = [
  { grade: "3+", name: "Show the feeling", rule: "Body first, adjective never.", example: "My ears burned while the class waited." },
  { grade: "3+", name: "Where + how + why", rule: "Plant feet, then motive.", example: "The puppy bolted across the lawn because he stole a shoe." },
  { grade: "3+", name: "Glue with when/because", rule: "Two baby sentences become one.", example: "When the tower fell, I yelled and he laughed." },
  { grade: "3+", name: "Zoom in", rule: "Wide shot, then one tiny object.", example: "Empty gym. Then a red whistle in the dust." },
  { grade: "7", name: "Claim without I think", rule: "Institution + should + policy.", example: "Middle school should start later in the morning." },
  { grade: "7", name: "Evidence you can point at", rule: "Number, scene, or named case.", example: "Students unlocked phones about 11 times per period." },
  { grade: "7", name: "Because-bridge", rule: "Name the hidden process.", example: "Each unlock resets working memory, so the lesson restarts." },
  { grade: "7", name: "Fair counter", rule: "While + real worry + still.", example: "While bus routes get messy, biology still wins first period." }
];

const MUSCLE_LABELS = {
  sensory_details: "Ideas & senses",
  vocabulary: "Power verbs",
  sentence_variety: "Sentence variety",
  organization: "Organization",
  evidence: "Evidence",
  explanation: "Explanation",
  counterargument: "Counterpunch",
  voice: "Voice"
};

let BANK = [];
let currentGrade = 3;
let currentStation = "kernel_stretch";
let pack = [];
let packIndex = 0;
let selectedMove = null;
let soundOn = (localStorage.getItem("wg-sound") || "on") === "on";
let audioCtx = null;

const session = {
  reps: 0, stamps: 0, combo: 0, bestCombo: 0, bestText: "",
  startedAt: Date.now(),
  muscles: Object.fromEntries(Object.keys(MUSCLE_LABELS).map(k => [k, 0])),
  passedIds: new Set()
};

let timerTotalSeconds = 8 * 60;
let timerInterval = null;
let isTimerRunning = false;
let celebrateArmed = true;

function $(id) { return document.getElementById(id); }
function currentWorkout() { return pack[packIndex] || null; }
function stationMeta() {
  return (STATIONS[currentGrade] || []).find(s => s.id === currentStation) || STATIONS[currentGrade][0];
}
function wordCount(text) { return (text.trim().match(/\b[\w'-]+\b/g) || []).length; }
function sentenceCount(text) { return text.trim() ? text.split(/[.!?]+/).filter(s => s.trim()).length : 0; }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function beep(freq, dur, type, gainVal, delay) {
  if (!soundOn) return;
  try {
    const ctx = ensureAudio();
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainVal || 0.08, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  } catch (e) {}
}
function playStampSound() {
  beep(523, 0.12, "triangle", 0.07, 0);
  beep(659, 0.12, "triangle", 0.07, 0.09);
  beep(784, 0.18, "triangle", 0.08, 0.18);
}
function playFanfare() {
  [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.22, "square", 0.05, i * 0.12));
  beep(784, 0.35, "triangle", 0.06, 0.52);
}
function playNudge() { beep(392, 0.1, "sine", 0.05, 0); beep(330, 0.14, "sine", 0.05, 0.1); }
function playTick() { beep(880, 0.04, "sine", 0.03, 0); }

function toggleSound() {
  soundOn = !soundOn;
  localStorage.setItem("wg-sound", soundOn ? "on" : "off");
  syncSoundBtn();
  if (soundOn) playStampSound();
}
function syncSoundBtn() {
  $("btn-sound").textContent = soundOn ? "🔊 Sound" : "🔇 Muted";
}

function burstConfetti(n) {
  const canvas = $("confetti-canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = innerWidth; canvas.height = innerHeight;
  const bits = Array.from({ length: n || 80 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 80,
    r: 3 + Math.random() * 5,
    vx: -2 + Math.random() * 4,
    vy: 3 + Math.random() * 4,
    rot: Math.random() * 6,
    vr: -0.2 + Math.random() * 0.4,
    color: ["#FF6B4A", "#FFA726", "#2EC4B6", "#334155", "#F59E0B"][Math.floor(Math.random() * 5)]
  }));
  let frames = 0;
  (function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bits.forEach(b => {
      b.x += b.vx; b.y += b.vy; b.rot += b.vr; b.vy += 0.04;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
      ctx.fillStyle = b.color; ctx.fillRect(-b.r, -b.r / 2, b.r * 2, b.r);
      ctx.restore();
    });
    frames++;
    if (frames < 90) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
}

function loadBank() {
  BANK = Array.isArray(window.WRITING_GYM_BANK) ? window.WRITING_GYM_BANK : [];
}

function refreshPack() {
  pack = BANK.filter(x => x.grade === currentGrade && x.station === currentStation);
  if (!pack.length) pack = BANK.filter(x => x.grade === currentGrade);
  packIndex = 0;
  $("bank-meta").textContent = BANK.length
    ? BANK.filter(x => x.grade === currentGrade).length + " workouts in Grade " + currentGrade + " · " + pack.length + " in this station"
    : "Workout bank missing — keep exercises-bank.js next to this page.";
}

function switchGrade(grade) {
  currentGrade = grade;
  currentStation = STATIONS[grade][0].id;
  const b3 = $("btn-grade-3"), b7 = $("btn-grade-7"), badge = $("grade-badge");
  if (grade === 3) {
    b3.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm bg-white text-orange-600";
    b7.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold text-stone-600 hover:text-stone-900";
    badge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-700";
    badge.textContent = "Grade 3: Story Builder";
  } else {
    b7.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm bg-slate-900 text-white";
    b3.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold text-stone-600 hover:text-stone-900";
    badge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700";
    badge.textContent = "Grade 7: Writer's Studio";
  }
  renderStationRail();
  refreshPack();
  loadCurrentWorkout();
}

function renderStationRail() {
  $("station-rail").innerHTML = STATIONS[currentGrade].map(s => {
    const n = BANK.filter(x => x.grade === currentGrade && x.station === s.id).length;
    const on = s.id === currentStation;
    return '<button onclick="selectStation(\'' + s.id + '\')" class="px-3 py-2 rounded-xl text-left border ' +
      (on ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400') +
      '"><div class="text-xs font-bold">' + s.emoji + ' ' + s.name + ' <span class="opacity-70 font-mono">' + n +
      '</span></div><div class="text-[10px] ' + (on ? 'text-stone-300' : 'text-stone-400') + '">' + s.blurb + '</div></button>';
  }).join("");
}

function selectStation(id) {
  currentStation = id;
  renderStationRail();
  refreshPack();
  loadCurrentWorkout();
  clearEditor();
}
function randomStation() {
  const list = STATIONS[currentGrade];
  selectStation(list[Math.floor(Math.random() * list.length)].id);
}
function prevRep() {
  if (!pack.length) return;
  packIndex = (packIndex - 1 + pack.length) % pack.length;
  loadCurrentWorkout(); clearEditor();
}
function nextRep(autoStart) {
  if (!pack.length) return;
  packIndex = (packIndex + 1) % pack.length;
  loadCurrentWorkout(); clearEditor();
  if (autoStart && !isTimerRunning) toggleTimer();
}
function randomRep() {
  if (pack.length < 2) return nextRep();
  let n = packIndex;
  while (n === packIndex) n = Math.floor(Math.random() * pack.length);
  packIndex = n;
  loadCurrentWorkout(); clearEditor();
}

function renderLadder(activeStep) {
  const steps = stationMeta().ladder;
  $("ladder-steps-container").innerHTML = steps.map((name, i) => {
    let cls = "bg-stone-100 text-stone-400 border-stone-200";
    if (i < activeStep) cls = "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold";
    if (i === activeStep) cls = "bg-orange-50 text-orange-700 border-orange-400 ring-2 ring-orange-400/30 font-bold";
    return '<div class="p-2 rounded-xl border ' + cls + ' text-[11px] sm:text-xs">' + (i + 1) + '. ' + name + '</div>';
  }).join("");
  $("ladder-status-text").textContent = "Station: " + stationMeta().name + " · Step " + Math.min(activeStep + 1, steps.length) + " of " + steps.length;
}

function loadCurrentWorkout() {
  const w = currentWorkout();
  if (!w) {
    $("workout-headline").textContent = "No workouts loaded";
    $("workout-subheadline").textContent = "Keep exercises-bank.js next to this page.";
    return;
  }
  selectedMove = null;
  $("workout-headline").textContent = w.title;
  $("workout-subheadline").textContent = w.funHook || stationMeta().blurb;
  $("exercise-id-chip").textContent = "#" + w.id;
  $("skill-target-badge").textContent = "Muscle: " + (MUSCLE_LABELS[w.targetSkill] || w.targetSkill);
  $("rep-badge").textContent = "Rep " + (packIndex + 1) + " / " + pack.length;
  $("prompt-base-text").textContent = w.prompt;
  $("prompt-kicker").textContent = (currentGrade === 7 && w.station !== "zombie_voice" && w.station !== "cadence_copy") ? "Prompt" : "Starter";

  $("scaffold-questions-list").innerHTML = (w.scaffolding || []).map((step, i) =>
    '<div class="p-2.5 rounded-xl bg-stone-50 border border-stone-100 flex items-start space-x-2.5">' +
    '<span class="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">' + (i + 1) + '</span>' +
    '<div class="text-xs"><strong class="text-slate-800">' + escapeHtml(step.label) + ':</strong>' +
    '<span class="text-stone-600"> ' + escapeHtml(step.question || "") + '</span></div></div>'
  ).join("");

  const mt = w.modelTechnique || { quote: "", note: "", moves: [] };
  $("technique-model-text").textContent = mt.quote ? "“" + mt.quote + "”" : "Mentor sentence missing — check the JSON.";
  $("technique-explanation").innerHTML = "<strong>The move:</strong> " + escapeHtml(mt.note || "Look at how the writer built this.");
  $("imitate-kernel").textContent = (w.imitateKernel && w.imitateKernel !== w.prompt)
    ? "“" + w.imitateKernel + "”"
    : "Use a new noun. Keep the move.";

  $("technique-moves").innerHTML = (mt.moves || []).map((m, i) =>
    '<button onclick="selectMove(' + i + ')" class="move-chip px-2 py-1 text-[11px] rounded-lg border border-indigo-200 bg-white text-indigo-900 font-medium">' +
    escapeHtml(m.label) + ': <em>' + escapeHtml(m.text) + '</em></button>'
  ).join("") || '<span class="text-[11px] text-indigo-500">Read the mentor first, then tap a move.</span>';

  const words = (w.powerWords && w.powerWords.length) ? w.powerWords : ["because", "when", "suddenly"];
  $("power-word-row").innerHTML = words.slice(0, 5).map(wd =>
    '<button onclick=\'insertPowerWord(' + JSON.stringify(wd) + ')\' class="px-2.5 py-1 text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-medium">+ ' +
    escapeHtml(wd) + '</button>'
  ).join("");

  renderLadder(1);
  resetFeedbackUI();
}

function selectMove(i) {
  const w = currentWorkout();
  const mv = (w.modelTechnique.moves || [])[i];
  if (!mv) return;
  selectedMove = mv;
  [...document.querySelectorAll(".move-chip")].forEach((el, idx) => el.classList.toggle("active", idx === i));
  $("technique-explanation").innerHTML = "<strong>You named:</strong> " + escapeHtml(mv.label) + " — <em>" + escapeHtml(mv.text) + "</em>. Now steal that job, not those exact words.";
  playTick();
}

function speakMentor() {
  const w = currentWorkout();
  if (!w || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(w.modelTechnique.quote);
  u.rate = 0.95; u.pitch = currentGrade === 3 ? 1.05 : 1;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

const editorEl = $("editor-input");
editorEl.addEventListener("input", updateLiveStats);
editorEl.addEventListener("focus", () => { if (!isTimerRunning) toggleTimer(); });

function updateLiveStats() {
  const text = editorEl.value;
  $("stat-words").textContent = wordCount(text);
  $("stat-sentences").textContent = sentenceCount(text);
  const autosave = $("autosave-indicator");
  autosave.textContent = "Writing saved";
  autosave.className = "text-[11px] text-emerald-600 font-medium";
  clearTimeout(window._saveTimer);
  window._saveTimer = setTimeout(() => {
    autosave.textContent = "Saved on this device";
    autosave.className = "text-[11px] text-stone-400";
  }, 1200);
}
function clearEditor() {
  editorEl.value = "";
  updateLiveStats();
  resetFeedbackUI();
}
function insertPowerWord(word) {
  const text = editorEl.value;
  if (!text.endsWith(" ") && text.length) editorEl.value += " ";
  editorEl.value += word + " ";
  editorEl.focus();
  updateLiveStats();
}

function evaluateWorkout() {
  const text = editorEl.value.trim();
  const w = currentWorkout();
  if (!w) return;
  if (!text) {
    editorEl.classList.add("shake-lite");
    setTimeout(() => editorEl.classList.remove("shake-lite"), 400);
    return;
  }
  const rules = w.localEvaluationRules || {};
  const wc = wordCount(text);
  const sc = sentenceCount(text);
  const low = text.toLowerCase();

  const mechanics = [];
  if (!/^[A-Z"']/.test(text)) mechanics.push({ pass: false, text: "Start with a capital letter." });
  else mechanics.push({ pass: true, text: "Capitalized opening." });
  if (!/[.!?]"?$/.test(text)) mechanics.push({ pass: false, text: "End with . ! or ?" });
  else mechanics.push({ pass: true, text: "Closing punctuation is in." });

  const style = [];
  let musclePass = true;

  if (rules.minWordCount && wc < rules.minWordCount) {
    style.push({ pass: false, text: "Stretch to about " + rules.minWordCount + " words (now " + wc + ")." });
    musclePass = false;
  }
  if (rules.minSentences && sc < rules.minSentences) {
    style.push({ pass: false, text: "This station wants at least " + rules.minSentences + " sentences." });
    musclePass = false;
  }
  if (rules.maxSentences && sc > rules.maxSentences) {
    style.push({ pass: false, text: "Too many stop signs. Glue it down to " + rules.maxSentences + " sentences." });
    musclePass = false;
  }

  const bannedHit = (rules.bannedWords || []).filter(b => low.includes(b.toLowerCase()));
  if (bannedHit.length) {
    style.push({ pass: false, text: "Sleepy leftovers: “" + bannedHit.join("”, “") + "”. Swap or cut." });
    if (w.station === "verb_swap" || w.station === "assertion_audit" || w.station === "zombie_voice") musclePass = false;
  }

  if (rules.weakVerbTarget) {
    const escaped = rules.weakVerbTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp("\\b" + escaped + "\\b", "i").test(text)) {
      style.push({ pass: false, text: "The weak verb “" + rules.weakVerbTarget + "” is still in the sentence." });
      musclePass = false;
    }
  }

  const must = rules.mustIncludeAny || [];
  if (must.length && !must.some(k => low.includes(k.toLowerCase()))) {
    style.push({ pass: false, text: "Plant at least one of: " + must.slice(0, 4).join(", ") + "." });
    musclePass = false;
  }

  const suggested = rules.suggestedKeywords || [];
  const suggestedHit = suggested.filter(k => low.includes(k.toLowerCase()));
  if (suggested.length && suggestedHit.length) {
    style.push({ pass: true, text: "Muscle words landed: " + suggestedHit.slice(0, 3).join(", ") + "." });
  } else if (rules.requiresConnector && suggested.length) {
    style.push({ pass: false, text: "Try glue/power words like " + suggested.slice(0, 3).join(", ") + "." });
    musclePass = false;
  }

  if (w.station === "copycat" || w.station === "cadence_copy") {
    const quote = (w.modelTechnique.quote || "").toLowerCase();
    const copied = quote && low.includes(quote.slice(0, Math.min(28, quote.length)));
    if (copied) {
      style.push({ pass: false, text: "That's photocopy, not steal. New nouns. Same move." });
      musclePass = false;
    } else if (selectedMove) {
      style.push({ pass: true, text: "You tagged the move “" + selectedMove.label + ".” Make sure the sentence does that job." });
    } else {
      style.push({ pass: false, text: "Tap a glowing move in Steal the Technique first so we know what you stole." });
    }
  }

  if (w.station === "claim_lock" && /\bi think\b|\bin my opinion\b|\bpersonally\b/i.test(text)) {
    style.push({ pass: false, text: "Drop I think / in my opinion. Claims don't need a permission slip." });
    musclePass = false;
  }

  if (musclePass) style.push({ pass: true, text: "The station muscle is doing real work." });

  $("feedback-empty").classList.add("hidden");
  $("feedback-content").classList.remove("hidden");
  $("layer-mechanics-list").innerHTML = mechanics.map(it =>
    '<div class="flex gap-2 ' + (it.pass ? "text-emerald-700" : "text-amber-700 font-medium") + '"><span>' + (it.pass ? "✓" : "⚠️") + '</span><span>' + it.text + '</span></div>'
  ).join("");
  $("layer-style-list").innerHTML = style.map(it =>
    '<div class="flex gap-2 ' + (it.pass ? "text-emerald-700" : "text-rose-700") + '"><span>' + (it.pass ? "✓" : "•") + '</span><span>' + it.text + '</span></div>'
  ).join("");

  const hints = w.fallbackHints || [];
  const hint = hints[Math.floor(Math.random() * hints.length)] || "Add one exact place or reason.";
  $("coach-message-text").innerHTML = musclePass
    ? "<strong>Stamp moment:</strong> " + (w.celebrationLine || "That lift counts.") + " Bonus: change one noun and check again."
    : "<strong>One muscle still sleeping:</strong> " + hint;

  session.reps += 1;
  $("session-reps").textContent = session.reps;

  if (musclePass) {
    session.combo += 1;
    session.bestCombo = Math.max(session.bestCombo, session.combo);
    session.stamps += 1;
    session.muscles[w.targetSkill] = Math.min(100, (session.muscles[w.targetSkill] || 0) + 8);
    session.passedIds.add(w.id);
    if (wc >= wordCount(session.bestText)) session.bestText = text;
    $("feedback-badge").textContent = "Muscle passed";
    $("feedback-badge").className = "text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800";
    renderLadder(stationMeta().ladder.length - 1);
    playStampSound();
    burstConfetti(36);
    updateHud();
    if (session.combo === 3 || session.combo === 5 || session.stamps === 1 || session.stamps % 5 === 0) {
      openCelebrate("rep");
    }
  } else {
    session.combo = 0;
    $("feedback-badge").textContent = "Keep lifting";
    $("feedback-badge").className = "text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800";
    playNudge();
    updateHud();
  }
}

function resetFeedbackUI() {
  $("feedback-empty").classList.remove("hidden");
  $("feedback-content").classList.add("hidden");
  $("feedback-badge").textContent = "Awaiting lift";
  $("feedback-badge").className = "text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600";
}

function saveRevisionSnapshot() {
  if (!editorEl.value.trim()) return;
  session.bestText = editorEl.value.trim();
  playTick();
}

function updateHud() {
  $("stamp-count").textContent = session.stamps;
  $("combo-count").textContent = session.combo;
  const mins = Math.max(0, Math.round((Date.now() - session.startedAt) / 60000));
  $("session-time").textContent = mins + " min";
}

function renderMuscles() {
  $("muscle-bars").innerHTML = Object.entries(MUSCLE_LABELS).map(([k, label]) => {
    const v = session.muscles[k] || 0;
    const color = v >= 70 ? "bg-emerald-500" : v >= 35 ? "bg-amber-500" : "bg-rose-400";
    const tone = v >= 70 ? "text-emerald-700" : v >= 35 ? "text-amber-700" : "text-rose-700";
    return '<div><div class="flex justify-between text-xs font-semibold mb-1"><span class="' + tone + '">' + label +
      '</span><span class="text-stone-600">' + v + '%</span></div><div class="w-full bg-stone-100 rounded-full h-2.5"><div class="' +
      color + ' h-2.5 rounded-full" style="width:' + v + '%"></div></div></div>';
  }).join("");
}

function openCelebrate(reason) {
  const w = currentWorkout();
  $("modal-celebrate").classList.remove("hidden");
  $("modal-celebrate").classList.add("flex");
  $("celebrate-stamp").classList.remove("stamp-pop");
  void $("celebrate-stamp").offsetWidth;
  $("celebrate-stamp").classList.add("stamp-pop");
  if (reason === "timer") {
    $("celebrate-kicker").textContent = "Timer bell";
    $("celebrate-title").textContent = session.stamps ? "Set complete." : "Warm-up complete.";
    $("celebrate-body").textContent = session.stamps
      ? "Eight minutes. Real reps. That is a workout."
      : "Time's up — try one lift before you hang up the gloves.";
  } else {
    $("celebrate-kicker").textContent = session.combo >= 5 ? "On fire" : "Rep stamped";
    $("celebrate-title").textContent = w ? (w.celebrationLine || "Muscle earned.") : "Muscle earned.";
    $("celebrate-body").textContent = stationMeta().name + " · combo ×" + session.combo;
  }
  $("cele-reps").textContent = session.reps;
  $("cele-stamps").textContent = session.stamps;
  $("cele-combo").textContent = session.bestCombo;
  $("cele-best").textContent = session.bestText ? "“" + session.bestText + "”" : "Write one more sentence to pin a victory lap.";
  playFanfare();
  burstConfetti(110);
}
function closeCelebrate() {
  $("modal-celebrate").classList.add("hidden");
  $("modal-celebrate").classList.remove("flex");
}

function toggleTimer() {
  if (isTimerRunning) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    $("timer-dot").classList.remove("pulse-indicator");
  } else {
    isTimerRunning = true;
    $("timer-dot").classList.add("pulse-indicator");
    timerInterval = setInterval(() => {
      if (timerTotalSeconds > 0) {
        timerTotalSeconds--;
        drawTimer();
        if (timerTotalSeconds === 60 && soundOn) beep(660, 0.15, "sine", 0.06, 0);
      } else {
        clearInterval(timerInterval);
        isTimerRunning = false;
        $("timer-dot").classList.remove("pulse-indicator");
        if (celebrateArmed) { celebrateArmed = false; openCelebrate("timer"); }
      }
    }, 1000);
  }
}
function drawTimer() {
  const m = Math.floor(timerTotalSeconds / 60);
  const s = timerTotalSeconds % 60;
  $("timer-display").textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  const phase = $("timer-phase");
  if (timerTotalSeconds > 390) phase.textContent = "Warm-up";
  else if (timerTotalSeconds > 90) phase.textContent = "Lift";
  else if (timerTotalSeconds > 0) phase.textContent = "Victory lap";
  else phase.textContent = "Bell";
}

function toggleModal(id) {
  const el = $(id);
  const open = el.classList.contains("hidden");
  el.classList.toggle("hidden", !open);
  el.classList.toggle("flex", open);
  if (id === "modal-muscles" && open) renderMuscles();
}

function renderPatterns() {
  $("pattern-cards-grid").innerHTML = PATTERNS.map(p =>
    '<div class="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-1.5"><div class="flex justify-between"><h5 class="text-xs font-bold">' +
    p.name + '</h5><span class="text-[10px] px-1.5 rounded bg-stone-200">' + p.grade +
    '</span></div><p class="text-[11px] text-stone-500">' + p.rule +
    '</p><div class="p-2 bg-white rounded-lg border text-xs italic font-serif-editor">“' + p.example + '”</div></div>'
  ).join("");
}

$("gym-timer-pill").addEventListener("click", toggleTimer);
document.addEventListener("click", () => { try { ensureAudio(); } catch (e) {} }, { once: true });

window.addEventListener("DOMContentLoaded", () => {
  loadBank();
  syncSoundBtn();
  renderPatterns();
  renderMuscles();
  drawTimer();
  switchGrade(3);
  updateHud();
});
