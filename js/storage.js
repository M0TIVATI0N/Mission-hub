/*
 * MissionStore — every piece of saved user data lives here.
 * All values are stored in localStorage as JSON, and every read has a safe
 * fallback, so the pages keep working when localStorage is empty or blocked.
 */
(() => {
  "use strict";

  const KEYS = {
    users: "missionHub.users",
    session: "missionHub.session",
    saved: "missionHub.saved",
    briefs: "missionHub.briefs",
    quiz: "missionHub.quiz",
  };
  const SAVED_TYPES = ["mission", "vehicle"];

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        return fallback;
      }
      const value = JSON.parse(raw);
      return value === null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }

  function readList(key) {
    const value = read(key, []);
    return Array.isArray(value) ? value : [];
  }

  // Tells every listener on the page (navigation counter, save buttons…)
  // that saved data has changed.
  function notify() {
    document.dispatchEvent(new CustomEvent("missionhub:change"));
  }

  function normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  }

  /* ---------- Accounts ---------- */

  function getUsers() {
    return readList(KEYS.users).filter(
      (user) => user && typeof user.email === "string" && typeof user.name === "string",
    );
  }

  function findUser(email) {
    const wanted = normalizeEmail(email);
    return getUsers().find((user) => user.email === wanted) || null;
  }

  function createUser(details) {
    const users = getUsers();
    const user = {
      name: details.name.trim(),
      email: normalizeEmail(details.email),
      password: details.password,
      destination: details.destination,
      joined: new Date().toISOString(),
    };
    users.push(user);
    return write(KEYS.users, users) ? user : null;
  }

  function checkLogin(email, password) {
    const user = findUser(email);
    return user && user.password === password ? user : null;
  }

  function logIn(email) {
    write(KEYS.session, {
      email: normalizeEmail(email),
      since: new Date().toISOString(),
    });
    notify();
  }

  function logOut() {
    remove(KEYS.session);
    notify();
  }

  function getSession() {
    const session = read(KEYS.session, null);
    return session && typeof session.email === "string" ? session : null;
  }

  function currentUser() {
    const session = getSession();
    return session ? findUser(session.email) : null;
  }

  /* ---------- Saved missions and vehicles ---------- */

  function getSaved() {
    return readList(KEYS.saved).filter(
      (item) => item && SAVED_TYPES.includes(item.type) && typeof item.id === "string",
    );
  }

  function isSaved(type, id) {
    return getSaved().some((item) => item.type === type && item.id === id);
  }

  // Adds the item if it is new, removes it if it is already saved.
  // Returns true when the item is saved after the call.
  function toggleSaved(type, id) {
    const saved = getSaved();
    const index = saved.findIndex((item) => item.type === type && item.id === id);
    if (index === -1) {
      saved.push({ type, id, savedAt: new Date().toISOString() });
    } else {
      saved.splice(index, 1);
    }
    write(KEYS.saved, saved);
    notify();
    return index === -1;
  }

  function removeSaved(type, id) {
    write(
      KEYS.saved,
      getSaved().filter((item) => !(item.type === type && item.id === id)),
    );
    notify();
  }

  /* ---------- Mission briefs from the Launch Lab ---------- */

  function getBriefs() {
    return readList(KEYS.briefs).filter(
      (brief) => brief && typeof brief.id === "string" && Number.isFinite(brief.budget),
    );
  }

  function addBrief(brief) {
    const briefs = getBriefs();
    const stored = {
      ...brief,
      id: `brief-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    briefs.push(stored);
    write(KEYS.briefs, briefs);
    notify();
    return stored;
  }

  function removeBrief(id) {
    write(
      KEYS.briefs,
      getBriefs().filter((brief) => brief.id !== id),
    );
    notify();
  }

  function briefsTotal() {
    return getBriefs().reduce((total, brief) => total + brief.budget, 0);
  }

  /* ---------- Quiz results ---------- */

  function getQuiz() {
    const quiz = read(KEYS.quiz, {});
    return {
      best: Number.isInteger(quiz.best) ? quiz.best : null,
      last: Number.isInteger(quiz.last) ? quiz.last : null,
      total: Number.isInteger(quiz.total) ? quiz.total : null,
      attempts: Number.isInteger(quiz.attempts) ? quiz.attempts : 0,
    };
  }

  function recordQuiz(score, total) {
    const quiz = getQuiz();
    const isBest = quiz.best === null || score > quiz.best;
    const result = {
      best: isBest ? score : quiz.best,
      last: score,
      total,
      attempts: quiz.attempts + 1,
    };
    write(KEYS.quiz, result);
    notify();
    return { ...result, isBest };
  }

  /* ---------- Shared helpers ---------- */

  function savedCount() {
    return getSaved().length + getBriefs().length;
  }

  function clearAll() {
    remove(KEYS.saved);
    remove(KEYS.briefs);
    notify();
  }

  window.MissionStore = {
    keys: KEYS,
    findUser,
    createUser,
    checkLogin,
    logIn,
    logOut,
    getSession,
    currentUser,
    getSaved,
    isSaved,
    toggleSaved,
    removeSaved,
    getBriefs,
    addBrief,
    removeBrief,
    briefsTotal,
    getQuiz,
    recordQuiz,
    savedCount,
    clearAll,
  };
})();
