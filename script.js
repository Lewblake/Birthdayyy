/* =====================================================
   script.js — LOGIC LANG ITO. Ang mga text, picture, video, GIF at kanta
   ay nasa index.html (doon mo sila i-edit).
   Settings (passcode, countdown, atbp.) ay nasa <body data-...> ng index.html.
   ===================================================== */

const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];

/* ---------- Settings galing sa index.html ---------- */
const S = document.body.dataset;
const PASSCODE = S.passcode || "726835";
const COUNTDOWN_SECONDS = Number(S.countdownSeconds) || 5;
const TARGET_DATE = S.targetDate || "";
const AUTOPLAY_MUSIC = S.autoplayMusic !== "false";

/* ---------- Background: video (kung may bg.mp4) o stars ---------- */
(function background() {
  const v = $("bg-video");
  v.addEventListener("loadeddata", () => {
    v.classList.add("ready");
    $("stars").classList.add("hidden");
    v.play().catch(() => {});
  });

  const colors = ["#f06b9a", "#f7a8c4", "#ff8fb7", "#e9a1b8", "#f4c1d3", "#e0558c"];
  const r = (a, b) => a + Math.random() * (b - a);
  let html = "";
  for (let i = 0; i < 34; i++) {
    const c = colors[i % colors.length], s = r(22, 40);
    html += `<svg class="star" viewBox="0 0 24 24" style="left:${r(0, 100)}%;top:${r(0, 100)}%;width:${s}px;height:${s}px;transform:rotate(${r(-25, 25)}deg);animation-delay:${r(0, 4)}s">
      <path d="M12 2.2l2.8 6.2 6.7.7-5 4.6 1.4 6.6L12 17l-5.9 3.3 1.4-6.6-5-4.6 6.7-.7z" fill="${c}" opacity=".7" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  }
  $("stars").innerHTML = html;
})();

/* ---------- Keypad ---------- */
let code = "";
let locked = false;
const boxes = $("boxes");

// iayon ang dami ng box sa haba ng passcode
while (boxes.children.length < PASSCODE.length) boxes.insertAdjacentHTML("beforeend", `<div class="box"></div>`);
while (boxes.children.length > PASSCODE.length) boxes.lastElementChild.remove();

$$(".key").forEach((b) => b.addEventListener("click", () => press(b.dataset.k)));

function renderBoxes() {
  [...boxes.children].forEach((el, i) => {
    el.textContent = code[i] ? "*" : "";   // nakatago ang number: asterisk lang ang makikita
    el.classList.toggle("filled", !!code[i]);
  });
}

function press(k) {
  if (locked) return;
  sfx.tick();
  if (k === "DEL") code = code.slice(0, -1);
  else if (k !== "." && code.length < PASSCODE.length) code += k;
  renderBoxes();
  if (code.length === PASSCODE.length) {
    locked = true;
    setTimeout(() => showResult(code === PASSCODE), 350);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !$("wrong-overlay").classList.contains("hidden")) popupAction();
  if (!$("page-code").classList.contains("hidden") && $("wrong-overlay").classList.contains("hidden")) {
    if (/^\d$/.test(e.key)) press(e.key);
    if (e.key === "Backspace") press("DEL");
  }
});

/* ---------- Pages ---------- */
function show(id) {
  ["page-code", "page-count", "page-bday"].forEach((p) => $(p).classList.toggle("hidden", p !== id));
  window.scrollTo(0, 0);
}

/* ---------- Popup (mali / tama) ---------- */
let popupOk = false;

function showResult(ok) {
  popupOk = ok;
  if (ok) sfx.yes();
  else {
    sfx.wrong();
    const bx = $("boxes"); bx.classList.remove("shake"); void bx.offsetWidth; bx.classList.add("shake");
  }
  $("pop-title").textContent = ok ? "Access Granted!" : "Wrong Passcode!";
  $("pop-text").textContent = ok ? "Nice!!!" : "Try Again?";
  $("pop-btn").textContent = ok ? "Proceed" : "Retry";
  $("gif-wrong").classList.toggle("hidden", ok);
  $("gif-right").classList.toggle("hidden", !ok);
  $("wrong-overlay").classList.remove("hidden");
}

function popupAction() {
  $("wrong-overlay").classList.add("hidden");
  if (popupOk) {
    musicUnlock();   // galing sa pindot ng user, kaya papayagan ng iPhone na mag-play mamaya
    showCountdown();
  } else {
    retry();
  }
}
$("pop-btn").addEventListener("click", popupAction);

function retry() {
  code = "";
  locked = false;
  renderBoxes();
  show("page-code");
}

/* ---------- Countdown ---------- */
let countTimer = null;

(function bokeh() {
  const r = (a, b) => a + Math.random() * (b - a);
  let dots = "";
  for (let i = 0; i < 14; i++) {
    const sz = r(8, 26);
    dots += `<i style="left:${r(0, 100)}%;top:${r(0, 100)}%;width:${sz}px;height:${sz}px;opacity:${r(0.25, 0.8)};animation-delay:-${r(0, 9)}s;animation-duration:${r(6, 12)}s"></i>`;
  }
  $("bokeh").innerHTML = dots;
})();

function showCountdown() {
  show("page-count");
  const end = TARGET_DATE ? new Date(TARGET_DATE).getTime() : Date.now() + COUNTDOWN_SECONDS * 1000;
  const last = {};
  const pad = (n) => String(n).padStart(2, "0");

  function set(k, val) {
    if (last[k] === val) return;
    last[k] = val;
    const el = $("t-" + k);
    el.textContent = val;
    el.classList.remove("tick");
    void el.offsetWidth;
    el.classList.add("tick");
  }

  function update() {
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    set("d", pad(Math.floor(left / 86400)));
    set("h", pad(Math.floor((left % 86400) / 3600)));
    set("m", pad(Math.floor((left % 3600) / 60)));
    set("s", pad(left % 60));
    if (left <= 0) {
      clearInterval(countTimer);
      // ihanda ang itim na background SA LIKOD ng countdown, para pag nag-fade out ito ay itim ang lalabas (walang puti)
      document.body.classList.add("on-home");
      $("fx").classList.remove("hidden");
      fxStart();
      $("page-count").classList.add("leaving");
      setTimeout(() => {
        $("page-count").classList.remove("leaving");
        showBirthday();
      }, 1000);
    }
  }

  clearInterval(countTimer);
  update();
  countTimer = setInterval(update, 250);
}

/* ---------- Home (Happy Birthday) ---------- */
function showBirthday() {
  show("page-bday");
  $("player").classList.remove("hidden");
  $("songs-btn").classList.remove("hidden");
  document.body.classList.add("on-home");
  $("fx").classList.remove("hidden");
  fxStart();

  heartCakeStart();
  if (AUTOPLAY_MUSIC) musicPlay();   // dito lang magsisimula ang music: pagdating sa home

  const full = $("typed").dataset.text || "";
  let i = 0;
  $("typed").textContent = "";
  const t = setInterval(() => {
    $("typed").textContent = full.slice(0, ++i);
    if (i >= full.length) clearInterval(t);
  }, 110);
}

/* ---------- Nav: active link habang nag-scroll ---------- */
(function navSpy() {
  const links = $$(".links a");
  const ids = links.map((a) => a.getAttribute("href").slice(1));
  window.addEventListener("scroll", () => {
    let current = ids[0];
    ids.forEach((id) => {
      const el = $(id);
      if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) current = id;
    });
    links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + current));
  }, { passive: true });
})();

/* ---------- Sound effects (gawa sa code, walang file na kailangan) ---------- */
const sfx = (() => {
  let ctx = null;
  const get = () => {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    } catch (e) { return null; }
  };
  function tone(f, d, type = "sine", v = 0.12, slide = 0, delay = 0) {
    const c = get(); if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05);
  }
  const arp = (notes, step = 0.09, type = "sine", v = 0.1) => notes.forEach((n, i) => tone(n, 0.28, type, v, 0, i * step));
  return {
    tick: () => tone(820, 0.05, "triangle", 0.07),
    wrong: () => { tone(220, 0.22, "sawtooth", 0.07, -90); tone(165, 0.3, "sawtooth", 0.07, -60, 0.14); },
    shoot: () => tone(620, 0.2, "triangle", 0.1, -420),
    hit: () => { tone(150, 0.16, "square", 0.1, -70); arp([880, 1175, 1568], 0.07, "sine", 0.09); },
    no: () => tone(330, 0.18, "sine", 0.1, -150),
    yes: () => arp([523, 659, 784, 1047], 0.1, "sine", 0.11),
    open: () => arp([392, 523, 659, 784], 0.11, "triangle", 0.09),
  };
})();

/* ---------- Notify: ipinapadala sa email mo (Web3Forms) ---------- */
const NOTIFY_KEY = (S.notifyKey || "").trim();
function notify(subject, message) {
  if (!NOTIFY_KEY) return false;
  fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ access_key: NOTIFY_KEY, subject, from_name: "Birthday website", message }),
  }).catch(() => {});
  return true;
}
const nowStr = () => new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });

/* ---------- Bilang ng bukas ng website at letter (dumarating sa email via Web3Forms) ---------- */
/* Para hindi mabilang ang sarili mong pagbukas: buksan mo minsan ang site na may  ?owner  sa dulo ng link
   (hal. https://sitemo.vercel.app/?owner). Sa device na iyon, hindi na magpapadala. ?track para ibalik. */
const track = (() => {
  const P = "visitCount:";
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const q = location.search;
  if (/[?&]owner\b/.test(q)) set("noTrack", "1");
  if (/[?&]track\b/.test(q)) set("noTrack", "");
  const day = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  return function (what, label, minGapMs) {
    if (get("noTrack")) return;
    const last = Number(get(P + what + ":last")) || 0;
    if (Date.now() - last < minGapMs) return;                       // iwas doble bilang (reload/balik-balik)
    set(P + what + ":last", String(Date.now()));
    const total = (Number(get(P + what + ":total")) || 0) + 1; set(P + what + ":total", String(total));
    const d = get(P + what + ":day") === day() ? (Number(get(P + what + ":today")) || 0) + 1 : 1;
    set(P + what + ":day", day()); set(P + what + ":today", String(d));
    notify(`${label} (ngayong araw: ${d}x)`, `${label}\nNgayong araw: ${d} beses\nKabuuan: ${total} beses\n${nowStr()}`);
  };
})();
track("site", "👀 Binuksan niya ang website", 10 * 60 * 1000);   // isang bilang kada 10 minuto

/* ---------- Reply (message) ---------- */
$("reply-btn").addEventListener("click", () => {
  const text = $("reply-text").value.trim();
  if (!text) return;
  const mail = $("reply").dataset.email || "";
  const sent = notify("💌 May reply ka!", `${text}\n\n— ${nowStr()}`);
  if (!sent && mail) window.location.href = `mailto:${mail}?subject=${encodeURIComponent("Reply 💌")}&body=${encodeURIComponent(text)}`;
  $("reply-thanks").classList.remove("hidden");
  $("reply-text").value = "";
});

/* ---------- Love: "Do you still love me?" (NO tumatakbo, YES lumalaki) ---------- */
(function askLove() {
  const stage = $("ask-stage"), yes = $("yes-btn"), no = $("no-btn");
  const msgs = [...$("no-msgs").children].map((li) => li.textContent.trim());
  let n = 0;

  // mga talulot na bumabagsak
  const pet = $("ask-petals");
  pet.innerHTML = Array.from({ length: 26 }, () =>
    `<i style="left:${Math.random() * 100}%;--sz:${3 + Math.random() * 5}px;--d:${9 + Math.random() * 10}s;--dl:${-Math.random() * 14}s;--dr:${Math.random() * 60 - 30}px"></i>`).join("");

  function reset() {
    n = 0;
    const ph0 = document.querySelector("#gif-q .ph"); if (ph0) ph0.textContent = "🥺";
    no.textContent = "NO";
    no.style.left = ""; no.style.top = "";
    yes.style.setProperty("--g", 1);
    $("gif-q").classList.remove("hidden"); $("gif-a").classList.add("hidden");
    $("ask-q").classList.remove("hidden"); stage.classList.remove("hidden");
    $("ask-ans").classList.add("hidden");
  }

  const SAD = ["🥺", "😢", "😭", "😭"];
  no.addEventListener("click", () => {
    sfx.no();
    const card = $("ask-card"); card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
    const ph = document.querySelector("#gif-q .ph"); if (ph) ph.textContent = SAD[Math.min(n, SAD.length - 1)];
    no.textContent = msgs[n % msgs.length];
    n++;
    yes.style.setProperty("--g", Math.min(1 + n * 0.28, 3.4));   // palaki nang palaki ang YES
    // lipat ng NO sa ibang lugar (hindi lalabas sa stage)
    const sw = stage.clientWidth, sh = stage.clientHeight;
    const w = no.offsetWidth, h = no.offsetHeight;
    no.style.left = Math.max(0, Math.random() * (sw - w)) + "px";
    no.style.top = Math.max(0, Math.random() * (sh - h)) + "px";
  });

  yes.addEventListener("click", () => {
    sfx.yes();
    notify("💗 Pinindot niya ang YES!", `Pinindot niya ang YES sa "Do you still love me?"\nNa-pindot ang NO: ${n} beses bago mag-YES.\n${nowStr()}`);
    $("gif-q").classList.add("hidden"); $("gif-a").classList.remove("hidden");
    $("ask-q").classList.add("hidden"); stage.classList.add("hidden");
    $("ask-ans").classList.remove("hidden");
    const card = $("ask-card");
    for (let i = 0; i < 18; i++) {
      const e = document.createElement("span");
      e.className = "ask-pop"; e.textContent = ["♥", "💗", "✨"][i % 3];
      e.style.cssText = `left:${50 + (Math.random() * 40 - 20)}%;top:30%;--dx:${Math.random() * 260 - 130}px;--dy:${-60 - Math.random() * 160}px`;
      card.appendChild(e); setTimeout(() => e.remove(), 1400);
    }
  });
  $("ask-again").addEventListener("click", reset);
})();

/* ---------- Gallery: tumpok na litrato + zoom (kinukuha ang mga picture sa index.html) ---------- */
(function gallery() {
  const pile = $("pile");
  const cards = $$("#pile .pcard");
  const N = cards.length;
  let order = cards.map((_, i) => i);   // order[0] = nasa ibabaw ng tumpok
  let busy = false;

  // gaano kalayo/tagilid ang mga nasa likod (kita ng kaunti, hindi sobra)
  const OFF = [0, 0.12, 0.2, 0.25, 0.29];   // porsyento ng lapad
  const ROT = [0, 7, 10, 13, 15];               // degrees
  const LIFT = [0, 8, 14, 18, 21];            // px pataas

  function place(card, i, d) {
    const k = Math.min(d, 4), W = pile.clientWidth;
    const sign = d % 2 ? 1 : -1;              // salitan kanan / kaliwa
    const x = d === 0 ? 0 : sign * OFF[k] * W;
    const rot = d === 0 ? (((i * 37) % 5) - 2) * 0.6 : sign * ROT[k];
    card.style.zIndex = N - d;
    card.style.opacity = d > 4 ? 0 : 1;
    card.style.filter = `brightness(${1 - k * 0.05})`;
    card.style.transform = `translate(${x}px, ${-LIFT[k]}px) rotate(${rot}deg) scale(${1 - k * 0.03})`;
  }

  function layout() {
    order.forEach((ci, d) => place(cards[ci], ci, d));
    $("pile-count").textContent = `${order[0] + 1} / ${N}`;
    $("pile-cap").textContent = cards[order[0]].dataset.caption || "";
  }
  const reflow = (el) => void el.offsetWidth;

  function next(dir = 1) {
    if (busy || N < 2) return;
    busy = true;
    const top = cards[order[0]];
    top.classList.add("fly");
    top.style.transform = `translate(${dir * 130}%, -6%) rotate(${dir * 22}deg)`;
    order.push(order.shift());
    order.forEach((ci, d) => { if (d < N - 1) place(cards[ci], ci, d); });   // umaakyat ang iba
    $("pile-count").textContent = `${order[0] + 1} / ${N}`;
    $("pile-cap").textContent = cards[order[0]].dataset.caption || "";
    setTimeout(() => {                    // ilagay sa likod nang hindi nakikita
      top.style.transition = "none";
      top.classList.remove("fly");
      place(top, order[N - 1], N - 1);
      reflow(top);
      top.style.transition = "";
      busy = false;
    }, 430);
  }

  function prev() {
    if (busy || N < 2) return;
    busy = true;
    const last = order.pop();
    const card = cards[last];
    card.style.transition = "none";       // magsimula sa labas
    card.classList.add("fly");
    card.style.transform = "translate(-130%, -6%) rotate(-22deg)";
    reflow(card);
    card.style.transition = "";
    order.unshift(last);
    layout();                             // lilipad papasok sa ibabaw
    card.classList.remove("fly");
    setTimeout(() => (busy = false), 430);
  }

  $("pile-next").addEventListener("click", () => next(1));
  $("pile-prev").addEventListener("click", prev);

  /* --- pindot = zoom, swipe = lipat --- */
  let x0 = null, moved = false;
  pile.addEventListener("pointerdown", (e) => { x0 = e.clientX; moved = false; });
  pile.addEventListener("pointermove", (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 8) moved = true; });
  pile.addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (!moved) openZoom(order[0]);       // simpleng pindot
    else if (dx < -50) next(1);           // swipe pakaliwa
    else if (dx > 50) prev();             // swipe pakanan
  });
  pile.addEventListener("pointercancel", () => (x0 = null));
  pile.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openZoom(order[0]); }
    if (e.key === "ArrowRight") { e.preventDefault(); next(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  });

  /* --- Zoom (lightbox) --- */
  let cur = 0;
  function renderZoom() {
    const img = cards[cur].querySelector("img");
    $("lb-img").innerHTML = img ? `<img src="${img.getAttribute("src")}" alt="" />` : `<div class="lb-ph">${cur + 1}</div>`;
    const cap = cards[cur].dataset.caption || "";
    $("lb-count").innerHTML = (cap ? `<span class="lb-cap">${cap}</span><br>` : "") + `${cur + 1} / ${N}`;
    $("lb-img").style.animation = "none";
    void $("lb-img").offsetWidth;
    $("lb-img").style.animation = "";
  }
  function openZoom(i) {
    cur = i;
    renderZoom();
    $("lightbox").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  function closeZoom() {
    $("lightbox").classList.add("hidden");
    document.body.style.overflow = "";
    const pos = order.indexOf(cur);       // ang huling tiningnan ang mapupunta sa ibabaw ng tumpok
    if (pos > 0) { order = order.slice(pos).concat(order.slice(0, pos)); layout(); }
  }
  const go = (d) => { cur = (cur + d + N) % N; renderZoom(); };

  $("lb-close").addEventListener("click", closeZoom);
  $("lb-prev").addEventListener("click", () => go(-1));
  $("lb-next").addEventListener("click", () => go(1));
  $("lightbox").addEventListener("click", (e) => { if (e.target === $("lightbox")) closeZoom(); });
  document.addEventListener("keydown", (e) => {
    if ($("lightbox").classList.contains("hidden")) return;
    if (e.key === "Escape") closeZoom();
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });
  let tx = null;                          // swipe sa loob ng zoom (phone)
  $("lightbox").addEventListener("touchstart", (e) => (tx = e.touches[0].clientX), { passive: true });
  $("lightbox").addEventListener("touchend", (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    tx = null;
  });

  window.addEventListener("resize", layout);
  layout();
})();

/* ---------- Music player (kinukuha ang playlist sa index.html) ---------- */
const audio = new Audio();
let musicPlay = () => {};
let musicUnlock = () => {};

(function player() {
  const list = $$("#playlist .track").map((t) => ({ ...t.dataset }));
  if (!list.length) list.push({ title: "Your song", artist: "Artist", src: "", cover: "" });
  let track = 0;
  audio.volume = 0.5;   // 50% sa simula; siya na bahala sa slider

  const fmt = (s) => (isFinite(s) ? Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") : "0:00");

  function load(i, autoplay) {
    track = (i + list.length) % list.length;
    const t = list[track];
    $("mini-title").textContent = $("card-title").textContent = t.title || "";
    $("mini-artist").textContent = $("card-artist").textContent = t.artist || "";
    $("now").textContent = list.length > 1 ? `NOW PLAYING · ${track + 1}/${list.length}` : "NOW PLAYING";
    $("cover").innerHTML = (t.cover ? `<img src="${t.cover}" alt="" onerror="this.remove()" />` : "") + `<div class="cover-ph">♥</div>`;
    audio.src = t.src || "";
    $("seek").value = 0;
    $("t-cur").textContent = "0:00";
    $("t-dur").textContent = "0:00";
    paint($("seek"));
    setPlaying(false);
    if (autoplay && t.src) audio.play().catch(() => {});
  }

  function setPlaying(on) {
    $("ic-play").classList.toggle("hidden", on);
    $("ic-pause").classList.toggle("hidden", !on);
    $("disc-mini").classList.toggle("spin", on);
  }

  function paint(el) {
    const p = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.background = `linear-gradient(90deg, #ff9ec0 ${p}%, rgba(255,255,255,.22) ${p}%)`;
  }

  musicPlay = () => {
    if (!audio.getAttribute("src") || !audio.paused) return;
    audio.play().catch(() => {
      // hinarang ng browser (iPhone): magsisimula sa susunod na pindot kahit saan
      document.addEventListener("pointerdown", () => audio.paused && audio.play().catch(() => {}), { once: true });
    });
  };
  // "i-unlock" ang audio habang may pindot ng user (iPhone/Safari), para makapag-play mamaya nang kusa
  musicUnlock = () => {
    if (!audio.getAttribute("src")) return;
    const was = audio.muted;
    audio.muted = true;
    audio.play().then(() => { audio.pause(); audio.currentTime = 0; audio.muted = was; }).catch(() => { audio.muted = was; });
  };

  $("p-play").addEventListener("click", () => {
    if (!audio.getAttribute("src")) return;
    audio.paused ? audio.play().catch(() => {}) : audio.pause();
  });
  $("p-prev").addEventListener("click", () => (audio.currentTime > 3 ? (audio.currentTime = 0) : load(track - 1, true)));
  $("p-next").addEventListener("click", () => load(track + 1, true));

  audio.addEventListener("play", () => setPlaying(true));
  audio.addEventListener("pause", () => setPlaying(false));
  audio.addEventListener("ended", () => load(track + 1, true));
  audio.addEventListener("loadedmetadata", () => ($("t-dur").textContent = fmt(audio.duration)));
  audio.addEventListener("timeupdate", () => {
    $("t-cur").textContent = fmt(audio.currentTime);
    if (audio.duration) $("seek").value = (audio.currentTime / audio.duration) * 1000;
    paint($("seek"));
  });
  $("seek").addEventListener("input", () => {
    if (audio.duration) audio.currentTime = ($("seek").value / 1000) * audio.duration;
    paint($("seek"));
  });
  $("vol").addEventListener("input", () => { audio.volume = $("vol").value / 100; paint($("vol")); });
  paint($("vol"));

  const expand = (on) => { $("card").classList.toggle("hidden", !on); $("mini").classList.toggle("hidden", on); };
  $("mini").addEventListener("click", () => expand(true));
  $("card-close").addEventListener("click", () => expand(false));

  // ---- Playlist picker: pumili ng kanta, kusang mag-play ----
  const panel = $("songs-panel"), sbtn = $("songs-btn");
  function drawList() {
    panel.innerHTML = list.map((t, i) => `
      <button class="song${i === track ? " on" : ""}" data-i="${i}" type="button">
        <span class="song-cover">${t.cover ? `<img src="${t.cover}" alt="" onerror="this.remove()" />` : ""}<i>♥</i></span>
        <span class="song-text"><b>${t.title || ""}</b><small>${t.artist || ""}</small></span>
        <span class="song-eq">${i === track ? "♪" : ""}</span>
      </button>`).join("");
  }
  sbtn.addEventListener("click", (e) => { e.stopPropagation(); drawList(); panel.classList.toggle("hidden"); });
  panel.addEventListener("click", (e) => {
    const b = e.target.closest(".song"); if (!b) return;
    const i = +b.dataset.i;
    if (i === track) { audio.paused && audio.play().catch(() => {}); } else load(i, true);
    drawList();
    setTimeout(() => panel.classList.add("hidden"), 250);
  });
  document.addEventListener("click", (e) => { if (!panel.contains(e.target)) panel.classList.add("hidden"); });
  audio.addEventListener("ended", () => setTimeout(drawList, 50));

  load(0, false);
})();

/* ---------- Letter (sobre) ---------- */
(function letter() {
  const envs = [$("envelope"), $("envelope2")];
  const N = envs.length;
  const pileEl = $("env-pile");
  let order = envs.map((_, i) => i);      // order[0] = nasa ibabaw
  let busy = false;

  function place(el, d) {
    const W = pileEl.clientWidth || 300, k = Math.min(d, 2), sign = d % 2 ? 1 : -1;
    el.style.zIndex = N - d;
    el.style.filter = `brightness(${1 - k * 0.08})`;
    el.style.transform = d === 0 ? "none" : `translate(${sign * 0.085 * W}px, ${-10 * k}px) rotate(${sign * 6}deg) scale(${1 - k * 0.03})`;
  }
  function layout() {
    order.forEach((ci, d) => place(envs[ci], d));
    $("env-count").textContent = `${order[0] + 1} / ${N}`;
    $("env-cap").textContent = envs[order[0]].dataset.caption || "";
  }
  const shift = (dir) => { if (busy || N < 2) return; if (dir > 0) order.push(order.shift()); else order.unshift(order.pop()); layout(); };
  layout();
  window.addEventListener("resize", layout);
  $("env-next").addEventListener("click", () => shift(1));
  $("env-prev").addEventListener("click", () => shift(-1));

  function openLetter(idx) {
    if (busy) return;
    busy = true;
    const env = envs[idx];
    track("letter" + (idx + 1), `💌 Binuksan/binasa niya ang letter #${idx + 1}`, 60 * 1000);
    env.classList.add("open");
    sfx.open();
    petalBurst(env);
    $("env-hint").textContent = "";
    setTimeout(() => {
      for (let i = 0; i < N; i++) $("letter-wrap-" + (i + 1)).classList.toggle("hidden", i !== idx);
      $("reader").classList.remove("hidden");
      const sc = $(idx === 0 ? "letter-scroll" : "letter-scroll-2");
      sc.scrollTop = 0;
      sc.classList.remove("write"); [...sc.children].forEach((p, i) => p.style.setProperty("--i", Math.min(i, 6)));
      void sc.offsetWidth; sc.classList.add("write");     // parang sinusulat ang letter
      sc.focus({ preventScroll: true });
      document.body.style.overflow = "hidden";
    }, 1000);
  }

  // sumasabog na talulot mula sa envelope
  function petalBurst(env) {
    const r = env.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 26; i++) {
      const p = document.createElement("i");
      p.className = "env-petal";
      p.style.cssText = `left:${cx}px;top:${cy}px;--dx:${Math.random() * 360 - 180}px;--dy:${-60 - Math.random() * 220}px;--r:${Math.random() * 540 - 270}deg;--s:${8 + Math.random() * 10}px;--dl:${Math.random() * 0.25}s`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 2200);
    }
  }

  function closeLetter() {
    $("reader").classList.add("hidden");
    document.body.style.overflow = "";
    setTimeout(() => {
      envs.forEach((e) => e.classList.remove("open"));
      $("env-hint").textContent = "tap the envelope ♡";
      busy = false;
    }, 300);
  }

  envs.forEach((env, idx) => {
    const act = () => { if (order[0] === idx) openLetter(idx); else { order = [idx, ...order.filter((x) => x !== idx)]; layout(); } };
    env.addEventListener("click", act);
    env.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
  });
  $("reader-close").addEventListener("click", closeLetter);
  $("reader").addEventListener("click", (e) => { if (e.target === $("reader")) closeLetter(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("reader").classList.contains("hidden")) closeLetter(); });
})();

