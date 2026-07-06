// Лінт банків питань: перевіряє, що правильну відповідь не можна вгадати за формою.
// Запуск: node scripts/lint-quiz.mjs [base|pro|all]
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..");

function loadBank(rel, varName) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  return (0, eval)(`${src}; ${varName}`);
}

// Фрази-«солом'яні» дистрактори, які відкидаються без знання матеріалу
const STRAW = [
  /різниці немає/i, /немає різниці/i, /це синоніми/i, /одне й те саме/i,
  /це неможливо/i, /ніколи не/i, /завжди помилк/i, /без функції/i,
  /не бере участі/i, /не існує/i,
];

function lintBank(name, bank, { difficulty }) {
  const errors = [];
  const warns = [];
  const ids = new Set();
  const stems = new Map();
  let correctLongest = 0;

  bank.forEach(q => {
    const tag = `${name}:${q.id}`;
    if (ids.has(q.id)) errors.push(`${tag} — дубль id`);
    ids.add(q.id);

    const stem = q.q.toLowerCase().replace(/\s+/g, " ").trim();
    if (stems.has(stem)) errors.push(`${tag} — дубль питання (${stems.get(stem)})`);
    stems.set(stem, q.id);

    if (!Array.isArray(q.options) || q.options.length !== 4)
      errors.push(`${tag} — має бути рівно 4 варіанти`);
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length))
      errors.push(`${tag} — індекс correct поза межами`);
    if (!q.expl || q.expl.length < 40)
      warns.push(`${tag} — пояснення закоротке або відсутнє`);
    if (difficulty && ![1, 2, 3].includes(q.d))
      errors.push(`${tag} — відсутній/невалідний тег складності d`);

    // Дисципліна довжини: правильна не має виділятися серед дистракторів
    const lens = q.options.map(o => o.length);
    const cLen = lens[q.correct];
    const dLens = lens.filter((_, i) => i !== q.correct);
    const dAvg = dLens.reduce((a, b) => a + b, 0) / dLens.length;
    const ratio = cLen / dAvg;
    if (ratio > 1.5 || ratio < 0.6)
      errors.push(`${tag} — правильна ${cLen} зн. vs дистрактори ~${Math.round(dAvg)} зн. (×${ratio.toFixed(2)})`);
    else if (ratio > 1.3 || ratio < 0.72)
      warns.push(`${tag} — довжина правильної помітно відрізняється (×${ratio.toFixed(2)})`);
    if (cLen >= Math.max(...lens)) correctLongest++;

    q.options.forEach((o, i) => {
      if (i === q.correct) return;
      STRAW.forEach(re => { if (re.test(o)) warns.push(`${tag} — солом'яний дистрактор: «${o.slice(0, 50)}»`); });
    });
  });

  // Агрегати
  const pctLongest = correctLongest / bank.length;
  if (pctLongest > 0.4)
    errors.push(`${name} — правильна відповідь найдовша у ${Math.round(pctLongest * 100)}% питань (має бути <40%)`);

  const dist = {};
  bank.forEach(q => { dist[q.correct] = (dist[q.correct] || 0) + 1; });
  const maxShare = Math.max(...Object.values(dist)) / bank.length;
  if (maxShare > 0.45)
    warns.push(`${name} — перекіс індексів correct: ${JSON.stringify(dist)}`);

  const perBlock = {};
  bank.forEach(q => { perBlock[q.block] = (perBlock[q.block] || 0) + 1; });

  console.log(`\n═══ ${name}: ${bank.length} питань ═══`);
  console.log(`Питань на блок: ${Object.entries(perBlock).map(([b, n]) => `Б${b}:${n}`).join(" ")}`);
  console.log(`Правильна найдовша: ${Math.round(pctLongest * 100)}% · розподіл correct: ${JSON.stringify(dist)}`);
  if (difficulty) {
    const dd = {};
    bank.forEach(q => { dd[q.d] = (dd[q.d] || 0) + 1; });
    console.log(`Складність: ${JSON.stringify(dd)}`);
  }
  errors.forEach(e => console.log(`  ✗ ${e}`));
  warns.forEach(w => console.log(`  ⚠ ${w}`));
  console.log(errors.length ? `✗ ${errors.length} помилок, ${warns.length} попереджень` : `✓ помилок немає, ${warns.length} попереджень`);
  return errors.length;
}

const mode = process.argv[2] || "all";
let failed = 0;
const banks = [];
if (mode === "base" || mode === "all") banks.push(["base", loadBank("docs/js/data/quiz.js", "QUIZ"), { difficulty: false }]);
if (mode === "pro" || mode === "all") banks.push(["pro", loadBank("docs/js/data/quiz-pro.js", "QUIZ_PRO"), { difficulty: true }]);

// Дублі id між банками ламають режим «Повторення»
if (banks.length === 2) {
  const a = new Set(banks[0][1].map(q => q.id));
  banks[1][1].forEach(q => { if (a.has(q.id)) { console.log(`✗ id ${q.id} є в обох банках`); failed++; } });
}
banks.forEach(([n, b, o]) => { failed += lintBank(n, b, o); });
process.exit(failed ? 1 : 0);
