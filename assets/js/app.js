import { WORDS } from "./words.js";
import { todayKey, shuffledIndices, normalize, overlapScore, escapeHtml } from "./utils.js";
import { loadProgress, saveProgressLocal } from "./storage.js";
import { toast } from "./toast.js";
import { createSupabaseClient } from "./supabase.js";

/* ===========================
   1) App state
   =========================== */
const state = loadProgress();
state.todayIdxs = [];
state.deck = [];
state.pos = 0;
state.flipped = false;
state.activeTab = "learn";
state.quizItem = null;
state.quizRevealed = false;

/* ===========================
   2) DOM refs
   =========================== */
const perDayEl = document.getElementById("perDay");
const deckModeEl = document.getElementById("deckMode");
const panelTitleEl = document.getElementById("panelTitle");

const flashPanel = document.getElementById("flashPanel");
const flashCard = document.getElementById("flashCard");
const flashWord = document.getElementById("flashWord");
const flashDef  = document.getElementById("flashDef");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const knownBtn = document.getElementById("knownBtn");
const hardBtn = document.getElementById("hardBtn");

const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

const todayMeta = document.getElementById("todayMeta");
const todayList = document.getElementById("todayList");

const quizPanel = document.getElementById("quizPanel");
const quizWord = document.getElementById("quizWord");
const quizAnswer = document.getElementById("quizAnswer");
const quizInput = document.getElementById("quizInput");
const quizFeedback = document.getElementById("quizFeedback");
const checkBtn = document.getElementById("checkBtn");
const revealBtn = document.getElementById("revealBtn");
const quizKnownBtn = document.getElementById("quizKnownBtn");
const quizHardBtn = document.getElementById("quizHardBtn");
const newQuizBtn = document.getElementById("newQuizBtn");

const browsePanel = document.getElementById("browsePanel");
const searchInput = document.getElementById("searchInput");
const searchList = document.getElementById("searchList");

const statsPanel = document.getElementById("statsPanel");
const stTotal = document.getElementById("stTotal");
const stKnown = document.getElementById("stKnown");
const stHard = document.getElementById("stHard");
const stUnseen = document.getElementById("stUnseen");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const backupNote = document.getElementById("backupNote");

const resetBtn = document.getElementById("resetBtn");

