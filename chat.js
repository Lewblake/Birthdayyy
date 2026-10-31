/* ================= CHAT NAMIN (Firebase) =================
   - Ang settings (config, emails, pangalan) ay nasa index.html, sa <script> na may window.CHAT_CONFIG.
   - Dito sa file na ito ay logic lang. Classic script ito (dynamic import) para gumana kahit saan. */
(async () => {
const g = (id) => document.getElementById(id);
const CFG = window.CHAT_CONFIG || {};
const FB = CFG.firebase || {};
const USERS = CFG.users || {};
const nameOf = (email) => USERS[email] || (email || "").split("@")[0];
const rk = (email) => (email || "").replace(/[.@]/g, "_");        // susi para sa reactions
const ping = () => { try { if (typeof sfx !== "undefined") sfx.tick(); } catch (e) {} };
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
};
const EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

const panel = g("chat-panel"), fab = g("chat-fab"), badge = g("chat-badge"), list = g("chat-list");
const head = panel.querySelector(".chat-head"), headBtns = panel.querySelector(".chat-head-btns");

/* ---- mga bagong bahagi ng UI (ginagawa dito para hindi na kailangang palitan ang index.html) ---- */
const titleEl = g("chat-title");
const statusEl = document.createElement("small"); statusEl.id = "chat-status"; statusEl.className = "chat-status";
titleEl.insertAdjacentElement("afterend", statusEl);
const titleWrap = document.createElement("div"); titleWrap.className = "chat-titlewrap";
titleEl.parentNode.insertBefore(titleWrap, titleEl); titleWrap.append(titleEl, statusEl);

const infoBtn = document.createElement("button");
infoBtn.type = "button"; infoBtn.id = "chat-info"; infoBtn.className = "chat-link"; infoBtn.textContent = "Activity"; infoBtn.setAttribute("aria-label", "Activity log");
headBtns.insertBefore(infoBtn, headBtns.firstChild);

const actView = document.createElement("div");
actView.id = "chat-activity"; actView.className = "chat-view chat-activity hidden";
actView.innerHTML = '<button type="button" id="chat-act-back" class="chat-link">← Back to chat</button>' +
  '<div id="chat-act-list" class="chat-act-list"></div>';
panel.appendChild(actView);
headBtns.insertBefore(g("chat-logout"), infoBtn.nextSibling);   // Log out: katabi ng Activity sa header

/* ---- GAME SECTION: nasa mismong website, sa ilalim ng Love section ---- */
const gameSec = document.createElement("section");
gameSec.id = "play"; gameSec.className = "sec game-sec";
gameSec.innerHTML = '<h2 class="sec-title">Play With Me</h2>' +
  '<p class="ttt-sub">Heart vs Flower ♡</p>' +
  '<div class="ttt-top"><div class="ttt-score" id="ttt-score"></div><p class="ttt-status" id="ttt-status"></p></div>' +
  '<div class="ttt-board" id="ttt-board"></div>' +
  '<button type="button" id="ttt-new" class="chat-go ttt-new">New game</button>' +
  '<button type="button" id="ttt-login" class="chat-go ttt-new hidden">Log in to play ♡</button>';
(g("ask") || g("reasons") || g("love")).insertAdjacentElement("afterend", gameSec);

const replyBar = document.createElement("div");
replyBar.id = "chat-replybar"; replyBar.className = "chat-replybar hidden";
replyBar.innerHTML = '<div><b id="chat-reply-who"></b><span id="chat-reply-text"></span></div><button type="button" id="chat-reply-x" aria-label="Cancel reply">✕</button>';
g("chat-form").parentNode.insertBefore(replyBar, g("chat-form"));

const picker = document.createElement("div");
picker.id = "chat-picker"; picker.className = "chat-picker hidden";
picker.innerHTML = EMOJIS.map((e) => `<button type="button" data-e="${e}">${e}</button>`).join("");
panel.appendChild(picker);

const views = { setup: g("chat-setup"), login: g("chat-login"), room: g("chat-room"), activity: actView };
const show = (v) => {
  Object.entries(views).forEach(([k, el]) => el.classList.toggle("hidden", k !== v));
  g("chat-logout").classList.toggle("hidden", v !== "room");
  infoBtn.classList.toggle("hidden", v !== "room");
  statusEl.classList.toggle("hidden", v !== "room");
  picker.classList.add("hidden");
};

let me = null, open = false, unread = 0, firstLoad = true, unsub = null;
let replyTo = null;
const api = { react: () => {}, reply: (m) => setReply(m) };

/* ---------- buksan / isara ---------- */
function setOpen(on) {
  open = on;
  panel.classList.toggle("hidden", !on);
  fab.classList.toggle("is-open", on);
  if (on) {
    unread = 0; paintBadge(); store.set("chatSeen", String(Date.now()));
    setTimeout(() => { list.scrollTop = list.scrollHeight; }, 50);
  } else picker.classList.add("hidden");
}
fab.addEventListener("click", () => setOpen(!open));
g("chat-close").addEventListener("click", () => setOpen(false));
function paintBadge() { badge.textContent = unread > 9 ? "9+" : unread; badge.classList.toggle("hidden", !unread); }

/* ---------- zoom ng litrato sa chat ---------- */
function zoomPhoto(src) {
  let z = g("chat-zoom");
  if (!z) {
    z = document.createElement("div"); z.id = "chat-zoom"; z.className = "chat-zoom";
    z.innerHTML = '<img alt="">';
    z.addEventListener("click", () => z.classList.add("hidden"));
    document.body.appendChild(z);
  }
  z.querySelector("img").src = src;
  z.classList.remove("hidden");
}

/* ---------- oras (12-hour) at petsa ---------- */
const pad = (n) => String(n).padStart(2, "0");
function fmtTime(d) { let h = d.getHours(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${pad(d.getMinutes())} ${ap}`; }
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const dayLabel = (d) => {
  const t = new Date(), y = new Date(Date.now() - 864e5);
  if (dayKey(d) === dayKey(t)) return "Today";
  if (dayKey(d) === dayKey(y)) return "Yesterday";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};
const fmtWhen = (d) => (dayKey(d) === dayKey(new Date()) ? "Today" : dayLabel(d)) + " · " + fmtTime(d);

/* ---------- reply ---------- */
function setReply(m) {
  replyTo = { id: m.id, from: m.from, text: m.text ? m.text.slice(0, 90) : (m.img ? "📷 Photo" : "") };
  g("chat-reply-who").textContent = nameOf(m.from) + ": ";
  g("chat-reply-text").textContent = replyTo.text;
  replyBar.classList.remove("hidden");
  g("chat-input").focus();
}
function clearReply() { replyTo = null; replyBar.classList.add("hidden"); }
g("chat-reply-x").addEventListener("click", clearReply);

/* ---------- reaction picker ---------- */
let pickFor = null;
function openPicker(m, btn) {
  pickFor = m;
  picker.classList.remove("hidden");
  const pr = panel.getBoundingClientRect(), br = btn.getBoundingClientRect(), w = picker.offsetWidth;
  let left = br.left - pr.left - w / 2 + br.width / 2;
  left = Math.max(8, Math.min(left, pr.width - w - 8));
  let top = br.top - pr.top - picker.offsetHeight - 6;
  if (top < 50) top = br.bottom - pr.top + 6;
  picker.style.left = left + "px"; picker.style.top = top + "px";
}
picker.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-e]"); if (!b || !pickFor) return;
  api.react(pickFor, b.dataset.e); picker.classList.add("hidden"); pickFor = null;
});
document.addEventListener("click", (e) => { if (!picker.contains(e.target) && !e.target.closest(".m-act")) picker.classList.add("hidden"); });

/* ---------- pag-render ng mga mensahe ---------- */
function render(msgs, myEmail) {
  const near = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
  list.innerHTML = "";
  if (!msgs.length) {
    list.innerHTML = `<p class="chat-empty">No conversation</p>`;
    return;
  }
  let lastDay = "";
  msgs.forEach((m) => {
    const d = m.at instanceof Date ? m.at : new Date();
    const dk = dayKey(d);
    if (dk !== lastDay) {
      lastDay = dk;
      const sep = document.createElement("div"); sep.className = "chat-day"; sep.textContent = dayLabel(d); list.appendChild(sep);
    }
    const mine = m.from === myEmail;
    const row = document.createElement("div"); row.className = "msg " + (mine ? "me" : "them"); row.dataset.id = m.id || "";
    const col = document.createElement("div"); col.className = "msg-col";
    const bub = document.createElement("div"); bub.className = "bubble";
    if (!mine) { const who = document.createElement("small"); who.className = "who"; who.textContent = nameOf(m.from); bub.appendChild(who); }
    if (m.reply) {
      const q = document.createElement("div"); q.className = "quote";
      const qb = document.createElement("b"); qb.textContent = nameOf(m.reply.from);
      const qt = document.createElement("span"); qt.textContent = m.reply.text || "";
      q.append(qb, qt);
      q.addEventListener("click", () => {
        const t = list.querySelector(`[data-id="${m.reply.id}"]`);
        if (t) { t.scrollIntoView({ block: "center", behavior: "smooth" }); t.classList.remove("flash"); void t.offsetWidth; t.classList.add("flash"); }
      });
      bub.appendChild(q);
    }
    if (m.img) {
      const im = document.createElement("img"); im.src = m.img; im.alt = ""; im.className = "m-img";
      im.addEventListener("click", () => zoomPhoto(m.img));
      bub.appendChild(im);
    }
    if (m.text) { const p = document.createElement("p"); p.textContent = m.text; bub.appendChild(p); }
    const meta = document.createElement("div"); meta.className = "m-meta";
    const rb = document.createElement("button"); rb.type = "button"; rb.className = "m-act"; rb.textContent = "☺"; rb.setAttribute("aria-label", "React");
    rb.addEventListener("click", (e) => { e.stopPropagation(); openPicker(m, rb); });
    const pb = document.createElement("button"); pb.type = "button"; pb.className = "m-act"; pb.textContent = "↩"; pb.setAttribute("aria-label", "Reply");
    pb.addEventListener("click", () => api.reply(m));
    const tm = document.createElement("time"); tm.textContent = fmtTime(d);
    meta.append(rb, pb, tm); bub.appendChild(meta);
    bub.addEventListener("dblclick", () => api.react(m, "❤️"));
    col.appendChild(bub);

    // reactions (grouped)
    const rx = m.reactions || {}, counts = {};
    Object.values(rx).forEach((e) => { counts[e] = (counts[e] || 0) + 1; });
    const keys = EMOJIS.filter((e) => counts[e]);
    if (keys.length) {
      const bar = document.createElement("div"); bar.className = "reacts";
      keys.forEach((e) => {
        const c = document.createElement("button"); c.type = "button";
        c.className = "react-chip" + (rx[rk(myEmail)] === e ? " mine" : "");
        c.textContent = e + (counts[e] > 1 ? " " + counts[e] : "");
        c.addEventListener("click", () => api.react(m, e));
        bar.appendChild(c);
      });
      col.appendChild(bar);
    }
    row.appendChild(col); list.appendChild(row);
  });
  if (near || firstLoad) list.scrollTop = list.scrollHeight;
}
window.__chatRender = render;   // para sa pag-test ng itsura

/* ---------- walang config pa ---------- */
if (!FB.apiKey) { show("setup"); g("ttt-status").textContent = "Hindi pa naka-set up ang chat/game."; g("ttt-new").classList.add("hidden"); return; }

const V = "https://www.gstatic.com/firebasejs/10.12.2/";
let initializeApp, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut;
let getFirestore, collection, addDoc, setDoc, query, orderBy, limit, limitToLast, onSnapshot, serverTimestamp, doc, updateDoc;
try {
  ({ initializeApp } = await import(V + "firebase-app.js"));
  ({ getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } = await import(V + "firebase-auth.js"));
  ({ getFirestore, collection, addDoc, setDoc, query, orderBy, limit, limitToLast, onSnapshot, serverTimestamp, doc, updateDoc, getDoc } = await import(V + "firebase-firestore.js"));
} catch (e) {
  views.setup.innerHTML = '<p class="chat-note">Hindi ma-load ang chat. Kailangan ng internet.</p>';
  show("setup");
  return;
}
const app = initializeApp(FB), auth = getAuth(app), db = getFirestore(app);
const col = collection(db, "messages");

/* ---------- presence + activity ---------- */
const devId = (() => { let d = store.get("chatDev"); if (!d) { d = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); store.set("chatDev", d); } return d; })();
function deviceLabel() {
  const ua = navigator.userAgent || "";
  const os = /android/i.test(ua) ? "Android" : /iPhone/i.test(ua) ? "iPhone" : /iPad/i.test(ua) ? "iPad" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "Device";
  const br = /SamsungBrowser/i.test(ua) ? "Samsung Internet" : /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox|FxiOS/i.test(ua) ? "Firefox" : /CriOS|Chrome/i.test(ua) ? "Chrome" : /Safari/i.test(ua) ? "Safari" : "Browser";
  const inApp = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone;
  return `${os} · ${br}${inApp ? " (App)" : ""}`;
}
let presTimer = null, statusTimer = null, unsubPres = null, unsubAct = null, others = {};

function beat(online) {
  if (!me) return;
  setDoc(doc(db, "presence", me), { name: nameOf(me), device: deviceLabel(), deviceId: devId, online, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
}
function startPresence() {
  /* isang row lang kada device; oras lang ang nag-uupdate */
  const vref = doc(db, "visits", me.replace(/[.@]/g, "_") + "__" + devId);
  getDoc(vref).then((s) => {
    const d = { email: me, name: nameOf(me), device: deviceLabel(), deviceId: devId, at: serverTimestamp() };
    if (!s.exists()) d.firstAt = serverTimestamp();
    return setDoc(vref, d, { merge: true });
  }).catch(() => {});
  beat(document.visibilityState === "visible");
  presTimer = setInterval(() => beat(document.visibilityState === "visible"), 60000);
  unsubPres = onSnapshot(collection(db, "presence"), (snap) => {
    others = {};
    snap.docs.forEach((d) => { if (d.id !== me) others[d.id] = d.data({ serverTimestamps: "estimate" }); });
    paintStatus();
  }, () => {});
  statusTimer = setInterval(paintStatus, 30000);
}
function stopPresence() {
  clearInterval(presTimer); clearInterval(statusTimer);
  if (unsubPres) unsubPres(); if (unsubAct) unsubAct();
  unsubPres = unsubAct = null; others = {};
}
function paintStatus() {
  const p = Object.values(others)[0];
  if (!p) { statusEl.textContent = ""; return; }
  const ls = p.lastSeen && p.lastSeen.toDate ? p.lastSeen.toDate() : null;
  const live = p.online && ls && Date.now() - ls.getTime() < 150000;
  statusEl.textContent = live ? `${p.name || "Siya"} · online` : ls ? `${p.name || "Siya"} · last seen ${fmtWhen(ls)}` : "";
  statusEl.classList.toggle("on", !!live);
}
document.addEventListener("visibilitychange", () => beat(document.visibilityState === "visible"));
window.addEventListener("pagehide", () => beat(false));

infoBtn.addEventListener("click", () => {
  show("activity");
  const box = g("chat-act-list"); box.innerHTML = '<p class="chat-empty">Loading…</p>';
  if (unsubAct) unsubAct();
  unsubAct = onSnapshot(query(collection(db, "visits"), orderBy("at", "desc"), limit(100)), (snap) => {
    const rows = snap.docs.map((d) => { const x = d.data({ serverTimestamps: "estimate" }); return { ...x, at: x.at ? x.at.toDate() : new Date(), firstAt: x.firstAt ? x.firstAt.toDate() : null }; });
    /* isang row lang kada (tao + device): ang pinakabago; pinagsasama ang lumang duplicate */
    const dev = new Map();
    rows.forEach((r) => {
      const k = r.email + "|" + r.deviceId, t = (r.firstAt || r.at).getTime(), d = dev.get(k);
      if (!d) dev.set(k, { r, t }); else if (t < d.t) d.t = t;   // rows ay pinakabago muna
    });
    const list = [...dev.values()];
    const first = {};
    list.forEach((d) => { const e = d.r.email; if (!(e in first) || d.t < first[e].t) first[e] = d; });
    const isNew = new Map();
    list.forEach((d) => { if (first[d.r.email] !== d) isNew.set(d.r, true); });
    rows.length = 0; list.forEach((d) => rows.push(d.r));
    box.innerHTML = "";
    if (!rows.length) { box.innerHTML = '<p class="chat-empty">Wala pang naka-log.</p>'; return; }
    rows.forEach((r) => {
      const el = document.createElement("div"); el.className = "act-row";
      const who = document.createElement("b"); who.textContent = r.name || nameOf(r.email);
      const dv = document.createElement("span"); dv.textContent = r.device || "Device";
      const tm = document.createElement("small"); tm.textContent = fmtWhen(r.at);
      el.append(who, dv, tm);
      if (isNew.get(r)) { const n = document.createElement("em"); n.textContent = "NEW DEVICE"; el.appendChild(n); }
      if (r.deviceId === devId) { const t = document.createElement("i"); t.textContent = "this device"; el.appendChild(t); }
      box.appendChild(el);
    });
  }, () => { box.innerHTML = '<p class="chat-empty">Hindi ma-load. Tingnan ang rules.</p>'; });
});
g("chat-act-back").addEventListener("click", () => { if (unsubAct) { unsubAct(); unsubAct = null; } show("room"); });

/* ---------- TIC-TAC-TOE: heart ♥ vs bulaklak 🌷 (real-time sa Firestore) ---------- */
const HEART_SVG = '<svg viewBox="0 0 40 40" aria-label="heart"><defs><linearGradient id="gH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9ec0"/><stop offset="1" stop-color="#e0245e"/></linearGradient></defs><path d="M20 35C5 23 5 9 13.5 8.5c3.2-.2 5.5 1.8 6.5 4.2 1-2.4 3.3-4.4 6.5-4.2C35 9 35 23 20 35z" fill="url(#gH)" stroke="#a3123f" stroke-width="1.4" stroke-linejoin="round"/><path d="M11 13c1.2-1.6 3.2-2 4.6-1.2" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
const TULIP_SVG = '<svg viewBox="0 0 40 40" aria-label="flower"><defs><linearGradient id="gT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc2dc"/><stop offset=".55" stop-color="#ff6fa8"/><stop offset="1" stop-color="#c2255c"/></linearGradient></defs><path d="M20 38V21" stroke="#3f9b55" stroke-width="2.6" stroke-linecap="round"/><path d="M20 33C14 33 11 29 10 25c4 0 8 2 10 6z" fill="#4fb768"/><path d="M20 31c5-.5 9-3 11-7-4-.5-8 1-11 7z" fill="#3f9b55"/><path d="M11 7c0 8 1.5 14 9 15.5C27.500 21 29 15 29 7l-4.500 4.500L20 5l-4.500 6.500z" fill="url(#gT)" stroke="#a3123f" stroke-width="1.2" stroke-linejoin="round"/></svg>';
const SYM = { H: HEART_SVG, F: TULIP_SVG };
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const emptyGame = (starter) => ({ board: "         ", turn: starter || "H", winner: "", line: [], scoreH: 0, scoreF: 0, starter: starter || "H" });
const emailsOrder = Object.keys(USERS);
const roleOf = (email) => (emailsOrder.indexOf(email) === 1 ? "F" : "H");       // unang email = heart, pangalawa = bulaklak
let game = emptyGame(), unsubGame = null;

function checkWinner(b) {
  for (const l of LINES) if (b[l[0]] !== " " && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { w: b[l[0]], line: l };
  return b.includes(" ") ? null : { w: "D", line: [] };
}
function paintGame() {
  const loggedIn = !!me;
  g("ttt-new").classList.toggle("hidden", !loggedIn);
  g("ttt-login").classList.toggle("hidden", loggedIn);
  const mine = roleOf(me), other = mine === "H" ? "F" : "H";
  const nameFor = (r) => nameOf(emailsOrder.find((e) => roleOf(e) === r) || "") || (r === "H" ? "Heart" : "Flower");
  g("ttt-score").innerHTML = `<span class="${mine === "H" ? "me" : ""}">${HEART_SVG}<b>${game.scoreH}</b><small>${nameFor("H")}</small></span><span class="vs">vs</span><span class="${mine === "F" ? "me" : ""}">${TULIP_SVG}<b>${game.scoreF}</b><small>${nameFor("F")}</small></span>`;
  const st = g("ttt-status");
  if (!loggedIn) st.textContent = "Log-in To Play";
  else if (game.winner === "D") st.textContent = "No winner, Try again?";
  else if (game.winner) st.textContent = game.winner === mine ? "Winner 🎉" : `${nameFor(other)} ang nanalo! 💗`;
  else st.textContent = game.turn === mine ? "Ikaw na ♡" : `Turn.${nameFor(other)}…`;
  st.classList.toggle("go", loggedIn && !game.winner && game.turn === mine);
  const bd = g("ttt-board"); bd.innerHTML = "";
  for (let i = 0; i < 9; i++) {
    const c = document.createElement("button"); c.type = "button";
    const v = game.board[i];
    c.className = "ttt-cell" + (v !== " " ? " filled" : "") + (game.line && game.line.includes(i) ? " win" : "");
    c.innerHTML = v !== " " ? SYM[v] : "";
    c.setAttribute("aria-label", "cell " + (i + 1));
    c.addEventListener("click", () => playCell(i));
    c.disabled = !loggedIn;
    bd.appendChild(c);
  }
}
async function playCell(i) {
  if (!me) return;
  if (game.winner || game.board[i] !== " " || game.turn !== roleOf(me)) return;
  const role = roleOf(me);
  const board = game.board.slice(0, i) + role + game.board.slice(i + 1);
  const res = checkWinner(board);
  const next = { ...game, board, turn: role === "H" ? "F" : "H", winner: res ? res.w : "", line: res ? res.line : [] };
  if (res && res.w === "H") next.scoreH = (game.scoreH || 0) + 1;
  if (res && res.w === "F") next.scoreF = (game.scoreF || 0) + 1;
  game = next; paintGame();                                  // agad na lalabas sa screen mo
  try { await setDoc(doc(db, "games", "ttt"), { ...next, updatedAt: serverTimestamp() }); if (res && res.w !== "D") { try { sfx.yes(); } catch (e) {} } else ping(); }
  catch (e) { alert("try again."); }
}
async function newGame() {
  const starter = game.starter === "H" ? "F" : "H";           // salitan ang unang gagalaw
  const fresh = { ...emptyGame(starter), scoreH: game.scoreH || 0, scoreF: game.scoreF || 0 };
  game = fresh; paintGame();
  try { await setDoc(doc(db, "games", "ttt"), { ...fresh, updatedAt: serverTimestamp() }); } catch (e) {}
}
function startGame() {
  if (unsubGame) unsubGame();
  unsubGame = onSnapshot(doc(db, "games", "ttt"), (snap) => {
    const d = snap.exists ? (typeof snap.exists === "function" ? (snap.exists() ? snap.data() : null) : snap.data()) : null;
    game = d ? { ...emptyGame(), ...d } : emptyGame();
    if (typeof game.board !== "string" || game.board.length !== 9) game.board = "         ";
    paintGame();
  }, () => { g("ttt-status").textContent = "See the rules."; });
}
function stopGame() { if (unsubGame) { unsubGame(); unsubGame = null; } game = emptyGame(); paintGame(); }
g("ttt-new").addEventListener("click", newGame);
g("ttt-login").addEventListener("click", () => setOpen(true));

/* ---------- login / mensahe ---------- */
paintGame();
onAuthStateChanged(auth, (u) => {
  if (unsub) { unsub(); unsub = null; }
  stopPresence();
  if (!u) { me = null; stopGame(); show("login"); return; }
  me = u.email;
  show("room"); titleEl.textContent = "Chat ♡";
  firstLoad = true;
  startPresence();
  startGame();
  const seen = Number(store.get("chatSeen") || 0);
  unsub = onSnapshot(query(col, orderBy("createdAt"), limitToLast(200)), (snap) => {
    const msgs = snap.docs.map((d) => {
      const x = d.data({ serverTimestamps: "estimate" });
      return { id: d.id, ...x, at: x.createdAt ? x.createdAt.toDate() : new Date() };
    });
    api.react = async (m, emoji) => {
      const next = { ...(m.reactions || {}) };
      if (next[rk(me)] === emoji) delete next[rk(me)]; else next[rk(me)] = emoji;
      try { await updateDoc(doc(db, "messages", m.id), { reactions: next }); } catch (e) {}
    };
    render(msgs, me);
    const fresh = msgs.filter((m) => m.from !== me && m.at.getTime() > seen);
    if (!open) {
      const n = firstLoad ? fresh.length : snap.docChanges().filter((c) => c.type === "added" && c.doc.data().from !== me && !c.doc.metadata.hasPendingWrites).length;
      if (n) { unread = firstLoad ? n : unread + n; paintBadge(); if (!firstLoad) ping(); }
    } else store.set("chatSeen", String(Date.now()));
    firstLoad = false;
  }, () => { list.innerHTML = `<p class="chat-empty">Loading.</p>`; });
});

g("chat-login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = g("chat-login-err"); err.textContent = "";
  try { await signInWithEmailAndPassword(auth, g("chat-email").value.trim(), g("chat-pass").value); g("chat-pass").value = ""; }
  catch (x) { err.textContent = "Incorrect Email or Password"; }
});
g("chat-logout").addEventListener("click", async () => { beat(false); await new Promise((r) => setTimeout(r, 250)); clearReply(); signOut(auth); });

/* magpadala */
const input = g("chat-input"), sendBtn = g("chat-send");
async function send(payload) {
  if (!me) return;
  sendBtn.disabled = true;
  const data = { from: me, text: payload.text || "", img: payload.img || "", reactions: {}, createdAt: serverTimestamp() };
  if (replyTo) data.reply = { id: replyTo.id, from: replyTo.from, text: replyTo.text };
  try { await addDoc(col, data); clearReply(); ping(); }
  catch (e) { alert("Try again."); }
  sendBtn.disabled = false;
}
g("chat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const t = input.value.trim(); if (!t) return;
  input.value = ""; send({ text: t.slice(0, 1000) });
});

/* litrato: paliitin muna bago i-send */
g("chat-photo").addEventListener("change", (e) => {
  const f = e.target.files[0]; e.target.value = "";
  if (!f) return;
  const img = new Image();
  img.onload = () => {
    const MAX = 800, k = Math.min(1, MAX / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    let q = 0.72, data = c.toDataURL("image/jpeg", q);
    while (data.length > 700000 && q > 0.3) { q -= 0.1; data = c.toDataURL("image/jpeg", q); }
    URL.revokeObjectURL(img.src);
    send({ img: data, text: input.value.trim().slice(0, 1000) }); input.value = "";
  };
  img.src = URL.createObjectURL(f);
});
})();