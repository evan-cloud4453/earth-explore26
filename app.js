(function () {
  "use strict";

  var DATA = window.QUIZ_DATA;
  var CIRC = ["①", "②", "③", "④", "⑤"];
  var TYPE = { mc: "하나 고르기", multi: "모두 고르기", ox: "O / X", short: "단답형" };
  var KEY = "earth26:v1";
  var app = document.getElementById("app");

  // ---------- 문항 색인 ----------
  var QMAP = {};
  var SETS = {};
  DATA.sets.forEach(function (st) { SETS[st.id] = st; });
  DATA.topics.forEach(function (t, ti) {
    t.order = ti;
    t.questions.forEach(function (q, i) {
      q.topic = t;
      q.no = i + 1;
      QMAP[q.id] = q;
    });
  });
  var TOTAL = Object.keys(QMAP).length;
  function tag(q) { return SETS[q.topic.set].short + " " + q.topic.no + "-" + q.no; }
  function setTopics(id) { return DATA.topics.filter(function (t) { return t.set === id; }); }
  var curSet = DATA.sets[0].id;

  // ---------- 기록(브라우저 저장) ----------
  var store = load();
  function blank() { return { wrong: {}, seen: {}, topics: {} }; }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      var s = JSON.parse(raw);
      return { wrong: s.wrong || {}, seen: s.seen || {}, topics: s.topics || {} };
    } catch (e) { return blank(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* 저장 불가 환경 */ }
  }
  function record(q, ok, answer) {
    var s = store.seen[q.id] || { n: 0, ok: 0 };
    s.n += 1; if (ok) s.ok += 1; s.last = ok;
    store.seen[q.id] = s;
    var w = store.wrong[q.id];
    if (!ok) {
      w = w || { count: 0, fixed: 0 };
      w.count += 1; w.at = Date.now(); w.mine = answer; w.resolved = false;
      store.wrong[q.id] = w;
    } else if (w) {
      w.fixed += 1; w.resolved = true; w.fixedAt = Date.now();
    }
    save();
  }
  function openWrong() {
    return Object.keys(store.wrong).filter(function (id) { return QMAP[id] && !store.wrong[id].resolved; });
  }

  // ---------- 유틸 ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function norm(s) { return String(s).toLowerCase().replace(/\s+/g, "").replace(/₃/g, "3").replace(/[.,·()（）「」'"]/g, ""); }
  function answerText(q) {
    if (q.type === "mc") return CIRC[q.answer - 1];
    if (q.type === "multi") return q.answer.map(function (n) { return CIRC[n - 1]; }).join(", ");
    if (q.type === "ox") return q.answer;
    return q.answer.map(function (a, i) { return q.blanks[i] + " " + a; }).join("   ");
  }
  function mineText(q, m) {
    if (m == null) return "-";
    if (q.type === "mc") return CIRC[m - 1];
    if (q.type === "multi") return m.length ? m.map(function (n) { return CIRC[n - 1]; }).join(", ") : "(선택 없음)";
    if (q.type === "ox") return m;
    return m.map(function (a, i) { return q.blanks[i] + " " + (a || "(빈칸)"); }).join("   ");
  }
  function fmtDate(t) {
    if (!t) return "";
    var d = new Date(t);
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function h(html) { app.innerHTML = html; window.scrollTo(0, 0); }
  function on(sel, ev, fn) {
    Array.prototype.forEach.call(app.querySelectorAll(sel), function (el) { el.addEventListener(ev, fn); });
  }

  // ---------- 채점 ----------
  function gradeShort(q, inputs) {
    return q.accept.map(function (alts, i) {
      var v = norm(inputs[i] || "");
      if (!v) return false;
      return alts.some(function (a) { return v === a || (a.length >= 2 && v.indexOf(a) !== -1); });
    });
  }
  function isCorrect(q, m) {
    if (q.type === "mc") return m === q.answer;
    if (q.type === "ox") return m === q.answer;
    if (q.type === "multi") {
      var a = m.slice().sort().join(","), b = q.answer.slice().sort().join(",");
      return a === b;
    }
    return gradeShort(q, m).every(Boolean);
  }

  // =========================================================
  // 메인
  // =========================================================
  function home() {
    var seen = Object.keys(store.seen).filter(function (id) { return QMAP[id]; });
    var tries = 0, oks = 0;
    seen.forEach(function (id) { tries += store.seen[id].n; oks += store.seen[id].ok; });
    var acc = tries ? Math.round(oks / tries * 100) + "%" : "-";
    var nWrong = openWrong().length;
    h(
      '<section class="hero">' +
        '<svg class="globe" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="var(--accent)"/>' +
        '<path d="M12 25c8-6 14 2 20-2s10-8 18-2M10 40c10 4 16-4 24 0s12 4 18 0" stroke="#91c48a" stroke-width="6" fill="none" stroke-linecap="round"/></svg>' +
        "<h1>지구탐사 퀴즈</h1>" +
        "<p>중간고사 대비 · 문제집 " + DATA.sets.length + "종 " + TOTAL + "문항</p>" +
      "</section>" +
      '<div class="stats">' +
        '<div class="card stat"><b>' + seen.length + "</b><span>푼 문항 / " + TOTAL + "</span></div>" +
        '<div class="card stat"><b>' + acc + "</b><span>누적 정답률</span></div>" +
        '<div class="card stat"><b>' + nWrong + "</b><span>오답노트</span></div>" +
      "</div>" +
      '<div class="home-actions">' +
        '<button class="btn" id="go-start">시작하기</button>' +
        '<button class="btn ghost" id="go-notes">오답노트' + (nWrong ? ' <span class="note-badge">' + nWrong + "</span>" : "") + "</button>" +
      "</div>" +
      '<p class="foot">풀이 기록과 오답노트는 이 브라우저에 저장됩니다.</p>'
    );
    on("#go-start", "click", topics);
    on("#go-notes", "click", function () { notes("all"); });
  }

  // =========================================================
  // 주제 선택
  // =========================================================
  var shuffleOn = false;
  function topics() {
    var cards = setTopics(curSet).map(function (t) {
      var n = t.questions.length;
      var seen = t.questions.filter(function (q) { return store.seen[q.id]; }).length;
      var wrong = t.questions.filter(function (q) { var w = store.wrong[q.id]; return w && !w.resolved; }).length;
      var rec = store.topics[t.id];
      var meta = '<span class="chip gray">' + n + "문항</span>";
      if (rec) meta += '<span class="chip">최고 ' + rec.best + "/" + n + "</span>";
      if (wrong) meta += '<span class="chip bad">오답 ' + wrong + "</span>";
      return (
        '<button class="topic" data-t="' + t.id + '">' +
          '<span class="num">' + esc(t.no) + "</span>" +
          "<span><h3>" + esc(t.title) + "</h3>" +
          '<span class="scope">' + esc(t.scope) + "</span>" +
          '<span class="meta">' + meta + "</span>" +
          '<span class="bar" aria-label="푼 문항 ' + seen + "/" + n + '"><i style="width:' + Math.round(seen / n * 100) + '%"></i></span>' +
          "</span></button>"
      );
    }).join("");
    h(
      '<div class="topbar"><button class="icon-btn" id="back">← 메인</button><span class="title">주제 선택</span></div>' +
      '<div class="settabs">' + DATA.sets.map(function (st) {
        var n = setTopics(st.id).reduce(function (a, t) { return a + t.questions.length; }, 0);
        return '<button class="settab' + (st.id === curSet ? " on" : "") + '" data-s="' + st.id + '"><b>' + esc(st.title) + "</b><span>" + n + "문항</span></button>";
      }).join("") + "</div>" +
      '<p class="setdesc">' + esc(SETS[curSet].desc) + "</p>" +
      '<label class="toggle"><input type="checkbox" id="shuf"' + (shuffleOn ? " checked" : "") + "> 문항 순서 섞기</label>" +
      '<div class="topics">' + cards + "</div>"
    );
    on("#back", "click", home);
    on("#shuf", "change", function (e) { shuffleOn = e.target.checked; });
    on(".settab", "click", function () { curSet = this.dataset.s; topics(); });
    on(".topic", "click", function () {
      var t = DATA.topics.filter(function (x) { return x.id === this.dataset.t; }, this)[0];
      var list = shuffleOn ? shuffle(t.questions) : t.questions.slice();
      startQuiz({ title: SETS[t.set].short + " · " + t.no + ". " + t.title, list: list, topicId: t.id });
    });
  }

  // =========================================================
  // 풀이
  // =========================================================
  var S = null; // 현재 세션

  function startQuiz(opts) {
    S = { title: opts.title, list: opts.list, topicId: opts.topicId || null, i: 0, score: 0, results: [] };
    question();
  }

  function question() {
    var q = S.list[S.i];
    var n = S.list.length;
    var state = { sel: q.type === "multi" ? [] : null, done: false };
    var body = "";
    if (q.type === "mc" || q.type === "multi") {
      body = '<div class="choices">' + q.choices.map(function (c, k) {
        return '<button class="choice" data-k="' + (k + 1) + '"><span class="mark">' + CIRC[k] + "</span><span>" + rich(c) + "</span></button>";
      }).join("") + "</div>";
      if (q.type === "multi") body += '<p class="hint">옳은 것을 모두 고른 뒤 제출하세요. 정답 보기를 모두 맞혀야 정답입니다.</p>';
    } else if (q.type === "ox") {
      body = '<div class="ox choices">' +
        '<button class="choice" data-k="O">O<small>참</small></button>' +
        '<button class="choice" data-k="X">X<small>거짓</small></button></div>';
    } else {
      body = '<div class="blank">' + q.blanks.map(function (b, k) {
        return "<label>" + esc(b) + '<input type="text" autocomplete="off" data-k="' + k + '" placeholder="답 입력"></label>';
      }).join("") + "</div>";
    }
    var needsSubmit = q.type === "multi" || q.type === "short";
    var topicLine = S.topicId ? "" : '<span class="chip gray">' + esc(SETS[q.topic.set].short) + " " + esc(q.topic.no) + ". " + esc(q.topic.title) + "</span>";
    h(
      '<div class="topbar"><button class="icon-btn" id="quit">✕ 그만</button><span class="title">' + esc(S.title) + "</span>" +
        '<span class="small muted">' + S.score + "점</span></div>" +
      '<div class="progress"><i style="width:' + (S.i / n * 100) + '%"></i></div>' +
      '<div class="qhead"><span class="qno">' + (S.i + 1) + " / " + n + "</span>" +
        '<span class="row" style="gap:6px">' + topicLine + '<span class="chip">' + TYPE[q.type] + "</span></span></div>" +
      '<p class="stem">' + rich(q.stem) + "</p>" +
      body +
      '<div id="fb"></div>' +
      '<div class="actions" id="actions">' +
        (needsSubmit ? '<button class="btn block" id="submit" disabled>제출</button>' : "") +
      "</div>"
    );
    on("#quit", "click", function () {
      if (S.results.length === 0 || confirm("풀이를 그만두고 나갈까요? 지금까지 푼 문항은 기록에 남습니다.")) {
        if (S.results.length) finish(); else topicsOrHome();
      }
    });

    if (q.type === "mc" || q.type === "ox") {
      on(".choice", "click", function () {
        if (state.done) return;
        var k = q.type === "mc" ? Number(this.dataset.k) : this.dataset.k;
        submit(q, k, state);
      });
    } else if (q.type === "multi") {
      on(".choice", "click", function () {
        if (state.done) return;
        var k = Number(this.dataset.k);
        var at = state.sel.indexOf(k);
        if (at === -1) state.sel.push(k); else state.sel.splice(at, 1);
        this.classList.toggle("sel");
        document.getElementById("submit").disabled = state.sel.length === 0;
      });
      on("#submit", "click", function () { if (!state.done) submit(q, state.sel.slice().sort(), state); });
    } else {
      var inputs = app.querySelectorAll(".blank input");
      var check = function () {
        document.getElementById("submit").disabled = !Array.prototype.some.call(inputs, function (x) { return x.value.trim(); });
      };
      on(".blank input", "input", check);
      on(".blank input", "keydown", function (e) {
        if (e.key === "Enter" && !state.done) {
          e.preventDefault();
          var nx = inputs[Number(this.dataset.k) + 1];
          if (nx) nx.focus(); else if (!document.getElementById("submit").disabled) document.getElementById("submit").click();
        }
      });
      on("#submit", "click", function () {
        if (state.done) return;
        submit(q, Array.prototype.map.call(inputs, function (x) { return x.value.trim(); }), state);
      });
      inputs[0].focus();
    }
  }

  function submit(q, m, state) {
    state.done = true;
    var ok = isCorrect(q, m);
    paintAnswer(q, m);
    S.results.push({ id: q.id, ok: ok, mine: m });
    if (ok) S.score += 1;
    record(q, ok, m);
    showFeedback(q, ok, m);
  }

  function paintAnswer(q, m) {
    var btns = app.querySelectorAll(".choice");
    Array.prototype.forEach.call(btns, function (b) { b.disabled = true; });
    if (q.type === "mc" || q.type === "ox") {
      Array.prototype.forEach.call(btns, function (b) {
        var k = q.type === "mc" ? Number(b.dataset.k) : b.dataset.k;
        if (k === q.answer) b.classList.add("correct");
        else if (k === m) b.classList.add("wrong");
      });
    } else if (q.type === "multi") {
      Array.prototype.forEach.call(btns, function (b) {
        var k = Number(b.dataset.k), inAns = q.answer.indexOf(k) !== -1, picked = m.indexOf(k) !== -1;
        b.classList.remove("sel");
        if (inAns) b.classList.add(picked ? "correct" : "missed");
        else if (picked) b.classList.add("wrong");
      });
    } else {
      var res = gradeShort(q, m);
      Array.prototype.forEach.call(app.querySelectorAll(".blank input"), function (inp, i) {
        inp.disabled = true;
        inp.classList.add(res[i] ? "correct" : "wrong");
      });
    }
    var sb = document.getElementById("submit");
    if (sb) sb.remove();
  }

  function showFeedback(q, ok, m) {
    var last = S.i === S.list.length - 1;
    var override = !ok && q.type === "short"
      ? '<button class="link-btn" id="override">내 답도 맞아요 — 정답으로 처리</button>' : "";
    document.getElementById("fb").innerHTML =
      '<div class="feedback ' + (ok ? "ok" : "bad") + '">' +
        "<h4>" + (ok ? "정답!" : "아쉬워요") + "</h4>" +
        '<div class="ans">정답 ' + esc(answerText(q)) + (ok ? "" : ' <span class="muted small">· 내 답 ' + esc(mineText(q, m)) + "</span>") + "</div>" +
        "<p>" + esc(q.explain) + "</p>" +
        '<p class="src">근거: ' + esc(q.source) + "</p>" +
      "</div>";
    document.getElementById("actions").innerHTML =
      override + '<button class="btn block" id="next">' + (last ? "결과 보기" : "다음 문제 →") + "</button>";
    on("#next", "click", next);
    on("#override", "click", function () {
      // 자동 채점이 놓친 표현을 정답으로 바로잡는다
      var r = S.results[S.results.length - 1];
      r.ok = true; S.score += 1;
      var s = store.seen[q.id]; s.ok += 1; s.last = true;
      var w = store.wrong[q.id];
      if (w) { w.count -= 1; if (w.count <= 0 && !w.fixed) delete store.wrong[q.id]; else w.resolved = true; }
      save();
      this.remove();
      var fb = app.querySelector(".feedback");
      fb.classList.remove("bad"); fb.classList.add("ok");
      fb.querySelector("h4").textContent = "정답으로 처리했어요";
      app.querySelector(".topbar .small").textContent = S.score + "점";
    });
    document.getElementById("next").focus({ preventScroll: true });
    document.getElementById("fb").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function next() {
    S.i += 1;
    if (S.i >= S.list.length) finish(); else question();
  }

  function topicsOrHome() { if (S && S.topicId) topics(); else notes("all"); }

  // =========================================================
  // 결과
  // =========================================================
  function finish() {
    var n = S.results.length, sc = S.score, pct = n ? Math.round(sc / n * 100) : 0;
    if (S.topicId && n === S.list.length) {
      var rec = store.topics[S.topicId] || { best: 0 };
      rec.best = Math.max(rec.best, sc); rec.last = sc; rec.at = Date.now();
      store.topics[S.topicId] = rec; save();
    }
    var wrongs = S.results.filter(function (r) { return !r.ok; });
    var msg = pct === 100 ? "완벽해요! 이 주제는 자신 있게 넘어가도 좋아요." :
      pct >= 80 ? "좋아요. 틀린 문항만 다시 확인해 보세요." :
      pct >= 60 ? "절반 넘게 맞혔어요. 해설을 다시 읽고 오답을 풀어 보세요." :
      "오답노트로 해설을 꼼꼼히 읽은 뒤 다시 도전해 보세요.";
    var R = 60, C = 2 * Math.PI * R;
    var ring = '<svg class="ring" viewBox="0 0 140 140" aria-hidden="true">' +
      '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="var(--surface-2)" stroke-width="12"/>' +
      '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round"' +
      ' stroke-dasharray="' + (C * pct / 100) + " " + C + '" transform="rotate(-90 70 70)"/>' +
      '<text x="70" y="78" text-anchor="middle" font-size="26" font-weight="800" fill="var(--ink)">' + pct + "%</text></svg>";
    var list = wrongs.map(function (r) {
      var q = QMAP[r.id];
      return '<div class="card small"><span class="chip bad">' + esc(tag(q)) + "</span> " + rich(q.stem) +
        '<div class="muted" style="margin-top:6px">정답 ' + esc(answerText(q)) + " · 내 답 " + esc(mineText(q, r.mine)) + "</div></div>";
    }).join("");
    h(
      '<div class="topbar"><button class="icon-btn" id="home">← 메인</button><span class="title">' + esc(S.title) + "</span></div>" +
      '<div class="card score">' + ring +
        '<div class="big">' + sc + "<small> / " + n + "</small></div>" +
        '<p class="muted">' + msg + "</p></div>" +
      (wrongs.length ? '<h3 style="margin:22px 0 0">틀린 문항 ' + wrongs.length + "개</h3>" + '<div class="list">' + list + "</div>" : "") +
      '<div class="row" style="margin-top:18px">' +
        (wrongs.length ? '<button class="btn" id="retry">틀린 문항 다시 풀기</button>' : "") +
        '<button class="btn ghost" id="back">' + (S.topicId ? "주제 선택" : "오답노트") + "</button>" +
      "</div>"
    );
    var prev = S;
    on("#home", "click", home);
    on("#back", "click", function () { if (prev.topicId) topics(); else notes("all"); });
    on("#retry", "click", function () {
      startQuiz({ title: prev.title + " · 오답 다시", list: wrongs.map(function (r) { return QMAP[r.id]; }) });
    });
  }

  // =========================================================
  // 오답노트(기록보관소)
  // =========================================================
  var showResolved = false;
  function notes(filter) {
    var ids = Object.keys(store.wrong).filter(function (id) { return QMAP[id]; });
    var shown = ids.filter(function (id) {
      var q = QMAP[id], w = store.wrong[id];
      var okf = filter === "all" || (filter.indexOf("s:") === 0 ? q.topic.set === filter.slice(2) : q.topic.id === filter);
      return okf && (showResolved || !w.resolved);
    });
    shown.sort(function (a, b) {
      var qa = QMAP[a], qb = QMAP[b];
      return qa.topic.id === qb.topic.id ? qa.no - qb.no : qa.topic.order - qb.topic.order;
    });
    var counts = { all: 0 };
    ids.forEach(function (id) {
      if (!showResolved && store.wrong[id].resolved) return;
      counts.all += 1;
      var t = QMAP[id].topic.id; counts[t] = (counts[t] || 0) + 1;
      var sk = "s:" + QMAP[id].topic.set; counts[sk] = (counts[sk] || 0) + 1;
    });
    var activeSet = filter === "all" ? null : (filter.indexOf("s:") === 0 ? filter.slice(2) : (DATA.topics.filter(function (t) { return t.id === filter; })[0] || {}).set);
    var filters = '<button class="filter' + (filter === "all" ? " on" : "") + '" data-f="all">전체 ' + counts.all + "</button>" +
      DATA.sets.map(function (st) {
        return '<button class="filter' + (activeSet === st.id ? " on" : "") + '" data-f="s:' + st.id + '">' + esc(st.title) + " " + (counts["s:" + st.id] || 0) + "</button>";
      }).join("");
    if (activeSet) {
      filters += '</div><div class="filters sub">' + setTopics(activeSet).map(function (t) {
        return '<button class="filter' + (filter === t.id ? " on" : "") + '" data-f="' + t.id + '">' + esc(t.no) + ". " +
          esc(t.title.split(" — ")[0]) + " " + (counts[t.id] || 0) + "</button>";
      }).join("");
    }
    var cards = shown.map(function (id) {
      var q = QMAP[id], w = store.wrong[id];
      var status = w.resolved ? '<span class="chip ok">다시 맞힘</span>' : '<span class="chip bad">오답</span>';
      var body = "";
      if (q.type === "mc" || q.type === "multi") {
        body = '<div class="choices">' + q.choices.map(function (c, k) {
          var n = k + 1;
          var correct = q.type === "mc" ? n === q.answer : q.answer.indexOf(n) !== -1;
          var mine = w.mine != null && (q.type === "mc" ? w.mine === n : w.mine.indexOf(n) !== -1);
          var cls = correct ? (q.type === "multi" && !mine ? " missed" : " correct") : (mine ? " wrong" : "");
          return '<div class="choice' + cls + '"><span class="mark">' + CIRC[k] + "</span><span>" + rich(c) + "</span></div>";
        }).join("") + "</div>";
      }
      return (
        '<details class="card note">' +
          "<summary>" +
            '<span class="ntop">' + status + '<span class="chip gray">' + esc(tag(q)) + "</span>" +
            '<span class="chip gray">' + TYPE[q.type] + "</span>" +
            "<span>틀린 횟수 " + w.count + (w.fixed ? " · 다시 맞힘 " + w.fixed : "") + " · " + fmtDate(w.at) + "</span></span>" +
            '<span class="nstem">' + rich(q.stem) + "</span>" +
          "</summary>" +
          '<div class="nbody">' + body +
            '<p class="mine">정답 <b>' + esc(answerText(q)) + "</b> · 마지막 오답 " + esc(mineText(q, w.mine)) + "</p>" +
            '<div class="feedback bad" style="margin-top:12px"><p>' + esc(q.explain) + '</p><p class="src">근거: ' + esc(q.source) + "</p></div>" +
            '<div class="row" style="margin-top:12px"><button class="btn ghost" data-solo="' + id + '">이 문항 다시 풀기</button>' +
            '<button class="btn danger" data-del="' + id + '">기록에서 지우기</button></div>' +
          "</div>" +
        "</details>"
      );
    }).join("");
    var openIds = shown.filter(function (id) { return !store.wrong[id].resolved; });
    h(
      '<div class="topbar"><button class="icon-btn" id="home">← 메인</button><span class="title">오답노트 · 기록보관소</span></div>' +
      '<div class="filters">' + filters + "</div>" +
      '<label class="toggle"><input type="checkbox" id="resolved"' + (showResolved ? " checked" : "") + "> 다시 맞힌 문항도 보기</label>" +
      (shown.length
        ? '<div class="row" style="margin-bottom:12px"><button class="btn" id="redo"' + (openIds.length ? "" : " disabled") + ">오답 " + openIds.length + "문항 다시 풀기</button></div>" +
          '<div class="list">' + cards + "</div>" +
          '<button class="link-btn" id="clear">오답노트 전체 비우기</button>'
        : '<div class="card empty">' + (ids.length ? "이 조건에 맞는 오답이 없어요." : "아직 틀린 문항이 없어요.<br>퀴즈를 풀면 틀린 문항이 여기에 모입니다.") + "</div>")
    );
    on("#home", "click", home);
    on(".filter", "click", function () { notes(this.dataset.f); });
    on("#resolved", "change", function (e) { showResolved = e.target.checked; notes(filter); });
    on("#redo", "click", function () {
      startQuiz({ title: "오답 다시 풀기", list: shuffle(openIds.map(function (id) { return QMAP[id]; })) });
    });
    on("[data-solo]", "click", function () {
      startQuiz({ title: "오답 다시 풀기", list: [QMAP[this.dataset.solo]] });
    });
    on("[data-del]", "click", function () {
      delete store.wrong[this.dataset.del]; save(); notes(filter);
    });
    on("#clear", "click", function () {
      if (confirm("오답노트를 모두 비울까요? 되돌릴 수 없습니다.")) { store.wrong = {}; save(); notes("all"); }
    });
  }

  // 키보드: 숫자로 보기 선택, Enter로 다음
  document.addEventListener("keydown", function (e) {
    if (e.target.tagName === "INPUT" || e.altKey || e.ctrlKey || e.metaKey) return;
    var nextBtn = document.getElementById("next");
    if (e.key === "Enter" && nextBtn) { e.preventDefault(); nextBtn.click(); return; }
    var map = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, o: 0, x: 1, O: 0, X: 1 };
    if (!(e.key in map)) return;
    if (/^[oxOX]$/.test(e.key) && !app.querySelector(".ox")) return;
    var btns = app.querySelectorAll(".choices .choice:not(:disabled)");
    var b = btns[map[e.key]];
    if (b && b.tagName === "BUTTON") b.click();
  });

  home();
})();