/* Auth refs */
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signInBtn = document.getElementById("signInBtn");
const signUpBtn = document.getElementById("signUpBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authStatus = document.getElementById("authStatus");


const userPill = document.getElementById("userPill");
const userNameEl = document.getElementById("userName");

const emailPill = emailInput?.closest(".pill");
const passwordPill = passwordInput?.closest(".pill");

const authSignedOut = document.getElementById("authSignedOut");
const authSignedIn  = document.getElementById("authSignedIn");

const authMenuWrap = document.getElementById("authMenuWrap");
const authMenuBtn = document.getElementById("authMenuBtn");
const authMenu = document.getElementById("authMenu");
const logoutBtnMobile = document.getElementById("logoutBtnMobile");



/* ===========================
   3) Storage wrappers
   =========================== */
function saveProgress() {
  saveProgressLocal(state, { silent:false, onToast: toast });
  scheduleCloudSync();
}
function saveSilently() {
  saveProgressLocal(state, { silent:true });
}

/* ===========================
   4) Deck building
   =========================== */
function buildToday() {
  const n = Math.max(5, Math.min(50, Number(perDayEl.value || 10)));
  state.perDay = n;
  const idxs = shuffledIndices(WORDS.length, "today|" + todayKey());
  state.todayIdxs = idxs.slice(0, n);
}

function buildDeck() {
  const mode = deckModeEl.value;
  state.deckMode = mode;

  if (mode === "today") {
    state.deck = state.todayIdxs.map(i => WORDS[i]);
  } else if (mode === "hard") {
    const hardItems = WORDS.filter(x => state.hard.has(x.id));
    state.deck = hardItems.length ? hardItems : state.todayIdxs.map(i => WORDS[i]);
  } else {
    state.deck = WORDS.slice();
  }

  state.pos = Math.max(0, Math.min(state.pos, state.deck.length - 1));
  state.flipped = false;
}

function currentItem() {
  if (!state.deck.length) return null;
  return state.deck[state.pos];
}

function ensureConsistency() {
  for (const id of state.known) state.hard.delete(id);
}

/* ===========================
   5) Rendering
   =========================== */
function renderFlash() {
  const item = currentItem();
  if (!item) {
    flashWord.textContent = "No words found";
    flashDef.textContent = "";
    return;
  }

  flashWord.textContent = item.w;
  flashDef.textContent = item.d || "(No definition provided in list)";
  flashDef.style.display = state.flipped ? "block" : "none";

  const pct = state.deck.length ? Math.round(((state.pos+1)/state.deck.length)*100) : 0;
  progressBar.style.width = pct + "%";

  const flags = [];
  if (state.known.has(item.id)) flags.push("Known ✓");
  if (state.hard.has(item.id)) flags.push("Hard ★");
  const flagText = flags.length ? ` • ${flags.join(" • ")}` : "";
  progressText.textContent = `${state.pos+1} / ${state.deck.length} (${pct}%)${flagText}`;
}

function renderTodayList() {
  todayList.innerHTML = "";
  const items = state.todayIdxs.map(i => WORDS[i]);
  const key = todayKey();
  todayMeta.textContent = `Date: ${key} • ${items.length} words`;

  items.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "item";
    div.style.cursor = "pointer";
    div.innerHTML = `
      <div class="itemtop">
        <div class="itemw">${idx+1}. ${escapeHtml(it.w)}</div>
        <div class="row" style="gap:6px;">
          ${state.known.has(it.id) ? `<span class="badge known">Known</span>` : ""}
          ${state.hard.has(it.id) ? `<span class="badge hard">Hard</span>` : ""}
        </div>
      </div>
      <div class="itemd">${escapeHtml(it.d || "")}</div>
    `;
    div.addEventListener("click", () => {
      if (state.deckMode !== "today") {
        deckModeEl.value = "today";
        buildDeck();
      }
      const pos = state.deck.findIndex(x => x.id === it.id);
      if (pos >= 0) state.pos = pos;
      state.flipped = false;
      renderAll();
      toast("Loaded");
    });
    todayList.appendChild(div);
  });
}

function renderStats() {
  stTotal.textContent = WORDS.length;
  stKnown.textContent = state.known.size;
  stHard.textContent = state.hard.size;
  stUnseen.textContent = Math.max(0, WORDS.length - state.known.size - state.hard.size);
}

function renderSearchList(query) {
  const q = normalize(query);
  const res = !q ? WORDS.slice(0, 30) : WORDS
    .map(it => {
      const score = Math.max(overlapScore(q, it.w), overlapScore(q, it.d));
      return { it, score };
    })
    .filter(x => x.score > 0.12)
    .sort((a,b)=>b.score-a.score)
    .slice(0, 60)
    .map(x=>x.it);

  searchList.innerHTML = "";
  res.forEach(it => {
    const div = document.createElement("div");
    div.className = "item";
    div.style.cursor = "pointer";
    div.innerHTML = `
      <div class="itemtop">
        <div class="itemw">${escapeHtml(it.id + ". " + it.w)}</div>
        <div class="row" style="gap:6px;">
          ${state.known.has(it.id) ? `<span class="badge known">Known</span>` : ""}
          ${state.hard.has(it.id) ? `<span class="badge hard">Hard</span>` : ""}
        </div>
      </div>
      <div class="itemd">${escapeHtml(it.d || "")}</div>
    `;
    div.addEventListener("click", () => {
      deckModeEl.value = "all";
      buildDeck();
      const pos = state.deck.findIndex(x => x.id === it.id);
      if (pos >= 0) state.pos = pos;
      state.flipped = false;
      switchTab("learn");
      renderAll();
      toast("Loaded");
    });
    searchList.appendChild(div);
  });
}

