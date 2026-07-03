// КПТ-Курс — логіка застосунку (vanilla JS, hash-роутинг)

let S = Store.load();
const $app = () => document.getElementById("app");
const PASS = 0.8; // поріг складання тесту

// ── Утиліти ──────────────────────────────────────────────

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const MONTHS_UA = ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"];
function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS_UA[Number(m) - 1] || m} ${y}`;
}
function fmtDateShort(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS_UA[Number(m) - 1] || m}`;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function save() { Store.save(S); }

function mondayOf(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = понеділок
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function sessionsThisWeek() {
  const mon = mondayOf(new Date());
  return S.sessions.filter(s => new Date(s.date + "T12:00") >= mon).length;
}
function courseWeek() {
  if (!S.startDate) return null;
  const days = Math.floor((new Date() - new Date(S.startDate + "T00:00")) / 86400000);
  return days < 0 ? null : Math.floor(days / 7) + 1;
}

// ── Стан блоків ──────────────────────────────────────────

function blockChecklistDone(b) {
  return b.exit.every((_, i) => S.checklist[`b${b.id}-${i}`]);
}
function blockQuizPassed(id) {
  return (S.quizAttempts[id] || []).some(a => a.passed);
}
function blockBestQuiz(id) {
  const at = S.quizAttempts[id] || [];
  if (!at.length) return null;
  return at.reduce((m, a) => (a.score / a.total > m.score / m.total ? a : m));
}
function blockDone(id) { return !!S.blockDone[id]; }
function currentBlock() {
  return COURSE.blocks.find(b => !blockDone(b.id)) || COURSE.blocks[COURSE.blocks.length - 1];
}
function progressPct() {
  const done = COURSE.blocks.filter(b => blockDone(b.id)).length;
  return Math.round(done / COURSE.blocks.length * 100);
}

// ── MITI ─────────────────────────────────────────────────

function mitiEval(m) {
  if (!m) return null;
  const refl = (m.simple || 0) + (m.complex || 0);
  const ratio = m.questions > 0 ? refl / m.questions : (refl > 0 ? Infinity : 0);
  const pctComplex = refl > 0 ? (m.complex || 0) / refl : 0;
  return {
    ratio, pctComplex, incons: m.incons || 0,
    ratioOk: ratio >= 1,
    complexOk: pctComplex >= 0.4,
    inconsOk: (m.incons || 0) === 0,
  };
}

// ── Рендеринг ────────────────────────────────────────────

const TAB_ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  course: '<path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M4 17h16"/>',
  journal: '<path d="M5 3h14v18H5z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  stats: '<path d="M4 19 10 12l4 4 6-8"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
};
function tabIcon(name) {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${TAB_ICONS[name]}</svg>`;
}

function nav(active) {
  const items = [
    ["#/", "home", "Головна"],
    ["#/blocks", "course", "Курс"],
    ["#/journal", "journal", "Журнал"],
    ["#/stats", "stats", "Динаміка"],
    ["#/settings", "more", "Ще"],
  ];
  return `<nav class="tabbar">${items.map(([h, ic, t]) =>
    `<a href="${h}" class="${active === h ? "active" : ""}">${tabIcon(ic)}<span>${t}</span></a>`).join("")}</nav>`;
}

function header(title, back) {
  return `<header class="top">${back ? `<a class="back" href="${back}">‹</a>` : ""}<h1>${esc(title)}</h1></header>`;
}

// ── Головна ──────────────────────────────────────────────

function viewDashboard() {
  const cur = currentBlock();
  const week = courseWeek();
  const sw = sessionsThisWeek();
  const allDone = COURSE.blocks.every(b => blockDone(b.id));
  const best = blockBestQuiz(cur.id);
  const doneCount = COURSE.blocks.filter(b => blockDone(b.id)).length;
  return `
  ${header("КПТ-Курс")}
  <main>
    <section class="hero-ink">
      <div class="hero-top">
        <p class="overline">Прогрес курсу</p>
        ${week ? `<span class="hero-week">Тиждень ${week}</span>` : ""}
      </div>
      <div class="hero-num-row">
        <span class="hero-num">${doneCount} з ${COURSE.blocks.length}</span>
        <span class="hero-cap">блоків закрито</span>
      </div>
      <div class="hero-bar"><div style="width:${progressPct()}%"></div></div>
    </section>

    ${allDone ? `
    <section class="card done-card">
      <h2>🎓 Курс пройдено!</h2>
      <p>Критерій завершення: CTS-R ≥36 у двох сесіях поспіль, нуль червоних прапорців, MITI-пороги утримані.</p>
      <p class="muted small">${esc(COURSE.limits)}</p>
    </section>` : `
    <section class="card">
      <p class="overline">Поточний блок</p>
      <h2>Блок ${cur.id} · ${esc(cur.title)}</h2>
      <p class="badges">
        <span class="badge">${esc(cur.weeks)}</span>
        ${best ? `<span class="badge ${blockQuizPassed(cur.id) ? "ok" : ""}">Тест ${Math.round(best.score / best.total * 100)}%</span>` : ""}
      </p>
      <div class="btn-row">
        <a class="btn primary" href="#/block/${cur.id}">Відкрити блок</a>
        <a class="btn ghost fit" href="#/quiz/${cur.id}">Тест</a>
      </div>
    </section>`}

    <section class="card">
      <p class="overline">Практика цього тижня</p>
      <div class="week-sessions">
        <span class="practice-num ${sw >= 2 ? "ok" : ""}">${sw} / 2</span>
        ${sw >= 2
          ? `<span class="badge ok">мінімум виконано</span>`
          : `<span class="badge">мінімум — 2 на тиждень</span>`}
      </div>
      <a class="btn ghost wide" href="#/journal/new">+ Запис у журнал</a>
    </section>

    ${Object.keys(S.quizWrong).length ? `
    <section class="card repeat-card">
      <div style="flex:1">
        <h3>Повторення</h3>
        <p class="repeat-sub">Питань з помилками: ${Object.keys(S.quizWrong).length}</p>
      </div>
      <a class="btn ink" href="#/review">Повторити</a>
    </section>` : ""}

    <details class="card details">
      <summary>Правила практики на весь курс</summary>
      <ol class="rules">${COURSE.rules.map(r => `<li>${esc(r)}</li>`).join("")}</ol>
      <p class="small muted"><b>Формула модуля:</b> ${esc(COURSE.formula)}</p>
    </details>

    <details class="card details">
      <summary>Мета курсу</summary>
      <p class="small">${esc(COURSE.goal)}</p>
      <p class="small muted">${esc(COURSE.duration)}</p>
    </details>
  </main>
  ${nav("#/")}`;
}

// ── Список блоків ────────────────────────────────────────

function viewBlocks() {
  const checkIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  return `
  ${header("Курс")}
  <main>
    ${COURSE.blocks.map(b => {
      const done = blockDone(b.id);
      const cur = currentBlock().id === b.id && !done;
      const quiz = blockQuizPassed(b.id);
      const check = blockChecklistDone(b);
      return `<a class="card block-card ${done ? "b-done" : ""} ${cur ? "b-cur" : ""}" href="#/block/${b.id}">
        <div class="block-num">${done ? checkIcon : b.id}</div>
        <div class="block-info">
          <h3>Блок ${b.id} · ${esc(b.title)}</h3>
          <p class="badges sm">
            <span class="badge">${esc(b.weeks)}</span>
            ${b.exit.length ? `<span class="badge ${check ? "ok" : ""}">чеклист ${b.exit.filter((_, i) => S.checklist[`b${b.id}-${i}`]).length}/${b.exit.length}</span>` : ""}
            <span class="badge ${quiz ? "ok" : ""}">тест ${quiz ? "складено" : "—"}</span>
          </p>
        </div>
      </a>`;
    }).join("")}
    <details class="card details">
      <summary>Бібліотека курсу</summary>
      <p class="overline">Хребет</p>
      <ul class="small">${COURSE.library.core.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <p class="overline">Наркологія</p>
      <ul class="small">${COURSE.library.addiction.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      <p class="overline">Відео</p>
      <p class="small">${esc(COURSE.library.video)}</p>
    </details>
  </main>
  ${nav("#/blocks")}`;
}

// ── Блок ─────────────────────────────────────────────────

function viewBlock(id) {
  const b = COURSE.blocks.find(x => x.id === id);
  if (!b) { location.hash = "#/blocks"; return ""; }
  const done = blockDone(id);
  const quizPassed = blockQuizPassed(id);
  const checkDone = blockChecklistDone(b);
  const best = blockBestQuiz(id);
  const qCount = QUIZ.filter(q => q.block === id).length;
  return `
  ${header(`Блок ${b.id} · ${b.title}`, "#/blocks")}
  <main>
    <section class="card">
      <p class="badges">
        <span class="badge">${esc(b.weeks)}</span>
        <span class="badge ${done ? "ok" : ""}">${done ? "закрито" : "не закрито"}</span>
      </p>
      ${b.ctsr.length ? `<p class="overline" style="margin-top:14px">Цільові пункти CTS-R</p>
      <p class="badges">${b.ctsr.map(k => `<span class="badge accent">${esc(CTSR_ITEMS[k])}</span>`).join("")}</p>` : ""}
    </section>

    <section class="card"><p class="overline">Теорія</p><p>${esc(b.theory)}</p></section>
    <section class="card"><p class="overline">Дриль</p><p>${esc(b.drill)}</p></section>
    ${b.trap ? `<section class="card trap">
      <div class="trap-head">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg>
        <p class="overline">Пастка блоку</p>
      </div>
      <p>${esc(b.trap)}</p>
    </section>` : ""}

    <section class="card checklist">
      <p class="overline">Критерій виходу</p>
      ${b.exit.map((e, i) => {
        const k = `b${b.id}-${i}`;
        return `<label class="check-row"><input type="checkbox" data-check="${k}" ${S.checklist[k] ? "checked" : ""}><span>${esc(e)}</span></label>`;
      }).join("")}
    </section>

    <section class="card">
      <p class="overline">Оцінка знань</p>
      <p class="badges">
        <span class="badge">${qCount} питань</span>
        <span class="badge">поріг ${Math.round(PASS * 100)}%</span>
        ${best ? `<span class="badge ${quizPassed ? "ok" : ""}">найкращий ${Math.round(best.score / best.total * 100)}%</span>` : ""}
      </p>
      <a class="btn primary wide" href="#/quiz/${id}">${best ? "Пройти ще раз" : "Пройти тест"}</a>
    </section>

    ${done
      ? `<button class="btn ghost wide" data-reopen="${id}">Відкрити блок знову</button>`
      : `<button class="btn ${checkDone && quizPassed ? "primary" : "ghost"} wide" data-close="${id}">Закрити блок</button>
         ${checkDone && quizPassed ? "" : `<p class="small muted center">Рекомендація: спершу чеклист і тест. Закрити можна і так — темп вільний.</p>`}`}
  </main>
  ${nav("#/blocks")}`;
}

// ── Тест ─────────────────────────────────────────────────

let quizState = null; // { blockId|null(review), questions, i, correct, wrongIds, answered }

function startQuiz(blockId) {
  const qs = shuffle(QUIZ.filter(q => q.block === blockId));
  quizState = { blockId, questions: qs, i: 0, correct: 0, wrongIds: [], answered: false };
}
function startReview() {
  const ids = Object.keys(S.quizWrong);
  const qs = shuffle(QUIZ.filter(q => ids.includes(q.id)));
  quizState = { blockId: null, questions: qs, i: 0, correct: 0, wrongIds: [], answered: false };
}

function viewQuiz() {
  const qz = quizState;
  if (!qz || !qz.questions.length) { location.hash = "#/blocks"; return ""; }
  if (qz.i >= qz.questions.length) return viewQuizResult();
  const q = qz.questions[qz.i];
  if (!qz.shuffled || qz.shuffledFor !== qz.i) {
    qz.shuffled = shuffle(q.options.map((text, idx) => ({ text, idx })));
    qz.shuffledFor = qz.i;
  }
  const title = qz.blockId === null ? "Повторення" : `Тест · Блок ${qz.blockId}`;
  const LETTERS = "АБВГДЕ";
  const iconOk = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  const iconNo = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  return `
  <header class="top">
    <a class="back" href="${qz.blockId === null ? "#/" : `#/block/${qz.blockId}`}">‹</a>
    <span class="quiz-crumb">${esc(title)}</span>
    <span class="quiz-count">${qz.i + 1} / ${qz.questions.length}</span>
  </header>
  <main>
    <div class="progress-bar slim"><div style="width:${Math.round(qz.i / qz.questions.length * 100)}%"></div></div>
    <div class="quiz-q">
      <p class="quiz-q-label">Питання ${qz.i + 1}</p>
      <p class="quiz-q-text">${esc(q.q)}</p>
    </div>
    <div class="options">
    ${qz.shuffled.map((o, pos) => {
      let cls = "", key = LETTERS[pos] || pos + 1;
      if (qz.answered) {
        if (o.idx === q.correct) { cls = "right"; key = iconOk; }
        else if (o.idx === qz.picked) { cls = "wrong"; key = iconNo; }
        else cls = "dim";
      }
      return `<button class="opt ${cls}" data-opt="${o.idx}" ${qz.answered ? "disabled" : ""}>
        <span class="opt-key">${key}</span><span class="opt-text">${esc(o.text)}</span>
      </button>`;
    }).join("")}
    </div>
    ${qz.answered ? `
      <div class="expl ${qz.picked === q.correct ? "expl-ok" : "expl-no"}">
        <p class="expl-label">${qz.picked === q.correct ? "Правильно" : "Неправильно"}</p>
        <p>${esc(q.expl)}</p>
      </div>
      <button class="btn primary wide" data-next>Далі →</button>` : ""}
  </main>`;
}

function viewQuizResult() {
  const qz = quizState;
  const total = qz.questions.length;
  const pct = qz.correct / total;
  const passed = pct >= PASS;
  if (!qz.saved) {
    qz.saved = true;
    if (qz.blockId !== null) {
      (S.quizAttempts[qz.blockId] = S.quizAttempts[qz.blockId] || []).push({
        date: todayISO(), score: qz.correct, total, passed,
      });
    }
    // облік помилок / повторення
    qz.wrongIds.forEach(id => { S.quizWrong[id] = (S.quizWrong[id] || 0) + 1; });
    if (qz.blockId === null) {
      // у режимі повторення правильні відповіді знімають питання зі списку
      qz.questions.forEach(q => {
        if (!qz.wrongIds.includes(q.id)) delete S.quizWrong[q.id];
      });
    }
    save();
  }
  const back = qz.blockId === null ? "#/" : `#/block/${qz.blockId}`;
  let pctLine, note;
  if (qz.blockId !== null) {
    pctLine = `<p class="result-pct ${passed ? "ok" : "no"}">${Math.round(pct * 100)}% — ${passed ? "тест складено" : "ще не складено"}</p>`;
    note = passed
      ? `Поріг — ${Math.round(PASS * 100)}%.`
      : `Поріг — ${Math.round(PASS * 100)}%. Питання з помилками потраплять у «Повторення».`;
  } else {
    pctLine = `<p class="result-pct ${qz.wrongIds.length ? "no" : "ok"}">${Math.round(pct * 100)}%</p>`;
    note = qz.wrongIds.length ? "Питання з помилками залишаються в повторенні." : "Усі помилки опрацьовано.";
  }
  return `
  <header class="top">
    <a class="back" href="${back}">‹</a>
    <span class="quiz-crumb">${qz.blockId === null ? "Повторення" : `Тест · Блок ${qz.blockId}`}</span>
  </header>
  <main>
    <section class="result-card">
      <p class="result-overline">Результат</p>
      <div class="result-score">${qz.correct} / ${total}</div>
      ${pctLine}
      <p class="result-note">${note}</p>
    </section>
    <a class="btn primary wide" href="${back}">Готово</a>
    <button class="btn ghost wide" data-retry>Ще раз</button>
  </main>`;
}

// ── Журнал ───────────────────────────────────────────────

function viewJournal() {
  const list = S.sessions.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.id - a.id));
  return `
  ${header("Журнал")}
  <main>
    <a class="btn primary wide" href="#/journal/new">+ Нова сесія</a>
    <p class="journal-hint">${esc(COURSE.journal.hint)}</p>
    ${list.length ? list.map(s => {
      const b = COURSE.blocks.find(x => x.id === s.block);
      const m = mitiEval(s.miti);
      const flag = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h2v18H4zM6 4h11l-3 4 3 4H6z"/></svg>';
      return `<section class="card session">
        <div class="session-head">
          <span class="session-date">${fmtDate(s.date)}</span>
          <span class="badge accent">Блок ${s.block}${b ? " · " + esc(b.title) : ""}</span>
          ${s.redFlag ? `<span class="session-flag" title="Червоний прапорець">${flag}</span>` : ""}
        </div>
        ${s.patient || s.focus ? `<div class="session-grid">
          ${s.patient ? `<span class="session-label">Пацієнт</span><span>${esc(s.patient)}</span>` : ""}
          ${s.focus ? `<span class="session-label">Фокус</span><span>${esc(s.focus)}</span>` : ""}
        </div>` : ""}
        ${Object.keys(s.scores || {}).length ? `<div class="session-chips">${Object.entries(s.scores).map(([k, v]) =>
          `<span class="badge ${v >= 3 ? "ok" : ""}">${esc(CTSR_ITEMS[k] || k)} ${v}</span>`).join("")}</div>` : ""}
        ${m ? `<div class="session-chips">
          <span class="badge ${m.ratioOk ? "ok" : "no"}">Р:П ${m.ratio === Infinity ? "∞" : m.ratio.toFixed(1)}</span>
          <span class="badge ${m.complexOk ? "ok" : "no"}">складні ${Math.round(m.pctComplex * 100)}%</span>
          <span class="badge ${m.inconsOk ? "ok" : "no"}">MI-неузг. ${m.incons}</span></div>` : ""}
        ${s.narco ? `<div class="session-chips">
          <span class="badge ${s.narco.craving ? "ok" : ""}">крейвінг/тригери: ${s.narco.craving ? "було" : "не було"}</span>
          <span class="badge ${s.narco.relapse ? "ok" : ""}">профілактика рецидиву: ${s.narco.relapse ? "було" : "не було"}</span></div>` : ""}
        ${s.note ? `<div class="session-note">
          <p class="overline">Наступного разу інакше</p>
          <p>${esc(s.note)}</p>
        </div>` : ""}
        <div class="session-actions">
          <button class="link-btn" data-del-session="${s.id}">Видалити</button>
        </div>
      </section>`;
    }).join("") : `<section class="card center muted session-empty"><p>Поки що порожньо.<br>Після першої сесії в тренажері — додайте запис.</p></section>`}
  </main>
  ${nav("#/journal")}`;
}

