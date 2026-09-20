/* Watch to Grow — one HTML page, two JSON files.
   Routes live in the hash: #/  #/about  #/search?q=  #/learn/stem  #/age/8  #/movie/id
*/
(function () {
  const state = { site: null, movies: null };

  const $ = (sel, root = document) => root.querySelector(sel);

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseRoute() {
    const raw = (location.hash || "#/").replace(/^#/, "") || "/";
    const url = new URL(raw, "http://watch.local");
    const parts = url.pathname.replace(/^\//, "").split("/").filter(Boolean);
    const q = url.searchParams.get("q") || "";
    if (!parts.length) return { view: "home" };
    if (parts[0] === "about") return { view: "about" };
    if (parts[0] === "search") return { view: "search", q };
    if (parts[0] === "learn") return { view: "need", slug: parts[1] };
    if (parts[0] === "profession") return { view: "profession", slug: parts[1] || "" };
    if (parts[0] === "age") return { view: "age", slug: parts[1] };
    if (parts[0] === "movie") return { view: "movie", id: decodeURIComponent(parts[1] || "") };
    return { view: "home" };
  }

  function go(hash) {
    const next = hash.startsWith("#") ? hash : `#${hash}`;
    if (location.hash === next) render();
    else location.hash = next;
  }

  function movieHref(id) { return `#/movie/${encodeURIComponent(id)}`; }
  function needHref(slug) { return `#/learn/${encodeURIComponent(slug)}`; }
  function ageHref(slug) { return `#/age/${encodeURIComponent(slug)}`; }
  function professionHref(slug) { return slug ? `#/profession/${encodeURIComponent(slug)}` : "#/profession"; }

  function needByName(name) {
    return state.site.needs.find((n) => n.name === name);
  }
  function needBySlug(slug) {
    return state.site.needs.find((n) => n.slug === slug);
  }
  function ageBand(age) {
    return state.site.ages.find((a) => a.match.includes(age)) || state.site.ages.at(-1);
  }
  function ageSort(age) {
    const n = parseInt(String(age), 10);
    return Number.isFinite(n) ? n : 99;
  }
  function movieById(id) {
    return state.movies.find((m) => m.id === id);
  }
  function taggedWith(needName) {
    return state.movies
      .filter((m) => {
        if (m.primary === needName || (m.secondary || []).includes(needName)) return true;
        if (needName === "Professions" && (m.professions || []).length) return true;
        return false;
      })
      .sort((a, b) => (b.featured - a.featured) || ageSort(a.age) - ageSort(b.age) || a.title.localeCompare(b.title));
  }

  function withProfession(name) {
    return state.movies
      .filter((m) => (m.professions || []).includes(name))
      .sort((a, b) => (b.featured - a.featured) || ((a.kind === "series" ? 0 : 1) - (b.kind === "series" ? 0 : 1)) || a.title.localeCompare(b.title));
  }

  function professionBySlug(slug) {
    return (state.site.professions || []).find((p) => p.slug === slug);
  }

  function chipsFor(movie) {
    const primary = needByName(movie.primary);
    const bits = [];
    if (primary) bits.push(`<a class="chip" href="${needHref(primary.slug)}">${esc(movie.primary)}</a>`);
    (movie.secondary || []).forEach((name) => {
      const need = needByName(name);
      if (need) bits.push(`<a class="chip" href="${needHref(need.slug)}">${esc(name)}</a>`);
    });
    (movie.professions || []).slice(0, 3).forEach((name) => {
      const job = (state.site.professions || []).find((x) => x.name === name);
      if (job) bits.push(`<a class="chip amber" href="${professionHref(job.slug)}">${esc(name)}</a>`);
    });
    bits.push(movie.featured
      ? `<span class="chip amber">Featured card</span>`
      : `<span class="chip ghost">${movie.kind === "series" ? "Series" : "Film"}</span>`);
    return bits.join("");
  }

  function posterBlock(movie, cls) {
    const letter = (movie.title || "?").trim().charAt(0).toUpperCase();
    if (movie.poster) {
      return `<div class="${cls}"><img src="${esc(movie.poster)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="ph" style="display:none">${esc(letter)}</div></div>`;
    }
    return `<div class="${cls}"><div class="ph">${esc(letter)}</div></div>`;
  }

  const SOURCE_RANK = { free: 0, ads: 1, subscription: 2, rent: 3 };
  const SOURCE_LABEL = { free: "Free", ads: "Free with ads", subscription: "Subscription", rent: "Rent or buy" };

  function defaultSources(movie) {
    const titleQ = encodeURIComponent(movie.title);
    const fullQ = encodeURIComponent(`${movie.title} ${movie.year || ""}`.trim());
    return [
      { name: "Public library", type: "free", url: `https://search.worldcat.org/search?q=${fullQ}`, note: "Ask for Kanopy, Hoopla, or Libby with your card" },
      { name: "Hoopla", type: "free", url: `https://www.hoopladigital.com/search?q=${titleQ}&scope=everything&type=direct`, note: "Free with many library cards" },
      { name: "Kanopy", type: "free", url: `https://www.kanopy.com/en/search?query=${titleQ}`, note: "Free with many library cards" },
      { name: "Tubi", type: "ads", url: `https://tubitv.com/search/${titleQ}`, note: "Free with ads if they carry it" },
      { name: "Pluto TV", type: "ads", url: `https://pluto.tv/search?q=${titleQ}`, note: "Free with ads if they carry it" },
      { name: "JustWatch", type: "subscription", url: `https://www.justwatch.com/us/search?q=${titleQ}`, note: "Live list: free, subscription, rent, and buy" },
    ];
  }

  function sourcesFor(movie) {
    const seen = new Set();
    const rows = [];
    (movie.sources || []).concat(defaultSources(movie)).forEach((row) => {
      if (!row || !row.name || seen.has(row.name)) return;
      seen.add(row.name);
      rows.push(row);
    });
    return rows.sort((a, b) => (SOURCE_RANK[a.type] ?? 9) - (SOURCE_RANK[b.type] ?? 9) || a.name.localeCompare(b.name));
  }

  function sourcesList(movie) {
    const rows = sourcesFor(movie);
    const groups = ["free", "ads", "subscription", "rent"].map((type) => {
      const items = rows.filter((r) => r.type === type);
      if (!items.length) return "";
      const links = items.map((r) =>
        `<li class="source ${r.type}"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>${r.note ? `<span>${esc(r.note)}</span>` : ""}</li>`
      ).join("");
      return `<div class="source-group"><h3>${SOURCE_LABEL[type]}</h3><ul class="source-list">${links}</ul></div>`;
    }).join("");
    return `<div class="sources">${groups}<p class="source-foot">Rights move. Free options are listed first. JustWatch is the live check for paid platforms.</p></div>`;
  }

  function sourcesChips(movie) {
    return sourcesFor(movie).slice(0, 4).map((r) =>
      `<a class="chip ${r.type === "free" ? "free" : r.type === "ads" ? "amber" : "ghost"}" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>`
    ).join("");
  }

  function movieCard(movie) {
    const job = (movie.professions || [])[0];
    const kind = movie.kind === "series" ? "Series" : "Film";
    return `<a class="card" href="${movieHref(movie.id)}">
      ${posterBlock(movie, "card-poster")}
      <div class="card-body">
        <div class="meta">${esc(kind)} · ${esc(movie.age)} · ${esc(movie.mpaa)} · ${esc(movie.year)}</div>
        <h3>${esc(movie.title)}</h3>
        <p>${esc(movie.learn)}</p>
        <div class="chip-row">
          <span class="chip">${esc(movie.primary)}</span>
          ${job ? `<span class="chip amber">${esc(job)}</span>` : ""}
          ${movie.featured ? `<span class="chip amber">Featured card</span>` : ""}
        </div>
        <div class="meta">Free first: library · Hoopla · Kanopy · Tubi</div>
      </div>
    </a>`;
  }

  function setTitle(piece) {
    document.title = piece ? `${piece} · ${state.site.name}` : `${state.site.name}`;
  }

  function renderChrome(route) {
    const q = esc(route.view === "search" ? (route.q || "") : "");
    $("header.site").innerHTML = `<div class="wrap nav">
      <a class="brand" href="#/"><strong>${esc(state.site.name)}</strong><span>${esc(state.site.tagline)}</span></a>
      <nav class="nav-links">
        <a href="#/">Needs</a>
        <a href="#/">Jobs</a>
        <a href="#/about">How to use</a>
        <a href="${ageHref("8")}">By age</a>
        <form class="search-mini" data-nav-search>
          <input type="search" name="q" placeholder="Search jobs or titles" value="${q}" aria-label="Search jobs or titles">
        </form>
      </nav>
    </div>`;
    $("footer.site").innerHTML = `<div class="wrap">
      Watch → talk → do. One page. Data lives in JSON.
      · <a href="#/">Jobs</a>
      · <a href="#/about">How to use</a>
      · <a href="#/search">Catalog</a>
    </div>`;
    const form = $("[data-nav-search]");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = form.q.value.trim();
      go(value ? `#/search?q=${encodeURIComponent(value)}` : "#/search");
    });
  }

  function renderHome(root) {
    setTitle("What should we watch to grow?");
    const needDoors = state.site.needs
      .filter((need) => need.slug !== "professions")
      .map((need) => {
        const count = taggedWith(need.name).length;
        return `<a class="door" href="${needHref(need.slug)}">
          <div class="emoji">${need.emoji}</div>
          <h2>${esc(need.name)}</h2>
          <p>${esc(need.parent)}</p>
          <div class="count">${count} titles</div>
        </a>`;
      }).join("");
    const jobOptions = (state.site.professions || []).map((job) => {
      const n = withProfession(job.name).length;
      return `<option value="${esc(job.slug)}">${esc(job.name)} (${n})</option>`;
    }).join("");
    const featured = state.site.homeFeatured
      .map((id) => movieById(id))
      .filter(Boolean)
      .map(movieCard)
      .join("");
    const ritual = state.site.ritual.map(([title, body]) =>
      `<div class="step"><b>${esc(title)}</b>${esc(body)}</div>`
    ).join("");
    const catalogSize = state.movies.length;
    const jobbed = state.movies.filter((m) => (m.professions || []).length).length;
    root.innerHTML = `
      <section class="hero">
        <p class="kicker">Not a review site · ${catalogSize} titles</p>
        <h1>What do you want your child to grow tonight?</h1>
        <p class="lede">${esc(state.site.manifesto)}</p>
      </section>
      <div class="pick-row">
        <label class="pick-job">
          <span>See a job</span>
          <select data-job-select>
            <option value="">Choose a profession</option>
            ${jobOptions}
          </select>
        </label>
        <p class="pick-hint">${jobbed} titles. Pick one job — the themes stay on this screen.</p>
      </div>
      <div data-job-results></div>
      <div class="section-head">
        <h2>Pick a quality to grow</h2>
      </div>
      <section class="doors">${needDoors}</section>
      <div class="section-head">
        <h2>Start with these six</h2>
        <a href="#/search">See the full catalog →</a>
      </div>
      <section class="cards">${featured}</section>
      <div class="section-head"><h2>The ritual</h2></div>
      <section class="ritual">${ritual}</section>`;

    const select = $("[data-job-select]", root);
    const results = $("[data-job-results]", root);
    select.addEventListener("change", () => {
      const job = professionBySlug(select.value);
      if (!job) {
        results.innerHTML = "";
        return;
      }
      const films = withProfession(job.name);
      const shown = films.slice(0, 6);
      results.innerHTML = `
        <div class="job-pick-card">
          <div>
            <p class="kicker">Profession</p>
            <h2>${esc(job.name)}</h2>
            <p class="lede">${esc(job.look)}</p>
            <p><a href="${professionHref(job.slug)}">All ${films.length} ${esc(job.name.toLowerCase())} titles →</a></p>
          </div>
        </div>
        <section class="cards">${shown.map(movieCard).join("")}</section>`;
    });
  }

  function renderAbout(root) {
    setTitle("How to use");
    const how = state.site.howTo;
    const blocks = how.blocks.map((b) =>
      `<div class="block"><h2>${esc(b.title)}</h2><p>${esc(b.body)}</p></div>`
    ).join("");
    root.innerHTML = `
      <section class="page-hero">
        <p class="kicker">For parents</p>
        <h1>${esc(how.headline)}</h1>
        <p class="lede">${esc(how.lede)}</p>
      </section>
      <div class="note">${esc(how.note)}</div>
      ${blocks}
      <p style="margin: 8px 0 48px"><a href="#/">Choose a need →</a></p>`;
  }

  function haystack(movie) {
    return [
      movie.title, movie.primary, (movie.secondary || []).join(" "),
      (movie.professions || []).join(" "), movie.kind,
      movie.learn, movie.qualities, movie.knowledge, movie.age, String(movie.year)
    ].join(" ").toLowerCase();
  }

  function renderSearch(root, route) {
    setTitle("Search");
    root.parentElement.classList.add("search-page");
    root.innerHTML = `
      <section class="page-hero">
        <p class="kicker">Catalog</p>
        <h1>Search by title, need, quality, or knowledge</h1>
        <p class="lede">Contains-search only. Add films in data/movies.json — they appear here automatically.</p>
      </section>
      <p><input data-search-input type="search" placeholder="perseverance, NASA, kindness, 10+" aria-label="Search the catalog"></p>
      <p id="results-meta" data-search-meta></p>
      <section class="cards" data-search-results></section>`;

    const input = $("[data-search-input]", root);
    const out = $("[data-search-results]", root);
    const meta = $("[data-search-meta]", root);
    input.value = route.q || "";

    function run() {
      const q = input.value.trim().toLowerCase();
      const hits = !q
        ? state.movies.slice().sort((a, b) => a.title.localeCompare(b.title))
        : state.movies.filter((m) => haystack(m).includes(q));
      const shown = q ? hits : hits.slice(0, 48);
      meta.textContent = q
        ? (hits.length ? `${hits.length} titles match “${input.value.trim()}”` : "No titles match that yet.")
        : `${hits.length} titles in the catalog. Showing 48. Type a job, a need, or a title.`;
      out.innerHTML = shown.map(movieCard).join("");
      const next = q ? `#/search?q=${encodeURIComponent(input.value.trim())}` : "#/search";
      if (location.hash !== next) history.replaceState(null, "", next);
    }

    input.addEventListener("input", run);
    run();
  }

  function renderNeed(root, route) {
    const need = needBySlug(route.slug) || state.site.needs[0];
    if (!need) {
      root.innerHTML = `<p class="empty">Unknown need. <a href="#/">Back to the doors.</a></p>`;
      return;
    }
    if (need.slug === "professions") {
      renderProfession(root, { slug: "" });
      return;
    }
    setTitle(need.name);
    const films = taggedWith(need.name);
    const ageChips = state.site.ages.map((a) => `<a href="${ageHref(a.slug)}">${esc(a.label)}</a>`).join("");
    root.innerHTML = `
      <section class="page-hero">
        <p class="kicker">${need.emoji} Parent need</p>
        <h1>${esc(need.name)}</h1>
        <p class="lede">${esc(need.parent)} ${esc(need.promise)}</p>
      </section>
      <div class="filter-row">${ageChips}</div>
      <p class="lede" style="margin-bottom:16px">${films.length} titles tagged here. Featured cards first.</p>
      <section class="cards">${films.map(movieCard).join("")}</section>`;
  }

  function renderProfession(root, route) {
    const jobs = state.site.professions || [];
    const job = route.slug ? professionBySlug(route.slug) : null;
    if (route.slug && !job) {
      root.innerHTML = `<p class="empty">Unknown job. <a href="#/profession">All professions.</a></p>`;
      return;
    }
    if (!job) {
      go("#/");
      return;
    }
    setTitle(job.name);
    const films = withProfession(job.name);
    root.innerHTML = `
      <section class="page-hero">
        <p class="kicker">Profession</p>
        <h1>${esc(job.name)}</h1>
        <p class="lede">${esc(job.look)}</p>
      </section>
      <p><a href="#/profession">All jobs</a></p>
      <p class="lede" style="margin:12px 0 16px">${films.length} titles. Series listed first when they exist.</p>
      <section class="cards">${films.map(movieCard).join("")}</section>`;
  }

  function renderAge(root, route) {
    const band = state.site.ages.find((a) => a.slug === route.slug) || state.site.ages[1];
    setTitle(`Ages ${band.label}`);
    const films = state.movies
      .filter((m) => band.match.includes(m.age))
      .sort((a, b) => (b.featured - a.featured) || a.title.localeCompare(b.title));
    const nav = state.site.ages.map((a) =>
      `<a class="${a.slug === band.slug ? "is-on" : ""}" href="${ageHref(a.slug)}">${esc(a.label)}</a>`
    ).join("");
    root.innerHTML = `
      <section class="page-hero">
        <p class="kicker">Browse by age</p>
        <h1>Recommended ${esc(band.label)}</h1>
        <p class="lede">${esc(band.blurb)} Recommended age is a parent judgment, listed beside the MPAA rating — not instead of it.</p>
      </section>
      <div class="filter-row">${nav}</div>
      <section class="cards">${films.length ? films.map(movieCard).join("") : `<p class="empty">No titles in this band yet.</p>`}</section>`;
  }

  function renderMovie(root, route) {
    const movie = route.id && movieById(route.id);
    if (!movie) {
      setTitle("Not found");
      root.innerHTML = `<section class="page-hero"><h1>Film not in the catalog</h1>
        <p class="lede">Check the id in data/movies.json or <a href="#/search">browse the catalog</a>.</p></section>`;
      return;
    }
    setTitle(movie.title);
    const questions = (movie.questions || []).map((q) => `<li>${esc(q)}</li>`).join("");
    const band = ageBand(movie.age);
    const primary = needByName(movie.primary);
    root.innerHTML = `
      <section class="movie-hero movie-hero-row">
        ${posterBlock(movie, "hero-poster")}
        <div>
          <p class="kicker">Learning card</p>
          <h1 class="movie-title">${esc(movie.title)}</h1>
          <div class="chip-row">${chipsFor(movie)}</div>
        </div>
      </section>
      <section class="facts">
        <div class="fact"><span>Type</span><b>${movie.kind === "series" ? "Series" : "Film"}</b></div>
        <div class="fact"><span>Age</span><b>${esc(movie.age)}</b></div>
        <div class="fact"><span>Rating</span><b>${esc(movie.mpaa)}</b></div>
        <div class="fact"><span>Year</span><b>${esc(movie.year)}</b></div>
        <div class="fact"><span>Also in</span><b><a href="${ageHref(band.slug)}">${esc(band.label)} index</a></b></div>
      </section>
      <div class="block"><h2>What kids may learn</h2><p>${esc(movie.learn)}</p></div>
      <div class="split">
        <div class="panel teal"><h2>Qualities developed</h2><p>${esc(movie.qualities)}</p></div>
        <div class="panel amber"><h2>World knowledge</h2><p>${esc(movie.knowledge)}</p></div>
      </div>
      <div class="block"><h2>Ask your child</h2><ol class="qs">${questions}</ol></div>
      <div class="block"><h2>Try this afterward</h2><p>${esc(movie.activity)}</p></div>
      <div class="block"><h2>Where to watch</h2>${sourcesList(movie)}</div>
      <div class="block"><h2>Parent note</h2><p>${esc(movie.parent)}</p></div>
      <div class="block"><h2>Content notes</h2><p>${esc(movie.content)}</p></div>
      <p style="margin: 8px 0 56px"><a href="${needHref(primary.slug)}">More in ${esc(movie.primary)} →</a></p>`;
  }

  const views = {
    home: renderHome,
    about: renderAbout,
    search: renderSearch,
    need: renderNeed,
    profession: renderProfession,
    age: renderAge,
    movie: renderMovie,
  };

  function render() {
    if (!state.site) return;
    const route = parseRoute();
    const root = $("[data-app]");
    root.parentElement.classList.toggle("search-page", route.view === "search");
    renderChrome(route);
    views[route.view](root, route);
    window.scrollTo(0, 0);
  }

  async function readJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`${path} ${res.status}`);
    return res.json();
  }

  function showLoadError(err) {
    const root = $("[data-app]");
    if (!root) return;
    root.innerHTML = `<section class="page-hero">
      <p class="kicker">Data</p>
      <h1>The catalog JSON did not load</h1>
      <p class="lede">This site reads <code>data/movies.json</code> and <code>data/site.json</code>. Browsers block that when you double-click the HTML file.</p>
      <div class="note">From the <code>watch-to-grow-site</code> folder run <code>python3 -m http.server 8080</code>, then open <code>http://localhost:8080</code>.</div>
      <p class="empty">${esc(err && err.message)}</p>
    </section>`;
  }

  async function boot() {
    try {
      const [site, movies] = await Promise.all([
        readJSON("data/site.json"),
        readJSON("data/movies.json"),
      ]);
      state.site = site;
      state.movies = movies;
      window.addEventListener("hashchange", render);
      if (!location.hash) location.replace("#/");
      else render();
    } catch (err) {
      console.error(err);
      showLoadError(err);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