function renderQuiz() {
  if (!state.quizItem) {
    state.quizItem = pickQuizItem();
    state.quizRevealed = false;
  }
  quizWord.textContent = state.quizItem.w;
  quizAnswer.textContent = state.quizItem.d || "(No definition provided in list)";
  quizAnswer.style.display = state.quizRevealed ? "block" : "none";
  quizFeedback.textContent = "";
  quizInput.value = "";
  quizInput.focus();
}

function renderAll() {
  panelTitleEl.textContent =
    state.activeTab === "learn" ? "Learn" :
    state.activeTab === "quiz" ? "Quick Quiz" :
    state.activeTab === "browse" ? "Browse & Search" : "Stats";

  flashPanel.style.display  = state.activeTab === "learn" ? "block" : "none";
  quizPanel.style.display   = state.activeTab === "quiz" ? "block" : "none";
  browsePanel.style.display = state.activeTab === "browse" ? "block" : "none";
  statsPanel.style.display  = state.activeTab === "stats" ? "block" : "none";

  renderTodayList();
  renderFlash();
  if (state.activeTab === "browse") renderSearchList(searchInput.value);
  if (state.activeTab === "stats") renderStats();
  if (state.activeTab === "quiz") renderQuiz();

  saveSilently();
}

/* ===========================
   6) Actions
   =========================== */
function flip() { state.flipped = !state.flipped; renderFlash(); }
function prev() { state.pos = (state.pos - 1 + state.deck.length) % state.deck.length; state.flipped = false; renderFlash(); }
function next() { state.pos = (state.pos + 1) % state.deck.length; state.flipped = false; renderFlash(); }

function markKnown() {
  const it = currentItem(); if (!it) return;
  state.known.add(it.id); state.hard.delete(it.id);
  saveProgress(); renderAll();
}
function markHard() {
  const it = currentItem(); if (!it) return;
  state.hard.add(it.id); state.known.delete(it.id);
  saveProgress(); renderAll();
}

function switchTab(name) {
  state.activeTab = name;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  renderAll();
}

/* Quiz helpers */
function pickQuizItem() {
  const hardItems = WORDS.filter(x => state.hard.has(x.id));
  const pool = hardItems.length ? hardItems : (state.todayIdxs.length ? state.todayIdxs.map(i=>WORDS[i]) : WORDS);
  return pool[Math.floor(Math.random()*pool.length)];
}
function checkQuiz() {
  if (!state.quizItem) return;
  const guess = quizInput.value;
  const ans = state.quizItem.d || "";
  const score = overlapScore(guess, ans);
  if (score >= 0.35) {
    quizFeedback.innerHTML = `<span style="color: rgba(47,229,155,.95); font-weight:700;">Nice!</span> That’s close enough.`;
  } else {
    quizFeedback.innerHTML = `<span style="color: rgba(255,204,102,.95); font-weight:700;">Not quite</span> — try another synonym or reveal.`;
  }
}
function revealQuiz() { state.quizRevealed = true; quizAnswer.style.display = "block"; }
function newQuizWord() { state.quizItem = pickQuizItem(); state.quizRevealed = false; renderQuiz(); }