function viewJournalNew() {
  const cur = currentBlock();
  return `
  ${header("Нова сесія", "#/journal")}
  <main>
    <form id="session-form" class="form">
      <div class="card">
        <label>Дата <input type="date" name="date" value="${todayISO()}" required></label>
        <label>Пацієнт (діагноз / етап / налаштування)
          <input type="text" name="patient" placeholder="напр.: алкогольна залежність, амбівалентний"></label>
        <label>Фокус сесії
          <input type="text" name="focus" placeholder="напр.: OARS — відкриті питання і рефлексії"></label>
        <label>Блок
          <select name="block" id="block-select">
            ${COURSE.blocks.map(b => `<option value="${b.id}" ${b.id === cur.id ? "selected" : ""}>Блок ${b.id} · ${esc(b.title)}</option>`).join("")}
          </select></label>
      </div>
      <div id="score-fields"></div>
      <div class="card">
        <label>Одна річ, яку наступного разу зроблю інакше
          <textarea name="note" rows="3"></textarea></label>
        <label class="check-row"><input type="checkbox" name="redFlag"><span>Червоний прапорець (пропущений скринінг безпеки)</span>
          <span class="session-flag"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 3h2v18H4zM6 4h11l-3 4 3 4H6z"/></svg></span></label>
      </div>
      <button class="btn primary wide" type="submit">Зберегти</button>
    </form>
  </main>`;
}