/* ---------- 3D text background (home page) ---------- */
let fxStart = () => {};

(function fx() {
  const root = $("fx"), world = $("fx-world");
  const texts = $$("#fx-texts span").map((s) => s.textContent.trim()).filter(Boolean);
  const icons = $$("#fx-icons span").map((s) => s.textContent.trim()).filter(Boolean);
  if (!texts.length) texts.push("I love you");

  const small = window.innerWidth < 700;
  const COUNT = Math.round((Number(root.dataset.count) || 90) * (small ? 0.6 : 1));
  const SPEED = Number(root.dataset.speed) || 150;   // bilis ng paglipad
  const ZMIN = -3300, RANGE = 3800;                  // lalim ng "tunnel"
  const r = (a, b) => a + Math.random() * (b - a);
  const items = [];

  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement("div");
    const isIcon = icons.length && Math.random() < 0.22;
    if (isIcon) {
      el.className = "fx-item i";
      el.textContent = icons[Math.floor(Math.random() * icons.length)];
      el.style.fontSize = r(20, 34) + "px";
    } else {
      el.className = "fx-item " + (Math.random() < 0.55 ? "p" : "w");
      el.textContent = texts[Math.floor(Math.random() * texts.length)];
      el.style.fontSize = (Math.random() < 0.07 ? r(44, 62) : r(15, 30)) + "px";
    }
    world.appendChild(el);
    items.push({ el, x: r(-1300, 1300), y: r(-760, 760), z0: r(0, RANGE), ry: r(-38, 38), rx: r(-22, 22), rz: r(-14, 14) });
  }
  for (let i = 0; i < 45; i++) {                      // maliliit na puting tuldok
    const el = document.createElement("div");
    el.className = "fx-dot";
    world.appendChild(el);
    items.push({ el, x: r(-1500, 1500), y: r(-900, 900), z0: r(0, RANGE), ry: 0, rx: 0, rz: 0 });
  }

  let raf = null, t0 = 0;

  function frame(now) {
    const t = (now - t0) / 1000;
    // umiindayog ang camera
    const ry = Math.sin(t * 0.23) * 26, rx = Math.sin(t * 0.17 + 1) * 13, rz = Math.sin(t * 0.11 + 2) * 8;
    world.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;

    for (const it of items) {
      const z = ZMIN + ((it.z0 + t * SPEED) % RANGE);
      let o = 1;
      if (z < ZMIN + 700) o = (z - ZMIN) / 700;        // lumilitaw sa malayo
      else if (z > 250) o = Math.max(0, 1 - (z - 250) / 180); // nawawala pag dumikit sa camera
      it.el.style.opacity = o.toFixed(2);
      it.el.style.transform = `translate(-50%,-50%) translate3d(${it.x}px,${it.y}px,${z}px) rotateY(${it.ry}deg) rotateX(${it.rx}deg) rotateZ(${it.rz}deg)`;
    }
    raf = requestAnimationFrame(frame);
  }

  fxStart = () => {
    if (raf) return;
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  };
})();

