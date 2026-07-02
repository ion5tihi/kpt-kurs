// Локальне сховище: увесь стан користувача в одному об'єкті localStorage.
const Store = {
  KEY: "kpt-kurs-state-v1",

  defaults() {
    return {
      startDate: null,           // ISO дата початку курсу
      checklist: {},             // { "b<блок>-<індекс>": true } — критерії виходу
      blockDone: {},             // { "<блок>": true } — блок закритий вручну
      sessions: [],              // журнал сесій
      quizAttempts: {},          // { "<блок>": [{date, score, total, passed}] }
      quizWrong: {},             // { "<питання id>": к-сть помилок } — для повторення
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return this.defaults();
      return Object.assign(this.defaults(), JSON.parse(raw));
    } catch (e) {
      return this.defaults();
    }
  },

  save(state) {
    localStorage.setItem(this.KEY, JSON.stringify(state));
  },

  export(state) {
    return JSON.stringify(state, null, 2);
  },

  import(json) {
    const data = JSON.parse(json); // кине помилку при невалідному JSON
    if (typeof data !== "object" || data === null || !Array.isArray(data.sessions)) {
      throw new Error("Файл не схожий на бекап цього застосунку");
    }
    const state = Object.assign(this.defaults(), data);
    this.save(state);
    return state;
  },
};