function scoreFieldsHTML(blockId) {
  const b = COURSE.blocks.find(x => x.id === blockId);
  if (!b) return "";
  let html = "";
  if (b.ctsr.length) {
    html += `<div class="card"><p class="overline">Бали CTS-R · 0–6</p>` + b.ctsr.map(k => `
      <label class="score-row">${esc(CTSR_ITEMS[k])}
        <select name="score-${k}"><option value="">—</option>${[0, 1, 2, 3, 4, 5, 6].map(v => `<option value="${v}">${v}</option>`).join("")}</select>
      </label>`).join("") + `</div>`;
  }
  if (b.miti) {
    html += `<div class="card"><p class="overline">MITI-лічильник</p>
      <div class="miti-grid">
        <label>Прості рефлексії <input type="number" name="miti-simple" min="0" inputmode="numeric" placeholder="0"></label>
        <label>Складні рефлексії <input type="number" name="miti-complex" min="0" inputmode="numeric" placeholder="0"></label>
        <label>Питання <input type="number" name="miti-questions" min="0" inputmode="numeric" placeholder="0"></label>
        <label>MI-неузгоджені <input type="number" name="miti-incons" min="0" inputmode="numeric" placeholder="0"></label>
      </div>
      <p class="form-hint">Пороги: Р:П ≥ 1 · складні ≥ 40% · MI-неузгоджені = 0</p></div>`;
  }
  if (b.narco) {
    html += `<div class="card"><p class="overline">Наркологічна специфіка</p>
      <label class="check-row"><input type="checkbox" name="narco-craving"><span>Крейвінг / тригери — було</span></label>
      <label class="check-row"><input type="checkbox" name="narco-relapse"><span>Профілактика рецидиву — було</span></label></div>`;
  }
  return html;
}