/* Backup */
function exportJSON() {
  const payload = { version: 1, exportedAt: new Date().toISOString(), known: [...state.known], hard: [...state.hard], perDay: state.perDay, deckMode: state.deckMode };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `celpip-vocab-progress-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  backupNote.textContent = "Exported. Save that file somewhere safe.";
}
function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.known) || !Array.isArray(data.hard)) {
        backupNote.textContent = "That file doesn’t look like a valid export.";
        return;
      }
      state.known = new Set(data.known);
      state.hard = new Set(data.hard);
      if (Number.isFinite(data.perDay)) state.perDay = data.perDay;
      if (typeof data.deckMode === "string") state.deckMode = data.deckMode;
      ensureConsistency();
      perDayEl.value = state.perDay;
      deckModeEl.value = state.deckMode;
      saveProgress();
      backupNote.textContent = "Imported successfully.";
      buildToday(); buildDeck(); renderAll();
    } catch {
      backupNote.textContent = "Couldn’t read that JSON file.";
    }
  };
  reader.readAsText(file);
}

/* ===========================
   7) Supabase Auth + Sync
   =========================== */
const sb = createSupabaseClient();
let currentUser = null;
let syncTimer = null;
let isApplyingRemote = false;
let authVersion = 0;


function usernameFromEmail(email) {
  const e = (email || "").trim();
  const at = e.indexOf("@");
  return at > 0 ? e.slice(0, at) : e;
}

function setAuthUI({ loggedIn, message = "", email = "" }) {
  const msg = (message || "").trim();
  authStatus.textContent = msg;

  if (authSignedOut) authSignedOut.style.display = loggedIn ? "none" : "flex";
  if (authSignedIn) authSignedIn.style.display = loggedIn ? "flex" : "none";

  if (loggedIn && userNameEl) userNameEl.textContent = usernameFromEmail(email);

  if (!loggedIn) closeAuthMenu();  // ✅ important on mobile

  if (passwordInput) passwordInput.value = "";
}

function closeAuthMenu() {
  if (!authMenu) return;
  authMenu.classList.remove("open");
  authMenuBtn?.setAttribute("aria-expanded", "false");
}

function toggleAuthMenu() {
  if (!authMenu) return;
  const isOpen = authMenu.classList.toggle("open");
  authMenuBtn?.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

async function signUp(email, password) {
  if (!sb) {
    setAuthUI({ loggedIn:false, message:"Sync disabled: add Supabase URL + anon key in assets/js/config.js" });
    return;
  }
  setAuthUI({ loggedIn:false, message:"Signing up..." });

  const { error } = await sb.auth.signUp({ email, password });

  if (error) {
    setAuthUI({ loggedIn:false, message:"Error: " + error.message });
    return;
  }

  setAuthUI({ loggedIn:false, message:"Signed up! If email confirmation is enabled, check your inbox to confirm, then sign in." });
}

async function signIn(email, password) {
  if (!sb) {
    setAuthUI({ loggedIn:false, message:"Sync disabled: add Supabase URL + anon key in assets/js/config.js" });
    return;
  }
  setAuthUI({ loggedIn:false, message:"Signing in..." });

  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    setAuthUI({ loggedIn:false, message:"Error: " + error.message });
    return;
  }
}

function clearAllSupabaseAuthKeys() {
  const clearFrom = (store) => {
    if (!store) return;
    try {
      // remove your fixed key
      store.removeItem("celpip_vocab_auth");

      // remove any supabase-generated keys
      for (let i = store.length - 1; i >= 0; i--) {
        const k = store.key(i);
        if (!k) continue;
        if (k === "celpip_vocab_auth" || /^sb-.*-auth-token$/.test(k)) {
          store.removeItem(k);
        }
      }
    } catch (e) {
      console.warn("Auth storage clear failed:", e);
    }
  };

  clearFrom(localStorage);
  clearFrom(sessionStorage);
}

async function signOut() {
  if (!sb) return;

  authVersion++;          // ✅ invalidate in-flight sync
  clearTimeout(syncTimer); // ✅ stop queued cloud sync

  // Immediately treat as logged out locally
  currentUser = null;
  setAuthUI({ loggedIn:false, message:"Logging out..." });

  try {
    const { error } = await sb.auth.signOut({ scope: "local" });
    if (error) console.warn("Supabase signOut error:", error.message);
  } catch (e) {
    console.warn("Supabase signOut threw:", e);
  } finally {
    clearAllSupabaseAuthKeys();

    // Double-check: if session still exists, nuke again
    try {
      const { data } = await sb.auth.getSession();
      if (data?.session) {
        await sb.auth.signOut({ scope: "local" });
        clearAllSupabaseAuthKeys();
      }
    } catch {}

    setAuthUI({ loggedIn:false, message:"Logged out (Guest mode—progress won’t be saved)." });
    location.reload();
  }
}


function scheduleCloudSync() {
  if (!sb || !currentUser) return;
  if (isApplyingRemote) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => pushProgressToCloud(false), 700);
}

function mergeRemoteIntoLocal(remote) {
  const remoteKnown = new Set(remote.known || []);
  const remoteHard = new Set(remote.hard || []);
  for (const id of remoteKnown) state.known.add(id);
  for (const id of remoteHard) state.hard.add(id);
  ensureConsistency();

  if (Number.isFinite(remote.per_day)) state.perDay = remote.per_day;
  if (typeof remote.deck_mode === "string") state.deckMode = remote.deck_mode;
  perDayEl.value = state.perDay;
  deckModeEl.value = state.deckMode;
}

async function loadProgressFromCloud() {
  if (!sb || !currentUser) return;

  const myAuthVersion = authVersion;
  const myUserId = currentUser.id;
  const myEmail = currentUser.email;

  setAuthUI({ loggedIn:true, message:"Signed in. Syncing...", email: myEmail });

  const { data, error } = await sb
    .from("progress")
    .select("known, hard, per_day, deck_mode")
    .eq("user_id", myUserId)
    .maybeSingle();

  // ✅ If user logged out or changed while we were waiting, do nothing.
  if (authVersion !== myAuthVersion || !currentUser || currentUser.id !== myUserId) return;

  if (error) {
    // AbortError can happen from overlapping requests; treat as harmless
    if (String(error.message || "").includes("AbortError")) {
      setAuthUI({ loggedIn:true, message:"", email: myEmail });
      return;
    }
    setAuthUI({ loggedIn:true, message:"Sync error: " + error.message, email: myEmail });
    return;
  }

  isApplyingRemote = true;
  try {
    if (data) mergeRemoteIntoLocal(data);
    await pushProgressToCloud(false);

    // ✅ guard again after awaiting push
    if (authVersion !== myAuthVersion || !currentUser || currentUser.id !== myUserId) return;
  } finally {
    isApplyingRemote = false;
  }

  buildToday(); buildDeck(); renderAll();
  setAuthUI({ loggedIn:true, message:"", email: myEmail }); // keep status quiet when healthy
}



async function pushProgressToCloud(showToastMsg=false) {
  if (!sb || !currentUser) return;
  if (isApplyingRemote) return;

  const myAuthVersion = authVersion;
  const myUserId = currentUser.id;
  const myEmail = currentUser.email;

  const payload = {
    user_id: myUserId,
    known: [...state.known],
    hard: [...state.hard],
    per_day: state.perDay,
    deck_mode: state.deckMode
  };

  const { error } = await sb.from("progress").upsert(payload);

  if (authVersion !== myAuthVersion || !currentUser || currentUser.id !== myUserId) return;

  if (error) {
    setAuthUI({ loggedIn:true, message:"Save error: " + error.message, email: myEmail });
    return;
  }
  if (showToastMsg) toast("Synced");
}


/* ===========================
   8) Wire up events
   =========================== */
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)));

flashCard.addEventListener("click", flip);
flashCard.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
});

prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);
knownBtn.addEventListener("click", markKnown);
hardBtn.addEventListener("click", markHard);

perDayEl.addEventListener("change", () => {
  buildToday(); buildDeck();
  state.pos = 0; state.flipped = false;
  saveProgress(); renderAll();
});

deckModeEl.addEventListener("change", () => {
  buildDeck();
  state.pos = 0; state.flipped = false;
  saveProgress(); renderAll();
});

document.addEventListener("keydown", (e) => {
  if (state.activeTab !== "learn") return;
  if (e.key === "ArrowLeft") prev();
  if (e.key === "ArrowRight") next();
  if (e.key === " ") { e.preventDefault(); flip(); }
  if (e.key.toLowerCase() === "k") markKnown();
  if (e.key.toLowerCase() === "h") markHard();
});

searchInput.addEventListener("input", () => renderSearchList(searchInput.value));

checkBtn.addEventListener("click", checkQuiz);
revealBtn.addEventListener("click", revealQuiz);
newQuizBtn.addEventListener("click", newQuizWord);

quizKnownBtn.addEventListener("click", () => {
  if (!state.quizItem) return;
  state.known.add(state.quizItem.id);
  state.hard.delete(state.quizItem.id);
  saveProgress();
  toast("Marked Known");
  newQuizWord();
});
quizHardBtn.addEventListener("click", () => {
  if (!state.quizItem) return;
  state.hard.add(state.quizItem.id);
  state.known.delete(state.quizItem.id);
  saveProgress();
  toast("Marked Hard");
  newQuizWord();
});
quizInput.addEventListener("keydown", (e) => { if (e.key === "Enter") checkQuiz(); });

exportBtn.addEventListener("click", exportJSON);
importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) importJSON(f);
  importFile.value = "";
});

resetBtn.addEventListener("click", async () => {
  if (!confirm("Reset Known/Hard progress? (Clears local; if signed in it will also clear cloud.)")) return;
  state.known.clear();
  state.hard.clear();
  saveProgress();
  renderAll();
  if (sb && currentUser) await pushProgressToCloud(true);
});

/* Auth buttons */
signUpBtn.addEventListener("click", async () => {
  const email = (emailInput.value || "").trim();
  const pw = (passwordInput.value || "").trim();
  if (!email || !pw) { setAuthUI({ loggedIn:false, message:"Enter email + password." }); return; }
  await signUp(email, pw);
});
signInBtn.addEventListener("click", async () => {
  const email = (emailInput.value || "").trim();
  const pw = (passwordInput.value || "").trim();
  if (!email || !pw) { setAuthUI({ loggedIn:false, message:"Enter email + password." }); return; }
  await signIn(email, pw);
});
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") signInBtn.click();
});
logoutBtn.addEventListener("click", signOut);
// Hamburger menu open/close
authMenuBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleAuthMenu();
});

// Click outside closes menu
document.addEventListener("click", () => closeAuthMenu());

// ESC closes menu
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAuthMenu();
});

// Mobile logout button
logoutBtnMobile?.addEventListener("click", async (e) => {
  e.preventDefault();
  closeAuthMenu();
  await signOut();
});


/* ===========================
   9) Boot app + auth
   =========================== */
(function initApp() {
  perDayEl.value = state.perDay || 10;
  deckModeEl.value = state.deckMode || "today";
  ensureConsistency();
  buildToday(); buildDeck();
  state.pos = 0;
  renderAll();
})();

(async function initAuth() {
  if (!sb) {
    setAuthUI({ loggedIn:false, message:"Sync disabled: add Supabase URL + anon key in assets/js/config.js" });
    return;
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    authVersion++; // ✅ REQUIRED so your guards work

    currentUser = session?.user || null;

    if (!currentUser) {
      setAuthUI({
        loggedIn: false,
        message: "Not signed in (Guest mode—progress won’t be saved).",
      });
      return;
    }

    if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      await loadProgressFromCloud();
    } else {
      setAuthUI({ loggedIn: true, message: "", email: currentUser.email });
    }
  });

  const { data } = await sb.auth.getSession();
  currentUser = data?.session?.user || null;

  if (currentUser) {
    await loadProgressFromCloud();
  } else {
    setAuthUI({ loggedIn:false, message:"Not signed in (Guest mode—progress won’t be saved)." });
  }
})();