/* ---------- Love: Flowers For You (bukas / sara) ---------- */
(function love() {
  const sec = $("love"), bq = $("bouquet");
  function toggle() {
    const on = !sec.classList.contains("opened");
    sec.classList.toggle("opened", on);
    bq.setAttribute("aria-expanded", on);
  }
  bq.addEventListener("click", toggle);
  bq.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
})();

/* ---------- Heart: ikaw ang papana -> magiging cake ---------- */
let heartCakeStart = () => {};

(function heartCake() {
  const stage = $("bday-stage"), string = $("bow-string"), arrow = $("bow-arrow"), burst = $("burst"), hint = $("shoot-hint");
  const REST = 45, PULL = 26;         // posisyon ng string (nasa loob ng 360x200 na sukat)
  let state = "idle";                 // idle | aiming | aimed | shooting | cake
  let started = false;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  const tween = (ms, fn) => new Promise((res) => {
    const t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / ms);
      fn(k);
      k < 1 ? requestAnimationFrame(step) : res();
    })(t0);
  });
  const setNock = (x) => {
    string.setAttribute("d", `M45 45 Q${x} 95 45 145`);
    arrow.setAttribute("transform", `translate(${x} 95)`);
  };
  const setHint = (txt) => { hint.textContent = txt || ""; hint.classList.toggle("show", !!txt); };

  // 3 segundong pagsabog: mga heart + maliliit na cupcake
  function spawnBurst() {
    const marks = ["♥", "💗", "🧁", "♥", "✦", "🧁", "💖"];
    const WAVES = 12, GAP = 250;            // 12 x 250ms = 3 segundo
    burst.innerHTML = "";
    for (let w = 0; w < WAVES; w++) {
      setTimeout(() => {
        let html = "";
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 130;
          html += `<i style="--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--rot:${Math.random() * 160 - 80}deg;font-size:${12 + Math.random() * 16}px">${marks[(Math.random() * marks.length) | 0]}</i>`;
        }
        burst.insertAdjacentHTML("beforeend", html);
        [...burst.children].slice(0, -60).forEach((n) => n.remove());
      }, w * GAP);
    }
    setTimeout(() => (burst.innerHTML = ""), WAVES * GAP + 1200);
  }

  // lilitaw ang pana na naka-tutok na sa heart (hila na ang string)
  async function aim() {
    if (state === "aiming" || state === "aimed" || state === "shooting") return;
    state = "aiming";
    stage.classList.remove("s-cake", "s-hit", "s-aim");
    arrow.style.opacity = 1;
    setNock(REST);
    stage.classList.add("s-bow");
    await wait(700);
    await tween(550, (k) => setNock(REST - (REST - PULL) * ease(k)));
    stage.classList.add("s-aim");
    state = "aimed";
    setHint(stage.dataset.hintShoot);
  }

  // ikaw ang pumapana: bitaw!
  async function shoot() {
    if (state !== "aimed") return;
    state = "shooting";
    sfx.shoot();
    setHint("");
    stage.classList.remove("s-aim");
    await Promise.all([
      tween(260, (k) => setNock(PULL + (REST + 66 - PULL) * k * k)),
      tween(220, (k) => string.setAttribute("d", `M45 45 Q${PULL + (REST + 6 - PULL) * ease(k)} 95 45 145`)),
    ]);
    stage.classList.add("s-hit");                 // tama!
    sfx.hit();
    spawnBurst();
    await wait(500);
    stage.classList.add("s-cake");                // cake na!
    setNock(REST);
    string.setAttribute("d", "M45 45 Q45 95 45 145");
    arrow.style.opacity = 0;
    state = "cake";
    setHint(stage.dataset.hintAgain);
  }

  async function replay() {
    if (state !== "cake") return;
    state = "idle";
    setHint("");
    stage.classList.remove("s-cake", "s-hit", "s-bow", "s-aim");
    await wait(600);
    aim();
  }

  const onTap = () => (state === "aimed" ? shoot() : state === "cake" ? replay() : null);
  stage.addEventListener("click", onTap);
  stage.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap(); } });

  heartCakeStart = () => {
    if (started) return;
    started = true;
    setTimeout(aim, 1200);
  };
})();