// ── Динаміка ─────────────────────────────────────────────

function sparkline(values) {
  // values: масив 0..6
  const w = 311, h = 72, pad = 8;
  if (values.length === 1) values = [values[0], values[0]];
  const step = (w - pad * 2) / (values.length - 1);
  const y = v => h - pad - (v / 6) * (h - pad * 2);
  const pts = values.map((v, i) => `${(pad + i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" class="spark" preserveAspectRatio="none">
    <line x1="0" y1="${y(3)}" x2="${w}" y2="${y(3)}" class="spark-target"/>
    <polyline points="${pts}" class="spark-line"/>
    ${values.map((v, i) => `<circle cx="${(pad + i * step).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4.5" class="spark-dot ${v >= 3 ? "ok" : ""}"/>`).join("")}
  </svg>`;
}

function pluralSessions(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "сесія";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "сесії";
  return "сесій";
}

function isStalled(vals) {
  // підказка «пункт не росте»: ≥4 вимірів і останні 2 не вищі за попередні 2
  if (vals.length < 4) return false;
  const last2 = Math.max(...vals.slice(-2));
  const prev2 = Math.max(...vals.slice(-4, -2));
  return last2 <= prev2 && last2 < 6;
}

function viewStats() {
  const ordered = S.sessions.slice().sort((a, b) => a.date.localeCompare(b.date) || (a.id - b.id));
  const series = {};
  ordered.forEach(s => Object.entries(s.scores || {}).forEach(([k, v]) => {
    (series[k] = series[k] || []).push(Number(v));
  }));
  const keys = Object.keys(CTSR_ITEMS).filter(k => series[k]);
  const mitiSessions = ordered.filter(s => s.miti);
  return `
  ${header("Динаміка")}
  <main>
    ${keys.length ? keys.map(k => {
      const vals = series[k];
      const last = vals[vals.length - 1];
      const stalled = isStalled(vals);
      return `<section class="card ${stalled ? "trap" : ""}">
        <div class="stat-head">
          <span class="stat-name">${esc(CTSR_ITEMS[k])}</span>
          <span class="stat-val ${!stalled && last >= 3 ? "ok" : ""}">${last}<span class="stat-of"> / 6</span></span>
        </div>
        ${sparkline(vals)}
        ${stalled
          ? `<p class="small">Пункт не росте — за правилами курсу він стає фокусом позачергової сесії.</p>`
          : `<div class="stat-meta"><span>${vals.length} ${pluralSessions(vals.length)}</span><span>пунктир — ціль 3</span></div>`}
      </section>`;
    }).join("") : `<section class="card center muted"><p>Дані з'являться після записів у журналі з балами CTS-R.</p></section>`}
    ${mitiSessions.length ? `<section class="card">
      <p class="overline">MITI за сесіями</p>
      ${mitiSessions.slice(-8).reverse().map(s => {
        const m = mitiEval(s.miti);
        return `<div class="miti-row">
          <span class="miti-date">${fmtDateShort(s.date)}</span>
          <span class="badges sm">
            <span class="badge ${m.ratioOk ? "ok" : "no"}">Р:П ${m.ratio === Infinity ? "∞" : m.ratio.toFixed(1)}</span>
            <span class="badge ${m.complexOk ? "ok" : "no"}">складні ${Math.round(m.pctComplex * 100)}%</span>
            <span class="badge ${m.inconsOk ? "ok" : "no"}">MI-неузг. ${m.incons}</span>
          </span>
        </div>`;
      }).join("")}</section>` : ""}
    <p class="muted small center">${esc(COURSE.journal.monthly)}</p>
  </main>
  ${nav("#/stats")}`;
}

// ── Налаштування ─────────────────────────────────────────

function viewSettings() {
  return `
  ${header("Ще")}
  <main>
    <section class="card form">
      <label>Дата початку курсу
        <input type="date" id="start-date" value="${S.startDate || ""}"></label>
      <p class="settings-note">Від неї рахується поточний тиждень курсу на Головній. Темп курсу вільний.</p>
    </section>
    <section class="card">
      <p class="overline">Дані</p>
      <button class="btn ghost wide" id="export-json">Зберегти бекап (JSON)</button>
      <button class="btn ghost wide" id="export-md">Експорт журналу (Markdown)</button>
      <label class="btn ghost wide file-btn">Відновити з бекапу…<input type="file" id="import-json" accept=".json,application/json" hidden></label>
      <p class="settings-note">Дані зберігаються лише на цьому пристрої.</p>
    </section>
    <section class="card">
      <p class="overline">Про курс</p>
      <p class="small">${esc(COURSE.limits)}</p>
    </section>
    <section class="card danger-card">
      <p class="overline">Небезпечна зона</p>
      <button class="btn danger wide" id="reset-all">Скинути всі дані</button>
      <p class="settings-note">Подвійне підтвердження. Дію неможливо скасувати.</p>
    </section>
  </main>
  ${nav("#/settings")}`;
}

// ── Експорт ──────────────────────────────────────────────

function download(filename, text, type) {
  const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function journalToMarkdown() {
  const list = S.sessions.slice().sort((a, b) => a.date.localeCompare(b.date) || (a.id - b.id));
  let md = `# Журнал сесій — КПТ-курс\n\n`;
  list.forEach(s => {
    const b = COURSE.blocks.find(x => x.id === s.block);
    md += `## ${s.date} — Блок ${s.block}${b ? ` (${b.title})` : ""}\n\n`;
    if (s.patient) md += `- **Пацієнт:** ${s.patient}\n`;
    if (s.focus) md += `- **Фокус:** ${s.focus}\n`;
    const sc = Object.entries(s.scores || {});
    if (sc.length) md += `- **Бали:** ${sc.map(([k, v]) => `${CTSR_ITEMS[k] || k}: ${v}`).join(" · ")}\n`;
    if (s.miti) {
      const m = mitiEval(s.miti);
      md += `- **MITI:** рефлексії:питання ${m.ratio === Infinity ? "∞" : m.ratio.toFixed(1)} · складні ${Math.round(m.pctComplex * 100)}% · неузгоджені ${m.incons}\n`;
    }
    if (s.narco) md += `- **Нарко-специфіка:** крейвінг/тригери — ${s.narco.craving ? "було" : "не було"}; профілактика рецидиву — ${s.narco.relapse ? "було" : "не було"}\n`;
    if (s.redFlag) md += `- 🚩 **Червоний прапорець**\n`;
    if (s.note) md += `- **Наступного разу інакше:** ${s.note}\n`;
    md += `\n`;
  });
  return md;
}

// ── Роутер і події ───────────────────────────────────────

function render() {
  const h = location.hash || "#/";
  let html;
  let m;
  if (h === "#/") html = viewDashboard();
  else if (h === "#/blocks") html = viewBlocks();
  else if ((m = h.match(/^#\/block\/(\d+)$/))) html = viewBlock(Number(m[1]));
  else if ((m = h.match(/^#\/quiz\/(\d+)$/))) {
    if (!quizState || quizState.blockId !== Number(m[1]) || quizState.saved) startQuiz(Number(m[1]));
    html = viewQuiz();
  }
  else if (h === "#/review") {
    if (!quizState || quizState.blockId !== null || quizState.saved) startReview();
    html = viewQuiz();
  }
  else if (h === "#/journal") html = viewJournal();
  else if (h === "#/journal/new") html = viewJournalNew();
  else if (h === "#/stats") html = viewStats();
  else if (h === "#/settings") html = viewSettings();
  else { location.hash = "#/"; return; }
  $app().innerHTML = html;
  bindEvents(h);
  window.scrollTo(0, 0);
}

function bindEvents(h) {
  // чеклисти блоку
  document.querySelectorAll("[data-check]").forEach(el => {
    el.addEventListener("change", () => {
      S.checklist[el.dataset.check] = el.checked;
      if (!el.checked) delete S.checklist[el.dataset.check];
      save();
    });
  });
  // закриття/відкриття блоку
  document.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", () => {
    const id = Number(el.dataset.close);
    const b = COURSE.blocks.find(x => x.id === id);
    if (!(blockChecklistDone(b) && blockQuizPassed(id))) {
      if (!confirm("Чеклист або тест ще не завершені. Закрити блок все одно?")) return;
    }
    S.blockDone[id] = true; save(); render();
  }));
  document.querySelectorAll("[data-reopen]").forEach(el => el.addEventListener("click", () => {
    delete S.blockDone[el.dataset.reopen]; save(); render();
  }));
  // тест
  document.querySelectorAll("[data-opt]").forEach(el => el.addEventListener("click", () => {
    const qz = quizState;
    if (qz.answered) return;
    qz.answered = true;
    qz.picked = Number(el.dataset.opt);
    const q = qz.questions[qz.i];
    if (qz.picked === q.correct) qz.correct++;
    else qz.wrongIds.push(q.id);
    $app().innerHTML = viewQuiz();
    bindEvents(h);
  }));
  const next = document.querySelector("[data-next]");
  if (next) next.addEventListener("click", () => {
    quizState.i++; quizState.answered = false; quizState.picked = undefined;
    $app().innerHTML = viewQuiz();
    bindEvents(h);
    window.scrollTo(0, 0);
  });
  const retry = document.querySelector("[data-retry]");
  if (retry) retry.addEventListener("click", () => {
    if (quizState.blockId === null) startReview(); else startQuiz(quizState.blockId);
    if (!quizState.questions.length) { location.hash = "#/"; return; }
    $app().innerHTML = viewQuiz();
    bindEvents(h);
  });
  // форма сесії
  const form = document.getElementById("session-form");
  if (form) {
    const blockSel = document.getElementById("block-select");
    const scoreDiv = document.getElementById("score-fields");
    const fill = () => { scoreDiv.innerHTML = scoreFieldsHTML(Number(blockSel.value)); };
    blockSel.addEventListener("change", fill);
    fill();
    form.addEventListener("submit", e => {
      e.preventDefault();
      const fd = new FormData(form);
      const blockId = Number(fd.get("block"));
      const b = COURSE.blocks.find(x => x.id === blockId);
      const scores = {};
      (b.ctsr || []).forEach(k => {
        const v = fd.get(`score-${k}`);
        if (v !== null && v !== "") scores[k] = Number(v);
      });
      let miti = null;
      if (b.miti) {
        const num = n => Number(fd.get(n) || 0);
        miti = { simple: num("miti-simple"), complex: num("miti-complex"), questions: num("miti-questions"), incons: num("miti-incons") };
        if (!miti.simple && !miti.complex && !miti.questions && !miti.incons) miti = null;
      }
      const narco = b.narco ? { craving: !!fd.get("narco-craving"), relapse: !!fd.get("narco-relapse") } : null;
      S.sessions.push({
        id: Date.now(),
        date: fd.get("date"),
        patient: fd.get("patient").trim(),
        focus: fd.get("focus").trim(),
        block: blockId,
        scores, miti, narco,
        redFlag: !!fd.get("redFlag"),
        note: fd.get("note").trim(),
      });
      save();
      location.hash = "#/journal";
    });
  }
  // видалення сесії
  document.querySelectorAll("[data-del-session]").forEach(el => el.addEventListener("click", () => {
    if (!confirm("Видалити цей запис?")) return;
    S.sessions = S.sessions.filter(s => String(s.id) !== el.dataset.delSession);
    save(); render();
  }));
  // налаштування
  const sd = document.getElementById("start-date");
  if (sd) sd.addEventListener("change", () => { S.startDate = sd.value || null; save(); });
  const ej = document.getElementById("export-json");
  if (ej) ej.addEventListener("click", () => download(`kpt-kurs-backup-${todayISO()}.json`, Store.export(S), "application/json"));
  const em = document.getElementById("export-md");
  if (em) em.addEventListener("click", () => download(`kpt-zhurnal-${todayISO()}.md`, journalToMarkdown(), "text/markdown"));
  const ij = document.getElementById("import-json");
  if (ij) ij.addEventListener("change", () => {
    const f = ij.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        S = Store.import(r.result);
        alert("Дані відновлено ✅");
        render();
      } catch (e) { alert("Не вдалося прочитати файл: " + e.message); }
    };
    r.readAsText(f);
  });
  const rs = document.getElementById("reset-all");
  if (rs) rs.addEventListener("click", () => {
    if (!confirm("Видалити ВСІ дані (журнал, прогрес, результати тестів)? Це незворотно.")) return;
    if (!confirm("Точно? Рекомендується спершу зробити бекап.")) return;
    S = Store.defaults(); save(); location.hash = "#/"; render();
  });
}

window.addEventListener("hashchange", render);
render();

// PWA: реєстрація service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
