(() => {
  const KEY = "deutschheft-v1";
  const view = document.getElementById("view");
  const modalRoot = document.getElementById("modal-root");
  const levelSelect = document.getElementById("level-select");

  const defaultState = () => ({
    name: "",
    level: "A1",
    xp: 0,
    lastVisit: null,
    days: [],
    known: { A1: [], A2: [], B1: [] },
    learning: { A1: [], A2: [], B1: [] },
    quizzes: [],
  });

  let state = load();
  let route = "home";
  let cardIndex = 0;
  let cardFlipped = false;
  let quiz = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      return { ...defaultState(), ...JSON.parse(raw) };
    } catch {
      return defaultState();
    }
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function checkIn() {
    const today = todayStr();
    if (state.lastVisit === today) return;
    if (!state.days.includes(today)) state.days.push(today);
    state.lastVisit = today;
    state.days = state.days.slice(-60);
    save();
  }

  function streak() {
    const days = [...state.days].sort();
    if (!days.length) return 0;
    let n = 0;
    const cursor = new Date();
    const today = todayStr();
    if (days[days.length - 1] !== today) cursor.setDate(cursor.getDate() - 1);
    while (true) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (days.includes(key)) {
        n += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    return n;
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const de = voices.find((v) => v.lang.startsWith("de"));
    if (de) u.voice = de;
    window.speechSynthesis.speak(u);
  }

  function seededPick(list, salt) {
    const today = todayStr();
    let h = 0;
    const s = today + salt + state.level;
    for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return list[h % list.length];
  }

  function words() {
    return WORDS[state.level];
  }

  function knownSet() {
    return new Set(state.known[state.level] || []);
  }

  function deck() {
    const all = words();
    const known = knownSet();
    const learning = new Set(state.learning[state.level] || []);
    const fresh = all.filter((w) => !known.has(w.id) && !learning.has(w.id));
    const review = all.filter((w) => learning.has(w.id));
    return [...fresh, ...review];
  }

  function addXp(n) {
    state.xp += n;
    save();
  }

  function markWord(id, kind) {
    const known = new Set(state.known[state.level] || []);
    const learning = new Set(state.learning[state.level] || []);
    if (kind === "known") {
      known.add(id);
      learning.delete(id);
    } else {
      learning.add(id);
      known.delete(id);
    }
    state.known[state.level] = [...known];
    state.learning[state.level] = [...learning];
    addXp(kind === "known" ? 4 : 1);
  }

  function esc(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function wordLine(w) {
    return `${w.art ? `<span class="art">${esc(w.art)}</span>` : ""}${esc(w.de)}`;
  }

  function renderHome() {
    const w = seededPick(words(), "word");
    const fox = seededPick(FOX, "fox");
    const meta = LEVEL_META[state.level];
    const known = knownSet().size;
    const total = words().length;
    view.innerHTML = `
      <section class="hero">
        <p class="hello">${state.name ? `Hallo, <em>${esc(state.name)}</em>.` : "Hallo."}<br>今天翻一页就好。</p>
        <p class="lede">${esc(meta.blurb)} 当前等级 <strong>${state.level} · ${esc(meta.title)}</strong>。</p>
        <div class="stats">
          <div class="stat"><b>${streak()}</b><span>连续天数</span></div>
          <div class="stat"><b>${known}/${total}</b><span>已会单词</span></div>
          <div class="stat"><b>${state.xp}</b><span>练习本点数</span></div>
        </div>
      </section>

      <article class="panel">
        <div class="panel-head">
          <div>
            <p class="kicker">Wort des Tages</p>
            <h2>今日单词</h2>
          </div>
          <span class="stamp">${esc(w.tag)}</span>
        </div>
        <div class="word-hero">
          <div class="word-de">${wordLine(w)}</div>
          <div class="ipa">/${esc(w.ipa)}/ · ${esc(w.zh)}</div>
          <p class="example"><strong>${esc(w.ex)}</strong><br>${esc(w.exZh)}</p>
        </div>
        <div class="row-actions">
          <button class="btn" data-speak="${esc(w.de)}">读给我听</button>
          <button class="btn ghost" data-speak="${esc(w.ex)}">读例句</button>
          <button class="btn ghost" data-go="cards">去记一组</button>
        </div>
      </article>

      <article class="panel fox">
        <svg class="fox-face" viewBox="0 0 64 64" aria-hidden="true">
          <path fill="#c15a38" d="M8 22 L24 8 L32 18 L40 8 L56 22 L50 40 C50 54 14 54 14 40 Z"/>
          <circle cx="26" cy="34" r="3" fill="#2a2118"/>
          <circle cx="38" cy="34" r="3" fill="#2a2118"/>
          <path d="M28 44 Q32 48 36 44" fill="none" stroke="#2a2118" stroke-width="2"/>
        </svg>
        <div>
          <p class="kicker">Keks sagt</p>
          <p>${esc(fox)}</p>
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div>
            <p class="kicker">Grammatik-Bissen</p>
            <h2>语法一口</h2>
          </div>
        </div>
        <div class="grammar-list">
          ${GRAMMAR[state.level]
            .map((g) => `<div class="grammar-item"><b>${esc(g.t)}</b><p>${esc(g.d)}</p></div>`)
            .join("")}
        </div>
      </article>
    `;
  }

  function renderCards() {
    const total = words().length;
    const knownCount = knownSet().size;
    const list = deck();
    const pct = total ? Math.round((knownCount / total) * 100) : 0;

    if (!list.length) {
      view.innerHTML = `
        <div class="progress-track"><div class="progress-bar" style="width:${pct}%"></div></div>
        <p class="muted">已会 ${knownCount} / ${total}</p>
        <article class="panel">
          <p class="kicker">Fertig</p>
          <h2 class="section-title" style="margin-bottom:8px">这个等级的词都点过「会了」</h2>
          <p class="lede">进度已经记下。想再过一遍，可以在「进度」里清空本等级，或换一个等级。</p>
          <div class="row-actions">
            <button class="btn ghost" data-go="home">回首页</button>
          </div>
        </article>
      `;
      return;
    }

    if (cardIndex >= list.length) cardIndex = 0;
    const w = list[cardIndex];
    view.innerHTML = `
      <div class="progress-track"><div class="progress-bar" style="width:${pct}%"></div></div>
      <p class="muted">已会 ${knownCount} / ${total} · 这组还剩 ${list.length} 张</p>
      <div class="card-stage">
        <div class="flip${cardFlipped ? " is-back" : ""}" id="flip-card" role="button" tabindex="0" aria-label="翻转卡片">
          <div class="face">
            <span class="tag">${esc(w.tag)}</span>
            <div class="word-de">${wordLine(w)}</div>
            <div class="ipa">/${esc(w.ipa)}/</div>
            <p class="muted" style="margin-top:16px">点卡片看中文</p>
          </div>
          <div class="face back">
            <span class="tag">${esc(w.zh)}</span>
            <div class="word-de">${wordLine(w)}</div>
            <p class="example"><strong>${esc(w.ex)}</strong><br>${esc(w.exZh)}</p>
          </div>
        </div>
      </div>
      <div class="row-actions">
        <button class="btn" data-speak="${esc(w.de)}">发音</button>
        <button class="btn ghost" data-speak="${esc(w.ex)}">例句</button>
      </div>
      <div class="row-actions">
        <button class="btn clay" data-mark="learning">还要再看</button>
        <button class="btn" data-mark="known">会了</button>
      </div>
    `;
  }

  function startQuiz() {
    const pool = [...QUIZ[state.level]].sort(() => Math.random() - 0.5).slice(0, 8);
    quiz = { items: pool, i: 0, score: 0, picked: null };
  }

  function renderQuiz() {
    if (!quiz) startQuiz();
    const item = quiz.items[quiz.i];
    if (!item) {
      const pct = Math.round((quiz.score / quiz.items.length) * 100);
      state.quizzes.push({ level: state.level, score: quiz.score, total: quiz.items.length, at: todayStr() });
      addXp(quiz.score * 5);
      view.innerHTML = `
        <article class="panel">
          <p class="kicker">Fertig</p>
          <p class="score-big">${pct}</p>
          <p class="lede">对了 ${quiz.score} / ${quiz.items.length} 题。${pct >= 75 ? "这页可以合上了。" : "错的那些，比全对更有用。"}</p>
          <div class="row-actions">
            <button class="btn" data-quiz="again">再来一组</button>
            <button class="btn ghost" data-go="home">回首页</button>
          </div>
        </article>
      `;
      quiz = null;
      return;
    }

    const locked = quiz.picked !== null;
    view.innerHTML = `
      <p class="muted">${state.level} · ${quiz.i + 1} / ${quiz.items.length}</p>
      <h2 class="quiz-q">${esc(item.q)}</h2>
      ${item.options
        .map((opt, idx) => {
          let cls = "option";
          if (locked && idx === item.a) cls += " is-right";
          if (locked && idx === quiz.picked && idx !== item.a) cls += " is-wrong";
          return `<button class="${cls}" data-pick="${idx}" ${locked ? "disabled" : ""}>${esc(opt)}</button>`;
        })
        .join("")}
      ${locked ? `<p class="why">${esc(item.why)}</p><button class="btn wide" data-quiz="next">下一题</button>` : ""}
    `;
  }

  function renderPhrases() {
    const list = PHRASES[state.level];
    const dlg = DIALOGUES[state.level];
    view.innerHTML = `
      <article class="panel">
        <div class="panel-head">
          <div>
            <p class="kicker">Dialog</p>
            <h2>${esc(dlg.title)}</h2>
          </div>
        </div>
        <div class="dialogue">
          ${dlg.lines
            .map(
              (line) => `
            <button class="bubble ${line.who === "你" ? "me" : ""}" data-speak="${esc(line.de)}">
              <div class="who">${esc(line.who)}</div>
              <div class="de">${esc(line.de)}</div>
              <div class="zh">${esc(line.zh)}</div>
            </button>`
            )
            .join("")}
        </div>
        <p class="muted" style="margin-top:10px">点气泡就能听。</p>
      </article>
      <div class="phrase-list">
        ${list
          .map(
            (p) => `
          <button class="phrase" data-speak="${esc(p.de)}">
            <div class="de">${esc(p.de)}</div>
            <div class="zh">${esc(p.zh)}</div>
            <div class="note">${esc(p.note)}</div>
          </button>`
          )
          .join("")}
      </div>
    `;
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function renderMe() {
    const recent = state.quizzes.slice(-5).reverse();
    const iosHint =
      isIos() && !isStandalone()
        ? `<article class="panel">
            <p class="kicker">iPhone</p>
            <h2 class="section-title" style="margin-bottom:8px">装到主屏幕</h2>
            <p class="lede">用 Safari 打开本页（不要用微信）。点底部分享按钮，再选「添加到主屏幕」。装好后会像普通 App 一样打开，没有浏览器栏。</p>
          </article>`
        : "";
    view.innerHTML = `
      ${iosHint}
      <article class="panel">
        <p class="kicker">Dein Heft</p>
        <h2 class="section-title" style="margin-bottom:12px">这本练习本是你的</h2>
        <div class="field">
          <label for="name-input">怎么称呼你</label>
          <input id="name-input" maxlength="20" value="${esc(state.name)}" placeholder="比如 Lin" />
        </div>
        <p class="muted">进度存在这台设备的浏览器里，换电脑不会带走。想同步的话，用同一浏览器，或以后再加导出。</p>
        <div class="row-actions">
          <button class="btn" id="save-name">保存称呼</button>
          <button class="btn ghost" id="reset-progress">清空本等级进度</button>
        </div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>最近测验</h2></div>
        ${
          recent.length
            ? recent
                .map((q) => `<p>${esc(q.at)} · ${esc(q.level)} · ${q.score}/${q.total}</p>`)
                .join("")
            : `<p class="muted">还没有测验记录。</p>`
        }
      </article>
      <article class="panel">
        <p class="lede">想加自己的单词？打开 <code>js/data.js</code>，按现有格式往对应等级里追加即可。这是给你自己用的本子，不必完美。</p>
      </article>
    `;
  }

  function render() {
    const map = { home: renderHome, cards: renderCards, quiz: renderQuiz, phrases: renderPhrases, me: renderMe };
    (map[route] || renderHome)();
    document.querySelectorAll(".dock-item").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.route === route);
    });
  }

  function go(next) {
    route = next;
    cardFlipped = false;
    if (next === "cards") cardIndex = 0;
    if (next === "quiz") quiz = null;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showWelcome() {
    if (state.name) return;
    modalRoot.innerHTML = `
      <div class="modal-back">
        <div class="modal">
          <p class="kicker">Willkommen</p>
          <h2>先写上你的名字</h2>
          <p class="lede" style="margin-bottom:12px">这是一本私人练习本，不是课程平台。A1 起步，随时可换等级。</p>
          <div class="field">
            <label for="welcome-name">称呼</label>
            <input id="welcome-name" maxlength="20" placeholder="比如 Lin" />
          </div>
          <button class="btn wide" id="welcome-go">打开练习本</button>
        </div>
      </div>
    `;
    const input = document.getElementById("welcome-name");
    input.focus();
    document.getElementById("welcome-go").onclick = () => {
      state.name = input.value.trim() || "Freund";
      save();
      modalRoot.innerHTML = "";
      render();
    };
  }

  function fillLevels() {
    levelSelect.innerHTML = LEVELS.map((lv) => {
      const m = LEVEL_META[lv];
      return `<option value="${lv}" ${lv === state.level ? "selected" : ""}>${lv} · ${m.title}</option>`;
    }).join("");
  }

  document.querySelector(".dock").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-route]");
    if (btn) go(btn.dataset.route);
  });

  levelSelect.addEventListener("change", () => {
    state.level = levelSelect.value;
    save();
    cardIndex = 0;
    cardFlipped = false;
    quiz = null;
    render();
  });

  document.getElementById("btn-speak-test").addEventListener("click", () => {
    speak("Guten Tag. Ich lerne Deutsch.");
  });

  view.addEventListener("click", (e) => {
    const speakBtn = e.target.closest("[data-speak]");
    if (speakBtn) {
      speak(speakBtn.dataset.speak);
      return;
    }
    const goBtn = e.target.closest("[data-go]");
    if (goBtn) {
      go(goBtn.dataset.go);
      return;
    }
    const flip = e.target.closest("#flip-card");
    if (flip) {
      cardFlipped = !cardFlipped;
      renderCards();
      return;
    }
    const mark = e.target.closest("[data-mark]");
    if (mark) {
      const list = deck();
      const current = list[cardIndex];
      if (!current) return;
      const nextId = list[(cardIndex + 1) % list.length]?.id;
      markWord(current.id, mark.dataset.mark);
      const nextList = deck();
      const found = nextList.findIndex((w) => w.id === nextId);
      cardIndex = found === -1 ? 0 : found;
      cardFlipped = false;
      renderCards();
      return;
    }
    const pick = e.target.closest("[data-pick]");
    if (pick && quiz) {
      quiz.picked = Number(pick.dataset.pick);
      if (quiz.picked === quiz.items[quiz.i].a) quiz.score += 1;
      renderQuiz();
      return;
    }
    const qbtn = e.target.closest("[data-quiz]");
    if (qbtn) {
      if (qbtn.dataset.quiz === "next") {
        quiz.i += 1;
        quiz.picked = null;
      } else if (qbtn.dataset.quiz === "again") {
        quiz = null;
      }
      renderQuiz();
    }
  });

  view.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      if (e.target.id === "flip-card") {
        e.preventDefault();
        cardFlipped = !cardFlipped;
        renderCards();
      }
    }
  });

  view.addEventListener("change", (e) => {
    if (e.target.id === "name-input") return;
  });

  view.addEventListener("click", (e) => {
    if (e.target.id === "save-name") {
      const input = document.getElementById("name-input");
      state.name = input.value.trim() || state.name;
      save();
      renderMe();
    }
    if (e.target.id === "reset-progress") {
      if (!confirm(`清空 ${state.level} 的单词进度？测验记录会保留。`)) return;
      state.known[state.level] = [];
      state.learning[state.level] = [];
      save();
      renderMe();
    }
  });

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {};
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  checkIn();
  fillLevels();
  render();
  showWelcome();
})();