/* mga talulot na lumulutang sa bouquet */
(function petals() {
  const r = (a, b) => a + Math.random() * (b - a);
  let html = "";
  for (let i = 0; i < 14; i++) {
    html += `<i style="left:${r(8, 92)}%;--t:${r(6, 10)}s;--dl:-${r(0, 9)}s;--dx:${r(-40, 40)}px;--rot:${r(120, 320)}deg"></i>`;
  }
  $("petals").innerHTML = html;
})();


/* ---------- Reasons I love you (random, walang ulit hangga't hindi pa naubos) ---------- */
(function reasons() {
  const list = [...$("r-list").children].map((li) => li.textContent.trim());
  const heart = $("r-heart"), text = $("r-text"), cnt = $("r-count"), card = $("r-card");
  let pool = [], seen = 0;
  heart.addEventListener("click", () => {
    if (!pool.length) { pool = list.map((_, i) => i).sort(() => Math.random() - 0.5); seen = 0; }
    const i = pool.pop(); seen++;
    sfx.tick();
    heart.classList.remove("beat"); void heart.offsetWidth; heart.classList.add("beat");
    card.classList.remove("in"); void card.offsetWidth; card.classList.add("in");
    text.textContent = list[i];
    cnt.textContent = `reason ${seen} of ${list.length}`;
    if (!pool.length) setTimeout(() => (cnt.textContent = "that's all… for now ♡ (tap to read again)"), 2600);
  });
})();

