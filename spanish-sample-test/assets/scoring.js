/* Spanish STAMP practice — scoring logic (pure functions; works in the browser and in node).
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

  /* ---------- Writing analysis (Spanish) ---------- */
  var L = 'a-záéíóúüñ';
  var NOUNS = {
    m: ['gato', 'perro', 'hermano', 'padre', 'papá', 'abuelo', 'tío', 'primo', 'pez', 'pájaro', 'conejo', 'caballo', 'hámster', 'libro', 'cuaderno', 'lápiz', 'bolígrafo', 'profesor', 'maestro', 'amigo', 'jardín', 'parque', 'pastel', 'pan', 'queso', 'jugo', 'zumo', 'chocolate', 'sándwich', 'pollo', 'arroz', 'helado', 'desayuno', 'almuerzo', 'pantalón', 'pantalones', 'suéter', 'abrigo', 'sombrero', 'vestido', 'zapato', 'tiempo', 'sol', 'viento', 'verano', 'invierno', 'otoño', 'fin', 'sábado', 'domingo', 'lunes', 'cumpleaños', 'regalo', 'día', 'mapa', 'problema', 'juego', 'videojuego', 'deporte', 'fútbol', 'béisbol', 'baloncesto', 'piano', 'autobús', 'coche', 'carro', 'tren', 'avión', 'colegio', 'restaurante', 'partido', 'viaje', 'apartamento', 'cuarto', 'dormitorio', 'animal', 'perrito', 'mercado', 'museo', 'pueblo', 'lago', 'río', 'mar', 'año', 'mes', 'color', 'idioma', 'español', 'equipo', 'gol', 'campo', 'teléfono', 'barrio', 'hospital', 'médico', 'niño', 'chico', 'hijo', 'nombre'],
    f: ['madre', 'mamá', 'hermana', 'abuela', 'tía', 'prima', 'familia', 'casa', 'escuela', 'clase', 'cocina', 'tortuga', 'manzana', 'banana', 'naranja', 'pizza', 'ensalada', 'sopa', 'leche', 'fruta', 'carne', 'agua', 'falda', 'camisa', 'camiseta', 'chaqueta', 'gorra', 'bufanda', 'lluvia', 'nieve', 'primavera', 'estación', 'fiesta', 'semana', 'playa', 'montaña', 'ciudad', 'bicicleta', 'amiga', 'materia', 'música', 'clase', 'piscina', 'biblioteca', 'historia', 'hora', 'noche', 'mañana', 'tarde', 'mano', 'canción', 'profesora', 'maestra', 'panadería', 'tienda', 'calle', 'computadora', 'película', 'mascota', 'niña', 'chica', 'hija', 'comida', 'cena', 'ropa', 'abuela', 'excursión', 'vez', 'puerta', 'ventana', 'mesa', 'silla', 'mochila', 'gata', 'perra']
  };
  var GENDER = {};
  NOUNS.m.forEach(function (n) { GENDER[n] = 'm'; });
  NOUNS.f.forEach(function (n) { GENDER[n] = 'f'; });
  var EL_FEM = { agua: true, hambre: true, águila: true, hacha: true }; // feminine nouns that take "el" in the singular
  function pluralBase(w) {
    if (GENDER[w]) return null;
    if (/es$/.test(w) && GENDER[w.slice(0, -2)]) return w.slice(0, -2);
    if (/ces$/.test(w) && GENDER[w.slice(0, -3) + 'z']) return w.slice(0, -3) + 'z';
    if (/s$/.test(w) && GENDER[w.slice(0, -1)]) return w.slice(0, -1);
    var deacc = { ones: 'ón', enes: 'én', ines: 'ín' };
    for (var k in deacc) if (w.slice(-k.length) === k && GENDER[w.slice(0, -k.length) + deacc[k]]) return w.slice(0, -k.length) + deacc[k];
    return null;
  }
  /* Adjectives with -o/-a endings (base masculine form). */
  var ADJ_O = ['blanco', 'negro', 'rojo', 'amarillo', 'morado', 'pequeño', 'bonito', 'alto', 'bajo', 'nuevo', 'viejo', 'simpático', 'divertido', 'contento', 'cansado', 'delicioso', 'rico', 'largo', 'corto', 'guapo', 'lindo', 'favorito', 'preferido', 'gordo', 'delgado', 'tranquilo', 'antiguo', 'moderno', 'mismo', 'aburrido', 'cómodo', 'famoso', 'hermoso', 'precioso'];

  var ACCENTS = { tambien: 'también', espanol: 'español', espana: 'España', ano: 'año', anos: 'años', manana: 'mañana', nino: 'niño', nina: 'niña', ninos: 'niños', senor: 'señor', senora: 'señora', pequeno: 'pequeño', pequena: 'pequeña', montana: 'montaña', cumpleanos: 'cumpleaños', bano: 'baño', otono: 'otoño', arbol: 'árbol', facil: 'fácil', dificil: 'difícil', rapido: 'rápido', musica: 'música', matematicas: 'matemáticas', sabado: 'sábado', miercoles: 'miércoles', mama: 'mamá', despues: 'después', aqui: 'aquí', alli: 'allí', ingles: 'inglés', cancion: 'canción', television: 'televisión', futbol: 'fútbol', telefono: 'teléfono', simpatico: 'simpático', dia: 'día', dias: 'días', tenia: 'tenía', habia: 'había', jugue: 'jugué', comi: 'comí', vivi: 'viví', comio: 'comió', pelicula: 'película', lapiz: 'lápiz', estacion: 'estación', jardin: 'jardín', raton: 'ratón', leon: 'león', autobus: 'autobús', proximo: 'próximo', proxima: 'próxima', ultimo: 'último', numero: 'número', tia: 'tía', tio: 'tío', panaderia: 'panadería', excursion: 'excursión', ademas: 'además', tambein: 'también' };
  /* “esta/estas” are real words (this/these); only flag when they clearly mean “is/are”. */
  var ESTA_RE = /\b(esta|estas)\s+(bien|mal|muy|en|aquí|aqui|allí|alli|cansad[oa]s?|content[oa]s?|enferm[oa]s?|nervios[oa]s?|lloviendo|nublado|feliz|triste|abiert[oa]|cerrad[oa])\b/g;

  var CONNECTORS = ['y', 'pero', 'porque', 'también', 'entonces', 'después', 'luego', 'primero', 'finalmente', 'al final', 'cuando', 'o', 'además', 'por ejemplo', 'sin embargo', 'mientras', 'antes', 'por eso', 'así que', 'aunque', 'como'];
  var TOPIC = ['familia', 'madre', 'mamá', 'padre', 'papá', 'hermano', 'hermana', 'gato', 'perro', 'escuela', 'clase', 'profesor', 'profesora', 'amigo', 'amiga', 'fin de semana', 'fiesta', 'cumpleaños', 'comer', 'como', 'gusta', 'encanta', 'color', 'tiempo', 'hace', 'sol', 'frío', 'calor', 'llueve', 'nieva', 'llevo', 'ropa', 'jugar', 'juego', 'deporte', 'música', 'vacaciones', 'casa', 'padres', 'abuela', 'abuelo', 'primo', 'comida', 'pastel', 'mañana', 'tarde', 'noche', 'sábado', 'domingo'];

  var VERB_FORMS = [
    /\b(soy|eres|es|somos|son|estoy|estás|está|estamos|están)\b/g,
    /\b(tengo|tienes|tiene|tenemos|tienen|voy|vas|va|vamos|van|hago|haces|hace|hacemos|hacen)\b/g,
    /\b(me|te|le|nos|les) (gusta|gustan|encanta|encantan|llamo|llama|llamas)\b/g,
    /\b(juego|juegas|juega|jugamos|juegan|vivo|vives|vive|vivimos|viven|quiero|quiere|queremos|puedo|puede|podemos|prefiero|prefiere|leo|lee|leemos|escribo|escribe|bebo|bebe|veo|ve|vemos|llevo|lleva|llevamos|nado|nada|corro|corre|bailo|baila|canto|canta|estudio|estudia|estudiamos|trabaja|trabajan|camino|monto|visito|visitamos|hablo|habla|hablamos|como|come|comemos|comen|duermo|duerme|salgo|sale|salimos)\b/g,
    new RegExp('\\b[' + L + ']+(amos|emos|imos|áis|éis)\\b', 'g'),
    new RegExp('\\b(fui|fue|fuimos|fueron|era|eras|éramos|eran|estaba|estábamos|estaban|tenía|teníamos|tenían|hice|hizo|hicimos|tuve|tuvo|tuvimos|vi|vio|vimos|[' + L + ']{2,}(é|ó|aste|amos|aron|ieron|aba|aban|ábamos|ía|ían|íamos))\\b', 'g')
  ];
  var PAST_FUTURE = new RegExp('\\b(fui|fue|fuimos|fueron|era|éramos|eran|estaba|estábamos|estaban|tenía|teníamos|tenían|hice|hizo|hicimos|tuve|tuvimos|vimos|comí|comimos|[' + L + ']{2,}(é|ó|aron|ieron|aba|aban|ábamos|ía|ían|íamos))\\b|\\b(voy|vas|va|vamos|van) a [' + L + ']+(ar|er|ir)\\b|\\b(ayer|anoche|el año pasado|el verano pasado|la semana pasada|el fin de semana pasado|el año que viene|la semana que viene|el próximo|la próxima)\\b', 'g');
  var CONJ_ERRORS = [
    [/\byo (es|eres|son|somos)\b/g, 'With “yo” use “soy” (ser) or “estoy” (estar).'],
    [/\byo (tiene|tienes|tienen|va|vas|van|hace|haces|está|estás)\b/g, 'With “yo” the verb usually ends in -o: tengo, voy, hago, estoy.'],
    [/\byo (gusta|gustan|gusto)\b/g, 'Say “me gusta” (not “yo gusta”): “Me gusta el fútbol.”'],
    [/\b(él|ella|usted) (soy|tengo|voy|estoy|hago)\b/g, 'With él/ella use “es”, “tiene”, “va”, “está”.'],
    [/\b(nosotros|nosotras) (es|son|tiene|tienen|va|van|está|están)\b/g, 'With “nosotros” use “somos”, “tenemos”, “vamos”, “estamos”.'],
    [/\b(ellos|ellas) (es|tiene|va|está|soy)\b/g, 'With ellos/ellas use “son”, “tienen”, “van”, “están”.'],
    [/\b(me|te|le|nos|les) gusta (los|las|mis|tus)\b/g, 'With plural things use “gustan”: “Me gustan los perros.”'],
    [/\b(soy|eres|es|somos|son) (en|cansad[oa]s?|enferm[oa]s?)\b/g, 'Ser vs. estar: use “estar” for location and feelings (estoy en casa, estoy cansado).'],
    [/\b(estoy|estás|está|estamos|están) (alt[oa]s?|baj[oa]s?|inteligentes?|simpátic[oa]s?|estudiantes?|profesor[a]?)\b/g, 'Ser vs. estar: use “ser” for traits and identity (soy alto, es simpática).']
  ];

  /* JS \\b only knows ASCII letters; rebuild word boundaries so accented letters (á, ñ…) count as letters. */
  var BND = '(?:(?<![' + L + '])(?=[' + L + '])|(?<=[' + L + '])(?![' + L + ']))';
  function uni(re) { return new RegExp(re.source.replace(/\\b/g, BND), re.flags); }
  VERB_FORMS = VERB_FORMS.map(uni); PAST_FUTURE = uni(PAST_FUTURE); ESTA_RE = uni(ESTA_RE);
  CONJ_ERRORS = CONJ_ERRORS.map(function (p) { return [uni(p[0]), p[1]]; });

  function norm(t) { return String(t || '').toLowerCase().replace(/[’']/g, '’'); }
  function countMatches(text, re) { var m = text.match(re); return m ? m.length : 0; }

  function analyzeWriting(raw) {
    var text = norm(raw);
    var words = text.match(/[a-záéíóúüñ]+/g) || [];
    var unique = {}; words.forEach(function (w) { unique[w] = 1; });
    var sentences = String(raw || '').split(/[.!?]+/).filter(function (s) { return s.trim().split(/\s+/).length >= 2; });
    var feedback = [], flags = [];

    var conns = {};
    CONNECTORS.forEach(function (c) { var re = new RegExp('(^|[^' + L + '])' + c + '(?=$|[^' + L + '])', 'g'); var n = countMatches(text, re); if (n) conns[c] = n; });
    var connectorCount = Object.keys(conns).reduce(function (s, k) { return s + conns[k]; }, 0);

    var verbHits = 0; VERB_FORMS.forEach(function (re) { verbHits += countMatches(text, re); });
    var conjErrors = 0;
    CONJ_ERRORS.forEach(function (pair) { var n = countMatches(text, pair[0]); if (n) { conjErrors += n; flags.push(pair[1]); } });
    var timeFrames = countMatches(text, PAST_FUTURE);

    // Articles (el/la/los/las/un/una/unos/unas) vs. lexicon gender & number, plus -o/-a adjective agreement
    var artOk = 0, artBad = 0, adjBad = 0;
    var artRe = new RegExp('(?:^|[^' + L + '])(el|la|los|las|un|una|unos|unas|mi|mis|tu|tus|su|sus)\\s+([' + L + ']+)(?:\\s+([' + L + ']+))?', 'g'), m;
    while ((m = artRe.exec(text))) {
      var art = m[1], noun = m[2], adj = m[3];
      if (adj) artRe.lastIndex -= adj.length; // allow the next article to be found
      var sing = !!GENDER[noun], base = sing ? noun : pluralBase(noun);
      if (!base) continue;
      var g = GENDER[base], plural = !sing;
      var artPlural = /^(los|las|unos|unas|mis|tus|sus)$/.test(art), artNeutral = /^(mi|mis|tu|tus|su|sus)$/.test(art);
      var okHere = true;
      if (artPlural && !plural) { okHere = false; flags.push('Number: “' + art + ' ' + noun + '” → make the noun plural too (“' + art + ' ' + noun + (/[aeiouáéó]$/.test(noun) ? 's' : 'es') + '”).'); }
      else if (!artPlural && plural) { okHere = false; flags.push('Number: “' + art + ' ' + noun + '” has a singular article with a plural noun.'); }
      else if (!artNeutral) {
        var fem = /^(la|las|una|unas)$/.test(art);
        if (g === 'f' && !fem && !(EL_FEM[base] && /^(el|un)$/.test(art))) { okHere = false; flags.push('“' + base + '” is feminine: try “' + ({ el: 'la', los: 'las', un: 'una', unos: 'unas' })[art] + ' ' + noun + '”.'); }
        else if (g === 'm' && fem) { okHere = false; flags.push('“' + base + '” is masculine: try “' + ({ la: 'el', las: 'los', una: 'un', unas: 'unos' })[art] + ' ' + noun + '”.'); }
      }
      if (okHere) artOk++; else artBad++;
      if (adj) {
        var am = adj.match(/^(.+)(o|a|os|as)$/);
        if (am && ADJ_O.indexOf(am[1] + 'o') >= 0) {
          var want = (g === 'f' ? 'a' : 'o') + (plural ? 's' : '');
          if (am[2] !== want) { adjBad++; flags.push('Agreement: “' + noun + ' ' + adj + '” → “' + noun + ' ' + am[1] + want + '”.'); }
        }
      }
    }

    var accentFlags = [];
    words.forEach(function (w) { if (Object.prototype.hasOwnProperty.call(ACCENTS, w) && accentFlags.indexOf(w) < 0) accentFlags.push(w); });
    accentFlags.forEach(function (w) { flags.push('Accent: “' + w + '” → “' + ACCENTS[w] + '”.'); });
    var em; ESTA_RE.lastIndex = 0;
    while ((em = ESTA_RE.exec(text))) { if (accentFlags.indexOf(em[1]) < 0) { accentFlags.push(em[1]); flags.push('Accent: “' + em[1] + ' ' + em[2] + '” → “' + (em[1] === 'esta' ? 'está' : 'estás') + ' ' + em[2] + '” (está = is).'); } }
    var rawS = String(raw || '');
    if (/\?/.test(rawS) && !/¿/.test(rawS)) flags.push('Tip: Spanish questions start with “¿” (¿Cómo estás?).');
    if (/!/.test(rawS) && !/¡/.test(rawS)) flags.push('Tip: Spanish exclamations start with “¡” (¡Qué divertido!).');

    var topicHits = TOPIC.filter(function (t) { return text.indexOf(t) >= 0; }).length;
    var uniqueCount = Object.keys(unique).length;
    var distinctConn = Object.keys(conns).length;
    var artTotal = artOk + artBad, artAcc = artTotal ? artOk / artTotal : 1;
    var accuracyIssues = conjErrors + artBad + adjBad;

    var lvl;
    if (words.length < 6) lvl = 1;
    else if (verbHits < 1 || sentences.length < 2 || words.length < 15) lvl = 2;
    else lvl = 3;
    if (lvl === 3 && sentences.length >= 4 && words.length >= 40 && uniqueCount >= 28 && distinctConn >= 2 && verbHits >= 4 && artAcc >= 0.7) lvl = 4;
    if (lvl === 4 && sentences.length >= 6 && words.length >= 75 && uniqueCount >= 45 && distinctConn >= 3 && verbHits >= 6 && timeFrames >= 2 && artAcc >= 0.8 && accuracyIssues <= Math.max(2, Math.floor(sentences.length / 3))) lvl = 5;

    if (sentences.length < 3) feedback.push('Write more complete sentences — aim for at least 4.');
    if (distinctConn < 2) feedback.push('Connect ideas with words like y, pero, porque, también, entonces.');
    if (uniqueCount < 30) feedback.push('Try to use more different words (colors, family words, activities).');
    if (timeFrames < 1 && lvl >= 3) feedback.push('To reach Intermediate, add something that happened (jugué…, fuimos…) or will happen (voy a visitar…).');
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
    ['connected', 'Connected ideas (y, pero, porque, entonces…)'],
    ['understood', 'Pronunciation was understandable to a Spanish speaker'],
    ['topic', 'Stayed on topic and answered the whole prompt'],
    ['varied', 'Used varied vocabulary (not the same few words)'],
    ['time', 'Talked about past or future events, or told a short story']
  ];
  /* checks: {full:true,...}; rec: {seconds, words} or null (words = recognized Spanish words, may be null). */
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
        if (rec.words < 8 && lvl > 3) { lvl = 3; notes.push('Speech recognition heard only a few Spanish words.'); }
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
