import { LS_KEY } from "./config.js";

export function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    return {
      known: new Set(data.known || []),
      hard: new Set(data.hard || []),
      perDay: Number.isFinite(data.perDay) ? data.perDay : 10,
      deckMode: data.deckMode || "today"
    };
  } catch {
    return { known:new Set(), hard:new Set(), perDay:10, deckMode:"today" };
  }
}

export function saveProgressLocal(state, { silent=false, onToast } = {}) {
  const data = {
    known: [...state.known],
    hard: [...state.hard],
    perDay: state.perDay,
    deckMode: state.deckMode
  };
  localStorage.setItem(LS_KEY, JSON.stringify(data));
  if (!silent && typeof onToast === "function") onToast("Saved");
}