/* ---------- App (PWA): service worker + install ---------- */
(function pwa() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  const btn = $("install-btn"), tip = $("install-tip");
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone) return;
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; btn.classList.remove("hidden"); });
  btn.addEventListener("click", async () => {
    if (!deferred) return;
    deferred.prompt(); await deferred.userChoice.catch(() => {});
    deferred = null; btn.classList.add("hidden");
  });
  window.addEventListener("appinstalled", () => btn.classList.add("hidden"));
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) tip.classList.remove("hidden");
})();


/* ---------- Passcode page: pindutin ang photo para makita ang buo ---------- */
(function photoZoom() {
  const inner = $("frame-inner"), box = $("photo-zoom"), big = $("pz-img");
  const close = () => { box.classList.add("hidden"); document.body.style.overflow = ""; };
  inner.addEventListener("click", () => {
    const img = inner.querySelector("img");
    if (!img) return;                       // wala pang photo.jpg
    big.src = img.getAttribute("src");
    box.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  });
  box.addEventListener("click", close);
  $("pz-close").addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !box.classList.contains("hidden")) close(); });
})();


/* ---------- Since the moment... counter ---------- */
(function sinceCounter() {
  const fab = $("since-fab"), card = $("since-card");
  if (!fab || !card) return;
  const start = new Date(card.dataset.since || "2024-01-01T00:00:00");
  $("since-title-text").textContent = card.dataset.title || "Since the moment I fell in love with you";
  const two = (n) => String(n).padStart(2, "0");
  function tick() {
    const now = new Date();
    if (isNaN(start) || now < start) return;
    let y = now.getFullYear() - start.getFullYear(), mo = now.getMonth() - start.getMonth(), d = now.getDate() - start.getDate();
    let h = now.getHours() - start.getHours(), mi = now.getMinutes() - start.getMinutes(), s = now.getSeconds() - start.getSeconds();
    if (s < 0) { s += 60; mi--; }
    if (mi < 0) { mi += 60; h--; }
    if (h < 0) { h += 24; d--; }
    if (d < 0) { d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); mo--; }
    if (mo < 0) { mo += 12; y--; }
    $("sn-y").textContent = y; $("sn-mo").textContent = mo; $("sn-d").textContent = d;
    $("sn-h").textContent = two(h); $("sn-mi").textContent = two(mi); $("sn-s").textContent = two(s);
  }
  let timer = null;
  function setOpen(on) {
    card.classList.toggle("hidden", !on);
    fab.classList.toggle("is-open", on);
    fab.setAttribute("aria-expanded", String(on));
    clearInterval(timer);
    if (on) { tick(); timer = setInterval(tick, 1000); }
  }
  fab.addEventListener("click", (e) => { e.stopPropagation(); setOpen(card.classList.contains("hidden")); });
  document.addEventListener("click", (e) => { if (!card.classList.contains("hidden") && !card.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
})();
