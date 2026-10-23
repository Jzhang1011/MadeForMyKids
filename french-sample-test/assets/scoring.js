/* French STAMP practice — scoring logic (pure functions; works in the browser and in node).
   UNOFFICIAL PRACTICE ESTIMATE ONLY. Not an Avant or FCPS score. */
(function (root) {
  'use strict';

  /* Level indexes: 0 Below Novice High (only used for overall), 1 Novice Low, 2 Novice Mid,
     3 Novice High, 4 Intermediate Low, 5 Intermediate Mid. */
  var LEVELS = ['Below Novice High', 'Novice Low', 'Novice Mid', 'Novice High', 'Intermediate Low', 'Intermediate Mid'];
  var CREDITS = { 3: 1, 4: 2, 5: 3 };

  /* Fixed test level -> target proficiency + thresholds. */
  var THRESHOLDS = {
    1: { name: 'Novice High', target: 3, credits: 1, mcq: 70 },
    2: { name: 'Intermediate Low', target: 4, credits: 2, mcq: 75 },
    3: { name: 'Intermediate Mid', target: 5, credits: 3, mcq: 80 }
  };
  var PROMPTS_TO_PASS = 2; // of 3 scored prompts must reach the target level

  /* ---------- Writing analysis ---------- */
  var NOUNS = {
    m: ['chat', 'chien', 'frère', 'père', 'oncle', 'cousin', 'grand-père', 'poisson', 'lapin', 'oiseau', 'hamster', 'livre', 'cahier', 'stylo', 'crayon', 'sac', 'professeur', 'ami', 'jardin', 'parc', 'gâteau', 'pain', 'fromage', 'lait', 'jus', 'chocolat', 'sandwich', 'poulet', 'riz', 'pantalon', 'tee-shirt', 'pull', 'manteau', 'chapeau', 'jean', 'short', 'temps', 'soleil', 'vent', 'été', 'hiver', 'automne', 'printemps', 'week-end', 'samedi', 'dimanche', 'lundi', 'anniversaire', 'cadeau', 'repas', 'dîner', 'déjeuner', 'petit-déjeuner', 'film', 'jeu', 'vélo', 'bus', 'cours', 'collège', 'restaurant', 'match', 'voyage', 'appartement', 'frigo', 'bonbon', 'dessert', 'fruit', 'légume', 'animal', 'chiot', 'sport', 'foot', 'basket', 'piano', 'violon', 'magasin', 'musée', 'village', 'lac', 'matin', 'soir', 'jour', 'mois', 'an'],
    f: ['mère', 'sœur', 'tante', 'cousine', 'grand-mère', 'famille', 'maison', 'école', 'classe', 'chambre', 'cuisine', 'tortue', 'souris', 'pomme', 'banane', 'orange', 'pizza', 'salade', 'soupe', 'glace', 'tarte', 'viande', 'eau', 'robe', 'jupe', 'chemise', 'veste', 'écharpe', 'casquette', 'chaussure', 'pluie', 'neige', 'saison', 'fête', 'journée', 'semaine', 'plage', 'montagne', 'forêt', 'ville', 'mer', 'voiture', 'amie', 'matière', 'couleur', 'musique', 'danse', 'natation', 'récréation', 'cantine', 'bibliothèque', 'piscine', 'histoire', 'année', 'heure', 'nuit', 'soirée', 'vacances', 'promenade', 'chanson', 'professeure', 'boulangerie']
  };
  var GENDER = {};
  NOUNS.m.forEach(function (n) { GENDER[n] = 'm'; });
  NOUNS.f.forEach(function (n) { GENDER[n] = 'f'; });
  var PLURAL_ONLY = { vacances: true };

  var ACCENTS = { tres: 'très', ecole: 'école', francais: 'français', frere: 'frère', mere: 'mère', pere: 'père', soeur: 'sœur', ete: 'été', eleve: 'élève', prefere: 'préféré', preferee: 'préférée', foret: 'forêt', fete: 'fête', deja: 'déjà', apres: 'après', bientot: 'bientôt', gateau: 'gâteau', gateaux: 'gâteaux', fenetre: 'fenêtre', telephone: 'téléphone', television: 'télévision', diner: 'dîner', dejeuner: 'déjeuner', etait: 'était', etais: 'étais', theatre: 'théâtre', anniversare: 'anniversaire', lecole: 'l’école', grandmere: 'grand-mère', grandpere: 'grand-père', recreation: 'récréation', matiere: 'matière', bibliotheque: 'bibliothèque', ca: 'ça' };

  var CONNECTORS = ['et', 'mais', 'parce que', 'aussi', 'alors', 'ensuite', 'puis', 'donc', 'quand', 'd’abord', 'enfin', 'après', 'avant', 'pendant', 'ou', 'car', 'par exemple', 'finalement', 'pourtant', 'comme', 'en plus', 'par contre'];
  var TOPIC = ['famille', 'mère', 'père', 'frère', 'sœur', 'chat', 'chien', 'école', 'classe', 'professeur', 'ami', 'amie', 'week-end', 'fête', 'anniversaire', 'manger', 'aime', 'adore', 'couleur', 'temps', 'fait', 'beau', 'froid', 'chaud', 'pleut', 'neige', 'porte', 'vêtements', 'jouer', 'joue', 'sport', 'musique', 'vacances', 'maison', 'parents', 'grand-mère', 'grand-père', 'cousin', 'repas', 'gâteau', 'matin', 'soir', 'samedi', 'dimanche'];

  var PRON = '(je|j’|tu|il|elle|on|nous|vous|ils|elles)';
  var VERB_FORMS = [
    /\b(je suis|tu es|(il|elle|on|c’) ?est|nous sommes|vous êtes|(ils|elles) sont)\b/g,
    /\b(j’ai|tu as|(il|elle|on) a|nous avons|vous avez|(ils|elles) ont)\b/g,
    /\b(je vais|tu vas|(il|elle|on) va|nous allons|vous allez|(ils|elles) vont)\b/g,
    /\b(je fais|tu fais|(il|elle|on) fait|nous faisons|vous faites|(ils|elles) font)\b/g,
    /(\bj’|\b(je|tu|il|elle|on|ils|elles) )(aime|aimes|aiment|adore|adores|adorent)\b/g,
    /\b(je|tu|il|elle|on) (n’|ne )?[a-zàâçéèêëîïôûùüœ]+(e|es)\b/g,
    /\bnous [a-zàâçéèêëîïôûùüœ]+ons\b/g,
    /\bvous [a-zàâçéèêëîïôûùüœ]+ez\b/g,
    /\b(ils|elles) [a-zàâçéèêëîïôûùüœ]+ent\b/g
  ];
  var PAST_FUTURE = /\b(j’ai|tu as|il a|elle a|on a|nous avons|ils ont|elles ont) [a-zàâçéèêëîïôûùüœ]+(é|i|u|is|it|ait)\b|\b(je suis|il est|elle est|nous sommes|ils sont|elles sont) (allé|allée|allés|venu|venue|parti|partie|rentré|rentrée|arrivé|arrivée|resté|restée|tombé|tombée)s?\b|\b(étais|était|avais|avait|faisait|allait|aimais|aimait)\b|\b(je vais|on va|nous allons|il va|elle va) [a-zàâçéèêëîïôûùüœ]+(er|ir|re)\b|\b(hier|demain|l’année prochaine|l’été dernier|la semaine dernière|le week-end dernier)\b/g;
  var CONJ_ERRORS = [
    [/\bje (est|es|a|ont|sont|sommes)\b/g, 'After “je”, use “je suis” (être) or “j’ai” (avoir).'],
    [/\bje (ai|aime|adore|habite|étais|avais)\b/g, 'Before a vowel, “je” becomes “j’” (j’ai, j’aime, j’habite).'],
    [/\b(il|elle|on) (suis|ai|sommes|avons|vais)\b/g, 'With il/elle/on use “est”, “a”, or “va”.'],
    [/\bnous (est|ai|a|sont|va)\b/g, 'With “nous” use “sommes”, “avons”, or “allons”.'],
    [/\b(ils|elles) (est|a|va|aime)\b/g, 'With ils/elles use “sont”, “ont”, “vont”, “aiment”.']
  ];
  var FEM_ADJ_ERR = /\b(une|la|ma|ta|sa) (grand|petit|beau|noir|vert|gris|blanc|content|fatigué|joli)\b(?!e)/g;

  function norm(t) { return String(t || '').toLowerCase().replace(/[’']/g, '’'); }
  function countMatches(text, re) { var m = text.match(re); return m ? m.length : 0; }

  function analyzeWriting(raw) {
    var text = norm(raw);
    var words = text.match(/[a-zàâçéèêëîïôûùüœ’-]+/g) || [];
    var unique = {}; words.forEach(function (w) { unique[w.replace(/^[a-z]’/, '')] = 1; });
    var sentences = String(raw || '').split(/[.!?]+/).filter(function (s) { return s.trim().split(/\s+/).length >= 2; });
    var feedback = [], flags = [];

    var conns = {};
    CONNECTORS.forEach(function (c) { var re = new RegExp('(^|[^a-zà-ÿœ’])' + c.replace('’', '’') + '(?=$|[^a-zà-ÿœ])', 'g'); var n = countMatches(text, re); if (n) conns[c] = n; });
    var connectorCount = Object.keys(conns).reduce(function (s, k) { return s + conns[k]; }, 0);

    var verbHits = 0; VERB_FORMS.forEach(function (re) { verbHits += countMatches(text, re); });
    var conjErrors = 0;
    CONJ_ERRORS.forEach(function (pair) { var n = countMatches(text, pair[0]); if (n) { conjErrors += n; flags.push(pair[1]); } });
    var timeFrames = countMatches(text, PAST_FUTURE);

    // Articles vs. lexicon gender / number
    var artOk = 0, artBad = 0;
    var artRe = /(?:^|[^a-zà-ÿœ’])(?:(le|la|les|un|une|des|mon|ma|mes)\s+|(l’))([a-zàâçéèêëîïôûùüœ-]+)/g, m;
    while ((m = artRe.exec(text))) {
      var art = m[1] || m[2], noun = m[3], base = noun.replace(/s$/, ''), g = GENDER[noun] || GENDER[base];
      if (!g) continue;
      var plural = noun !== base && GENDER[base] && !GENDER[noun];
      if (PLURAL_ONLY[noun]) { if (/^(les|des|mes)$/.test(art)) artOk++; else { artBad++; flags.push('“' + noun + '” is always plural: “les ' + noun + '”.'); } continue; }
      if (/^(les|des|mes)$/.test(art)) {
        if (plural || /[sx]$/.test(noun)) artOk++; else { artBad++; flags.push('Plural article: “' + art + ' ' + noun + '” → “' + art + ' ' + noun + 's”.'); }
      } else if (art === 'l’') { artOk++; }
      else if (plural) { artBad++; flags.push('“' + art + ' ' + noun + '”: singular article with a plural noun.'); }
      else if (/^(le|un|mon)$/.test(art) && g === 'f' && !/^[aeiouhéèê]/.test(noun)) { artBad++; flags.push('“' + noun + '” is feminine: try “' + (art === 'le' ? 'la' : art === 'un' ? 'une' : 'ma') + ' ' + noun + '”.'); }
      else if (art === 'le' && /^[aeiouhéèê]/.test(noun)) { artBad++; flags.push('Before a vowel: “l’' + noun + '”.'); }
      else if (/^(la|une|ma)$/.test(art) && g === 'm') { artBad++; flags.push('“' + noun + '” is masculine: try “' + (art === 'la' ? 'le' : art === 'une' ? 'un' : 'mon') + ' ' + noun + '”.'); }
      else artOk++;
    }
    var adjErr = text.match(FEM_ADJ_ERR) || [];
    adjErr.forEach(function (a) { flags.push('Agreement: “' + a + '” → add -e for a feminine noun (“' + a + 'e”).'); });

    var accentFlags = [];
    words.forEach(function (w) { if (ACCENTS[w] && accentFlags.indexOf(w) < 0) accentFlags.push(w); });
    accentFlags.forEach(function (w) { flags.push('Accent: “' + w + '” → “' + ACCENTS[w] + '”.'); });

    var topicHits = TOPIC.filter(function (t) { return text.indexOf(t) >= 0; }).length;
    var uniqueCount = Object.keys(unique).length;
    var distinctConn = Object.keys(conns).length;
    var artTotal = artOk + artBad, artAcc = artTotal ? artOk / artTotal : 1;
    var accuracyIssues = conjErrors + artBad + adjErr.length;

    var lvl;
    if (words.length < 6) lvl = 1;
    else if (verbHits < 1 || sentences.length < 2 || words.length < 15) lvl = 2;
    else lvl = 3;
    if (lvl === 3 && sentences.length >= 4 && words.length >= 40 && uniqueCount >= 28 && distinctConn >= 2 && verbHits >= 4 && artAcc >= 0.7) lvl = 4;
    if (lvl === 4 && sentences.length >= 6 && words.length >= 75 && uniqueCount >= 45 && distinctConn >= 3 && verbHits >= 6 && timeFrames >= 2 && artAcc >= 0.8 && accuracyIssues <= Math.max(2, Math.floor(sentences.length / 3))) lvl = 5;

    if (sentences.length < 3) feedback.push('Write more complete sentences — aim for at least 4.');
    if (distinctConn < 2) feedback.push('Connect ideas with words like et, mais, parce que, aussi, alors.');
    if (uniqueCount < 30) feedback.push('Try to use more different words (colors, family words, activities).');
    if (timeFrames < 1 && lvl >= 3) feedback.push('To reach Intermediate, add something that happened (j’ai joué…) or will happen (je vais visiter…).');
    if (!feedback.length) feedback.push('Nice connected writing! Keep adding details and reasons.');

    return {
      chars: String(raw || '').length, words: words.length, unique: uniqueCount, sentences: sentences.length,
      connectors: connectorCount, distinctConnectors: distinctConn, verbHits: verbHits, conjErrors: conjErrors,
      timeFrames: timeFrames, articleOk: artOk, articleBad: artBad, topicHits: topicHits,
      accentFlags: accentFlags, flags: flags, feedback: feedback, levelIdx: lvl, level: LEVELS[lvl]
    };
  }

  /* ---------- Speaking estimate ---------- */
  var CHECKLIST = [
    ['full', 'Used full sentences (not just single words)'],
    ['connected', 'Connected ideas (et, mais, parce que, alors…)'],
    ['understood', 'Pronunciation was understandable to a French speaker'],
    ['topic', 'Stayed on topic and answered the whole prompt'],
    ['varied', 'Used varied vocabulary (not the same few words)'],
    ['time', 'Talked about past or future events, or told a short story']
  ];
  /* checks: {full:true,...}; rec: {seconds, words} or null (words = recognized French words, may be null). */
  function scoreSpeaking(checks, rec) {
    checks = checks || {};
    var n = CHECKLIST.filter(function (c) { return checks[c[0]]; }).length;
    var lvl = n <= 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : n <= 5 ? 4 : 5;
    if (lvl >= 4 && !checks.connected) lvl = 3;
    if (lvl === 5 && !checks.time) lvl = 4;
    var notes = [];
    if (rec && typeof rec.seconds === 'number') {
      if (rec.seconds < 10 && lvl > 2) { lvl = 2; notes.push('Recording was under 10 seconds — try to keep talking longer.'); }
      else if (rec.seconds < 25 && lvl > 3) { lvl = 3; notes.push('Intermediate answers usually last 25+ seconds.'); }
      if (typeof rec.words === 'number') {
        if (rec.words < 8 && lvl > 3) { lvl = 3; notes.push('Speech recognition heard only a few French words.'); }
        if (rec.words >= 40 && n >= 5 && lvl === 4 && checks.time) lvl = 5;
      }
    }
    return { checked: n, levelIdx: lvl, level: LEVELS[lvl], notes: notes };
  }

  /* ---------- Fixed-level pass logic ---------- */
  function mcqPass(level, correct, total) {
    var pct = total ? Math.round(correct / total * 100) : 0;
    return { percent: pct, pass: pct >= THRESHOLDS[level].mcq };
  }
  function promptsPass(level, levelIdxs) {
    var t = THRESHOLDS[level].target;
    var hits = levelIdxs.filter(function (l) { return l >= t; }).length;
    return { hits: hits, needed: PROMPTS_TO_PASS, pass: hits >= PROMPTS_TO_PASS };
  }
  var SECTIONS = ['reading', 'listening', 'writing', 'speaking'];
  /* results: { reading:{pass:bool}, ... } for one level. */
  function levelStatus(results) {
    results = results || {};
    var done = SECTIONS.filter(function (s) { return results[s]; });
    if (!done.length) return 'not-started';
    if (done.length === 4 && done.every(function (s) { return results[s].pass; })) return 'passed';
    return 'in-progress';
  }
  /* all: {1:{...},2:{...},3:{...}} -> recommendation text + target level */
  function recommend(all) {
    all = all || {};
    var st = [1, 2, 3].map(function (l) { return levelStatus(all[l]); });
    var highestPassed = 0; for (var i = 0; i < 3; i++) if (st[i] === 'passed') highestPassed = i + 1;
    if (highestPassed === 3) return { level: null, text: 'Top level reached! Level 3 (Intermediate Mid, 3 credits) passed in practice. Keep practicing for the real test.' };
    var next = highestPassed + 1;
    var r = all[next] || {};
    var notYet = SECTIONS.filter(function (s) { return r[s] && !r[s].pass; });
    var missing = SECTIONS.filter(function (s) { return !r[s]; });
    if (st[next - 1] === 'not-started') {
      return { level: next, text: highestPassed ? 'Level ' + highestPassed + ' passed — try Level ' + next + ' next.' : 'Start with Level 1 (Novice High).' };
    }
    var parts = [];
    if (notYet.length) parts.push('retry ' + notYet.join(', ') + ' (marked Not yet)');
    if (missing.length) parts.push('finish ' + missing.join(', '));
    return { level: next, text: 'Level ' + next + ' in progress: ' + parts.join('; ') + '.' };
  }

  /* ---------- Adaptive tiers ---------- */
  var TIER_NAMES = { 1: 'Beginner', 2: 'Early intermediate', 3: 'Intermediate' };
  /* banks: {1:[items],2:[items],3:[items]}; each item gets a stable id "tier:index". */
  function AdaptiveMCQ(banks, opts) {
    opts = opts || {};
    this.banks = banks; this.tier = opts.startTier || 1; this.total = opts.total || 30;
    this.up = 0; this.down = 0; this.seen = {}; this.history = []; this.changes = [];
    this.rand = opts.random || Math.random;
  }
  AdaptiveMCQ.prototype.next = function () {
    if (this.history.length >= this.total) return null;
    var order = [this.tier, this.tier - 1, this.tier + 1, this.tier - 2, this.tier + 2];
    for (var k = 0; k < order.length; k++) {
      var t = order[k], bank = this.banks[t];
      if (!bank) continue;
      var pool = [];
      for (var i = 0; i < bank.length; i++) if (!this.seen[t + ':' + i]) pool.push(i);
      if (pool.length) {
        var idx = pool[Math.floor(this.rand() * pool.length)];
        this.seen[t + ':' + idx] = true;
        return { id: t + ':' + idx, tier: t, item: bank[idx] };
      }
    }
    return null;
  };
  AdaptiveMCQ.prototype.record = function (served, correct) {
    this.history.push({ id: served.id, tier: served.tier, correct: !!correct });
    var before = this.tier;
    if (correct) { this.up++; this.down = 0; } else { this.down++; this.up = 0; }
    if (this.up >= 3 && this.tier < 3) this.tier++;
    else if (this.down >= 2 && this.tier > 1) this.tier--;
    if (this.tier !== before) { this.up = 0; this.down = 0; this.changes.push({ at: this.history.length, from: before, to: this.tier }); }
    else if (this.up >= 3) this.up = 0; // at ceiling: restart the streak count
    return this.tier !== before ? { from: before, to: this.tier } : null;
  };
  /* Writing/Speaking: one prompt at a time; pass -> up, not yet -> down. */
  function nextPromptTier(tier, passed) { return passed ? Math.min(3, tier + 1) : Math.max(1, tier - 1); }

  /* history: [{tier, correct}] (MCQ) or [{tier, pass}] (prompts). */
  function sustainedTier(history, kind) {
    var minItems = kind === 'prompt' ? 1 : 5, best = 0;
    [1, 2, 3].forEach(function (t) {
      var h = history.filter(function (x) { return x.tier === t; });
      if (h.length < minItems) return;
      var ok = h.filter(function (x) { return kind === 'prompt' ? x.pass : x.correct; }).length;
      if (ok / h.length >= 0.6) best = t;
    });
    return best;
  }
  function highestTier(history) { return history.reduce(function (m, x) { return Math.max(m, x.tier); }, 0); }
  /* sustained: {reading, listening, writing, speaking} tiers (0-3, undefined if not taken). */
  function adaptiveOverall(sustained) {
    var missing = SECTIONS.filter(function (s) { return sustained[s] == null; });
    if (missing.length) return { complete: false, missing: missing, levelIdx: null };
    var low = Math.min.apply(null, SECTIONS.map(function (s) { return sustained[s]; }));
    var levelIdx = low === 0 ? 0 : low + 2; // tier1->NH(3), tier2->IL(4), tier3->IM(5)
    return { complete: true, missing: [], tier: low, levelIdx: levelIdx, level: LEVELS[levelIdx], credits: CREDITS[levelIdx] || 0 };
  }

  var API = {
    LEVELS: LEVELS, CREDITS: CREDITS, THRESHOLDS: THRESHOLDS, PROMPTS_TO_PASS: PROMPTS_TO_PASS, SECTIONS: SECTIONS,
    CHECKLIST: CHECKLIST, TIER_NAMES: TIER_NAMES, analyzeWriting: analyzeWriting, scoreSpeaking: scoreSpeaking,
    mcqPass: mcqPass, promptsPass: promptsPass, levelStatus: levelStatus, recommend: recommend,
    AdaptiveMCQ: AdaptiveMCQ, nextPromptTier: nextPromptTier, sustainedTier: sustainedTier,
    highestTier: highestTier, adaptiveOverall: adaptiveOverall
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.FSTScore = API;
})(typeof window !== 'undefined' ? window : globalThis);
