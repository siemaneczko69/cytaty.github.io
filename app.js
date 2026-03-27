/**
 * app.js — Głosy Świata
 * Backend: Firebase Realtime Database
 *
 * Wklej URL swojej bazy Firebase poniżej:
 */

const FIREBASE_URL = "https://glosy-swiata-default-rtdb.europe-west1.firebasedatabase.app/";
// np. "https://glosy-swiata-default-rtdb.europe-west1.firebasedatabase.app"

// ─── Seed quotes ───

const DEFAULT_QUOTE = {
  id: "default-1",
  text: "Nie kochać cycków to jak nie lubić zimnego piwa, oddychania lub kebaba niby można ale co to za życie",
  author: "Mariolka <3",
  tag: "humor",
  color: "wine",
  date: "2024-01-01"
};

let quotes        = [];
let currentFilter   = "all";
let currentSearch   = "";
let currentCategory = "";
let selectedTag   = "ogólne";
let selectedColor = "ink";

// ─── Firebase REST ───

function quotesUrl(path="") { return `${FIREBASE_URL}/quotes${path}.json`; }
function likesUrl(id)       { return `${FIREBASE_URL}/likes/${id}.json`; }
function allLikesUrl()      { return `${FIREBASE_URL}/likes.json`; }
function suggestionsUrl(path="") { return `${FIREBASE_URL}/sugestie${path}.json`; }

async function fetchQuotes() {
  if (FIREBASE_URL === "WKLEJ_TUTAJ_URL_FIREBASE") { showConfigWarning(); return []; }
  try {
    const [qRes, lRes] = await Promise.all([
      fetch(quotesUrl()),
      fetch(allLikesUrl())
    ]);
    if (!qRes.ok) throw new Error(`HTTP ${qRes.status}`);
    const qData = await qRes.json();
    const lData = lRes.ok ? await lRes.json() : {};
    const likesMap = lData || {};
    const myLikes  = getMyLikes();

    if (!qData) {
      await seedDatabase();
      return SEED_QUOTES.map(q => ({ ...q, likes:0, likedByMe:false }));
    }

    const arr = Object.values(qData).map(q => ({
      ...q,
      likes:     likesMap[q.id] || 0,
      likedByMe: myLikes.includes(q.id)
    }));
    arr.sort((a,b) => new Date(b.date) - new Date(a.date));
    return arr;
  } catch(e) {
    console.error("fetchQuotes:", e);
    showToast("Błąd połączenia: " + e.message);
    return [];
  }
}

async function seedDatabase() {
  for (const q of SEED_QUOTES) {
    await fetch(quotesUrl(`/${q.id}`), {
      method:"PUT",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(q)   // seed nie ma pola likes — zgodnie z regułami
    });
  }
}

async function pushQuote(q) {
  // Wysyłamy TYLKO dozwolone pola — bez likes/likedByMe/mine
  const payload = { id:q.id, text:q.text, author:q.author, tag:q.tag, color:q.color, date:q.date };
  const res = await fetch(quotesUrl(`/${q.id}`), {
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
}

async function updateLikes(id, newCount) {
  try {
    const res = await fetch(likesUrl(id), {
      method: "PUT",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(newCount)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("updateLikes error:", res.status, err);
      showToast("Błąd like: " + (err.error || "HTTP " + res.status));
    }
  } catch(e) {
    console.error("updateLikes exception:", e);
    showToast("Błąd sieci przy like: " + e.message);
  }
}

// ─── Moje polubienia (localStorage) ───
function getMyLikes() {
  try { return JSON.parse(localStorage.getItem("glosy_my_likes") || "[]"); } catch { return []; }
}
function saveMyLikes(arr) { localStorage.setItem("glosy_my_likes", JSON.stringify(arr)); }

// ─── Config warning ───
function showConfigWarning() {
  document.getElementById("quotes-grid").innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:60px 20px;
      font-family:'DM Mono',monospace;font-size:0.82rem;line-height:2.6;max-width:580px;margin:0 auto;">
      <div style="font-size:2.5rem;margin-bottom:16px;">🔥</div>
      <strong style="font-size:1rem;color:#e8e4d8;">Skonfiguruj Firebase</strong><br>
      <span style="color:rgba(232,228,216,0.55)">
        1. <a href="https://console.firebase.google.com" target="_blank"
          style="color:#c9a84c;text-decoration:underline">console.firebase.google.com</a> → Add project<br>
        2. Build → Realtime Database → Create Database → Test mode → Enable<br>
        3. Skopiuj URL bazy → wklej w <strong style="color:#e8e4d8">app.js</strong> w <strong style="color:#e8e4d8">FIREBASE_URL</strong><br>
        4. Zakładka Rules → wklej zawartość <strong style="color:#e8e4d8">firebase-rules.json</strong> → Publish
      </span>
    </div>`;
}

// ─── Render ───
function renderQuotes() {
  const grid  = document.getElementById("quotes-grid");
  const empty = document.getElementById("empty-state");
  let filtered = [...quotes].sort((a,b) => new Date(b.date) - new Date(a.date));
  if (currentFilter === "popularne") filtered = [...filtered].sort((a,b) => b.likes - a.likes);
  if (currentCategory) filtered = filtered.filter(q => q.tag === currentCategory);
  if (currentSearch.trim()) {
    const s = currentSearch.toLowerCase();
    filtered = filtered.filter(q =>
      q.text.toLowerCase().includes(s) ||
      q.author.toLowerCase().includes(s) ||
      q.tag.toLowerCase().includes(s)
    );
  }
  grid.innerHTML = "";
  if (!filtered.length) { empty.classList.remove("hidden"); return; }
  empty.classList.add("hidden");
  filtered.forEach((q,i) => grid.appendChild(buildCard(q,i)));
}

function buildCard(q, delay) {
  const card = document.createElement("div");
  card.className     = "quote-card";
  card.dataset.color = q.color || "ink";
  card.dataset.id    = q.id;
  card.style.animationDelay = `${delay * 0.05}s`;
  card.innerHTML = `
    <span class="quote-meta">${q.date ? formatDate(q.date) : ""}</span>
    <span class="quote-mark">&ldquo;</span>
    <p class="quote-body">${escapeHTML(q.text)}</p>
    <div class="quote-author-line">— ${escapeHTML(q.author)}</div>
    <div class="card-footer">
      <span class="quote-tag">${escapeHTML(q.tag)}</span>
      <div class="card-actions">
        <button class="action-btn like-btn ${q.likedByMe ? "liked" : ""}" data-id="${q.id}">
          ${q.likedByMe ? "❤" : "♡"} <span>${q.likes}</span>
        </button>
      </div>
    </div>`;
  card.addEventListener("click", e => { if (!e.target.closest(".action-btn")) openModal(q); });
  card.querySelector(".like-btn").addEventListener("click", e => { e.stopPropagation(); toggleLike(q.id); });
  return card;
}

// ─── Actions ───
async function toggleLike(id) {
  const q = quotes.find(x => x.id === id);
  if (!q) return;
  const myLikes = getMyLikes();

  // Blokuj wielokrotne polubienie tego samego
  if (q.likedByMe) {
    q.likedByMe = false;
    q.likes = Math.max(0, q.likes - 1);
    saveMyLikes(myLikes.filter(x => x !== id));
  } else {
    q.likedByMe = true;
    q.likes += 1;
    saveMyLikes([...myLikes, id]);
  }
  renderQuotes();
  updateStats();
  await updateLikes(id, q.likes);
}


function updateStats() {
  const el = document.getElementById("feed-stats");
  if (!el) return;
  const total = quotes.length;
  const likes = quotes.reduce((s, q) => s + (q.likes || 0), 0);
  if (total === 0) { el.textContent = ""; return; }
  const qWord = total === 1 ? "cytat" : total < 5 ? "cytaty" : "cytatów";
  const lWord = likes === 1 ? "polubienie" : likes < 5 ? "polubienia" : "polubień";
  el.textContent = `${total} ${qWord} · ${likes} ${lWord}`;
}

async function addQuote() {
  const text   = document.getElementById("quote-text").value.trim();
  const author = document.getElementById("quote-author").value.trim();
  if (!text)   { showToast("Wpisz treść cytatu!"); return; }
  if (!author) { showToast("Wpisz imię lub pseudonim!"); return; }

  const btn = document.getElementById("submit-quote-btn");
  btn.disabled = true; btn.textContent = "Zapisuję…";

  const q = {
    id:     "q-" + Date.now(),
    text, author,
    tag:    selectedTag,
    color:  selectedColor,
    date:   new Date().toISOString().slice(0,10)
  };

  try {
    await pushQuote(q);
    quotes.unshift({ ...q, likes:0, likedByMe:false, mine:true });
    document.getElementById("quote-text").value = "";
    document.getElementById("quote-author").value = "";
    document.getElementById("char-count").textContent = "0 / 280";
    updatePreview();
    showToast("✓ Cytat opublikowany!");
    switchView("feed");
    renderQuotes();
  } catch(e) {
    showToast("Błąd: " + e.message);
  }

  btn.disabled = false; btn.textContent = "Opublikuj cytat";
}

// ─── Preview ───
function updatePreview() {
  const text   = document.getElementById("quote-text").value.trim();
  const author = document.getElementById("quote-author").value.trim();
  const count  = document.getElementById("quote-text").value.length;
  document.getElementById("char-count").textContent     = `${count} / 280`;
  document.getElementById("preview-text").textContent   = text   || "Twój cytat pojawi się tutaj…";
  document.getElementById("preview-author").textContent = author || "Autor";
  document.getElementById("preview-tag").textContent    = selectedTag;
  document.getElementById("preview-card").dataset.color = selectedColor;
}

// ─── Modal ───
let _currentModalQuote = null;
function openModal(q) {
  _currentModalQuote = q;
  document.getElementById("modal-text").textContent   = q.text;
  document.getElementById("modal-author").textContent = "— " + q.author;
  document.getElementById("modal-tag").textContent    = q.tag;
  document.getElementById("modal-date").textContent   = q.date ? "Dodano: " + formatDate(q.date) : "";
  // Reset share bar
  const shareRow = document.getElementById("modal-share-row");
  if (shareRow) { shareRow.style.display = "none"; shareRow.innerHTML = ""; }
  // Populate hidden render card
  const card = document.getElementById("quote-render-card");
  const colorMap = {
    ink:"linear-gradient(135deg,#1a1a2e,#16213e)", wine:"linear-gradient(135deg,#4a0e0e,#2d0a0a)",
    forest:"linear-gradient(135deg,#0d2b1e,#081a12)", ocean:"linear-gradient(135deg,#0a1f3a,#060f1d)",
    dusk:"linear-gradient(135deg,#2a1a3e,#180e26)", cream:"linear-gradient(135deg,#f5f0e8,#ede7d7)",
    rose:"linear-gradient(135deg,#3d1525,#220b15)", ember:"linear-gradient(135deg,#3a1f0a,#1f0e00)",
    sage:"linear-gradient(135deg,#1e2a22,#101a14)", obsidian:"linear-gradient(135deg,#1f0c0c,#0e0608)",
    abyss:"linear-gradient(135deg,#091a1f,#040d10)", storm:"linear-gradient(135deg,#111820,#090e15)",
    void:"linear-gradient(135deg,#141418,#0c0c10)"
  };
  const isLight = q.color === "cream";
  card.style.background = colorMap[q.color] || colorMap.ink;
  card.style.color = isLight ? "#2a2018" : "#e8e4d8";
  document.getElementById("render-text").textContent   = q.text;
  document.getElementById("render-author").textContent = "— " + q.author;
  document.getElementById("render-tag").textContent    = q.tag;
  document.getElementById("modal-overlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  // Załaduj komentarze
  renderCommentsSection(q.id);
  // Ustaw URL
  const url = new URL(window.location.href);
  url.searchParams.set("q", q.id);
  history.replaceState(null, "", url.toString());
}
function closeModal() {
  document.getElementById("modal-overlay").classList.add("hidden");
  document.body.style.overflow = "";
  // Wyczyść ?q= z URL
  const url = new URL(window.location.href);
  url.searchParams.delete("q");
  history.replaceState(null, "", url.toString());
}

// ─── Sugestie ───
let selectedSuggestionType = "pomysł";

async function submitSuggestion() {
  const message = document.getElementById("contact-message").value.trim();
  const nick    = document.getElementById("contact-nick").value.trim();
  if (!message) { showToast("Wpisz treść wiadomości!"); return; }

  const btn = document.getElementById("submit-contact-btn");
  btn.disabled = true; btn.textContent = "Wysyłam…";

  const s = {
    id:      "s-" + Date.now(),
    nick:    nick || "Anonim",
    type:    selectedSuggestionType,
    message,
    date:    new Date().toISOString().slice(0,10),
    read:    false
  };

  try {
    const res = await fetch(suggestionsUrl(`/${s.id}`), {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(s)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    document.getElementById("contact-message").value = "";
    document.getElementById("contact-nick").value = "";
    document.getElementById("contact-char-count").textContent = "0 / 500";
    showToast("✓ Sugestia wysłana, dzięki!");
    switchView("feed");
  } catch(e) {
    showToast("Błąd: " + e.message);
  }

  btn.disabled = false; btn.textContent = "Wyślij sugestię";
}

// ─── View ───
function switchView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("view-"+name).classList.add("active");
  document.querySelector(`[data-view="${name}"]`).classList.add("active");
}

// ─── Export ───
function exportJSON(){ download("cytaty.json", JSON.stringify(quotes,null,2), "application/json"); }
function exportCSV(){
  const h = "id,text,author,tag,color,likes,date\n";
  const r = quotes.map(q => [q.id,`"${q.text.replace(/"/g,'""')}"`,`"${q.author}"`,q.tag,q.color,q.likes,q.date].join(",")).join("\n");
  download("cytaty.csv", h+r, "text/csv");
}
function exportXML(){
  const items = quotes.map(q=>`\n  <cytat id="${q.id}"><tekst>${escapeXML(q.text)}</tekst><autor>${escapeXML(q.author)}</autor><kategoria>${q.tag}</kategoria><polubienia>${q.likes}</polubienia><data>${q.date}</data></cytat>`).join("");
  download("cytaty.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<cytaty>${items}\n</cytaty>`, "application/xml");
}
function exportTXT(){
  download("cytaty.txt", quotes.map(q=>`"${q.text}"\n  — ${q.author} [${q.tag}] | ♡ ${q.likes} | ${q.date}`).join("\n\n---\n\n"), "text/plain");
}
function download(filename, content, mime){
  const a = Object.assign(document.createElement("a"),{
    href: URL.createObjectURL(new Blob([content],{type:mime})), download:filename
  });
  a.click(); URL.revokeObjectURL(a.href);
}

// ─── Loader / Toast ───
function showLoader(msg="Ładowanie cytatów…") {
  let el = document.getElementById("app-loader");
  if (!el) {
    el = document.createElement("div"); el.id="app-loader";
    el.style.cssText = "position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:rgba(14,14,20,0.88);backdrop-filter:blur(8px);";
    el.innerHTML = `<div style="text-align:center;color:#c9a84c;font-family:'DM Mono',monospace;font-size:0.85rem;">
      <div style="width:40px;height:40px;border:3px solid rgba(201,168,76,0.2);border-top-color:#c9a84c;
        border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>${msg}</div>`;
    if (!document.querySelector("#spin-style")){
      const s=document.createElement("style");s.id="spin-style";
      s.textContent="@keyframes spin{to{transform:rotate(360deg)}}";
      document.head.appendChild(s);
    }
    document.body.appendChild(el);
  }
}
function hideLoader(){ const el=document.getElementById("app-loader"); if(el) el.remove(); }
function showToast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg; t.classList.add("show");
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),2800);
}

// ─── Helpers ───
function escapeHTML(str){ return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function escapeXML(str){  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;"); }
function formatDate(d){   try{return new Date(d).toLocaleDateString("pl-PL",{day:"numeric",month:"short",year:"numeric"});}catch{return d;} }

// ─── Init ───
document.addEventListener("DOMContentLoaded", async () => {
  showLoader();
  quotes = await fetchQuotes();
  hideLoader();
  renderQuotes();
  updateStats();

  document.querySelectorAll(".nav-btn").forEach(btn => btn.addEventListener("click", () => {
    switchView(btn.dataset.view);
    if (btn.dataset.view === "feed") {
      showLoader("Odświeżam…");
      fetchQuotes().then(q => { quotes=q; hideLoader(); renderQuotes(); updateStats(); });
    }
  }));
  document.getElementById("search-input").addEventListener("input", e => { currentSearch=e.target.value; renderQuotes(); });
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active"); currentFilter=btn.dataset.filter; renderQuotes();
    });
  });
  document.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active"); currentCategory=btn.dataset.cat; renderQuotes();
    });
  });
  document.querySelectorAll(".tag-option").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".tag-option").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active"); selectedTag=btn.dataset.tag; updatePreview();
  }));
  document.querySelectorAll(".color-swatch").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".color-swatch").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active"); selectedColor=btn.dataset.color; updatePreview();
  }));
  document.getElementById("quote-text").addEventListener("input", updatePreview);
  document.getElementById("quote-author").addEventListener("input", updatePreview);
  document.getElementById("submit-quote-btn").addEventListener("click", addQuote);
  document.getElementById("clear-form-btn").addEventListener("click", () => {
    document.getElementById("quote-text").value="";
    document.getElementById("quote-author").value="";
    updatePreview();
  });
  document.getElementById("go-add-btn").addEventListener("click", () => switchView("add"));
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-overlay").addEventListener("click", e => { if(e.target===e.currentTarget) closeModal(); });
  document.addEventListener("keydown", e => { if(e.key==="Escape") closeModal(); });

  document.getElementById("modal-download-btn").addEventListener("click", async () => {
    const card = document.getElementById("quote-render-card");
    const btn  = document.getElementById("modal-download-btn");
    btn.textContent = "Generuję…"; btn.disabled = true;
    try {
      const canvas = await html2canvas(card, { scale: 2, useCORS: true, backgroundColor: null });
      // Apply rounded corners by clipping on a second canvas
      const radius = 20 * 2; // scale:2
      const out = document.createElement("canvas");
      out.width = canvas.width; out.height = canvas.height;
      const ctx = out.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(out.width - radius, 0);
      ctx.quadraticCurveTo(out.width, 0, out.width, radius);
      ctx.lineTo(out.width, out.height - radius);
      ctx.quadraticCurveTo(out.width, out.height, out.width - radius, out.height);
      ctx.lineTo(radius, out.height);
      ctx.quadraticCurveTo(0, out.height, 0, out.height - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(canvas, 0, 0);
      const a = document.createElement("a");
      a.download = "cytat-glosy-swiata.png";
      a.href = out.toDataURL("image/png");
      a.click();
    } catch(e) { showToast("Błąd generowania obrazka."); }
    btn.textContent = "⬇ Pobierz grafikę"; btn.disabled = false;
  });

  document.getElementById("modal-copy-btn").addEventListener("click", () => {
    if (!_currentModalQuote) return;
    const q = _currentModalQuote;
    const text = `„${q.text}" — ${q.author}`;
    navigator.clipboard.writeText(text).then(
      () => showToast("✓ Skopiowano do schowka!"),
      () => showToast("Błąd kopiowania.")
    );
  });
  document.getElementById("export-json").addEventListener("click", exportJSON);
  document.getElementById("export-csv").addEventListener("click",  exportCSV);
  document.getElementById("export-xml").addEventListener("click",  exportXML);
  document.getElementById("export-txt").addEventListener("click",  exportTXT);

  // Contact / sugestie
  document.querySelectorAll("#suggestion-type-selector .tag-option").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#suggestion-type-selector .tag-option").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedSuggestionType = btn.dataset.type;
    });
  });
  document.getElementById("contact-message").addEventListener("input", e => {
    document.getElementById("contact-char-count").textContent = `${e.target.value.length} / 500`;
  });
  document.getElementById("submit-contact-btn").addEventListener("click", submitSuggestion);
  document.getElementById("clear-contact-btn").addEventListener("click", () => {
    document.getElementById("contact-message").value = "";
    document.getElementById("contact-nick").value = "";
    document.getElementById("contact-char-count").textContent = "0 / 500";
  });

  // Przycisk Losuj
  document.getElementById("random-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    // Nie zmieniaj aktywnego filter-btn — to nie jest zwykły filtr
    openRandomMode();
  });

  // Przycisk Udostępnij w modalu
  document.getElementById("modal-share-btn").addEventListener("click", () => {
    if (!_currentModalQuote) return;
    showShareBar(_currentModalQuote.id);
  });

  // Otwórz cytat z URL ?q=ID
  checkUrlQuote();

  // Auto-refresh co 30s
  setInterval(async () => {
    if (document.getElementById("view-feed").classList.contains("active")) {
      quotes = await fetchQuotes(); renderQuotes(); updateStats();
    }
  }, 30_000);
});

// ═══════════════════════════════════════════
//  🎲 TRYB LOSUJ
// ═══════════════════════════════════════════

let randomOverlay = null;
let randomQueue   = [];
let randomIdx     = 0;

function openRandomMode() {
  if (!quotes.length) { showToast("Brak cytatów do losowania!"); return; }

  // Przetasuj kopię tablicy (Fisher-Yates)
  randomQueue = [...quotes].sort(() => Math.random() - 0.5);
  randomIdx   = 0;

  randomOverlay = document.createElement("div");
  randomOverlay.className = "random-overlay";
  randomOverlay.id = "random-overlay";
  document.body.appendChild(randomOverlay);
  document.body.style.overflow = "hidden";

  renderRandomCard();

  document.addEventListener("keydown", onRandomKey);
}

function renderRandomCard() {
  const q      = randomQueue[randomIdx];
  const myLikes = getMyLikes();
  const liked   = myLikes.includes(q.id);

  const colorMap = {
    ink:"linear-gradient(135deg,#1a1a2e,#16213e)", wine:"linear-gradient(135deg,#4a0e0e,#2d0a0a)",
    forest:"linear-gradient(135deg,#0d2b1e,#081a12)", ocean:"linear-gradient(135deg,#0a1f3a,#060f1d)",
    dusk:"linear-gradient(135deg,#2a1a3e,#180e26)", cream:"linear-gradient(135deg,#f5f0e8,#ede7d7)",
    rose:"linear-gradient(135deg,#3d1525,#220b15)", ember:"linear-gradient(135deg,#3a1f0a,#1f0e00)",
    sage:"linear-gradient(135deg,#1e2a22,#101a14)", obsidian:"linear-gradient(135deg,#1f0c0c,#0e0608)",
    abyss:"linear-gradient(135deg,#091a1f,#040d10)", storm:"linear-gradient(135deg,#111820,#090e15)",
    void:"linear-gradient(135deg,#141418,#0c0c10)"
  };
  const isLight   = q.color === "cream";
  const cardStyle = `background:${colorMap[q.color]||colorMap.ink};color:${isLight?"#2a2018":"#e8e4d8"};`;

  randomOverlay.innerHTML = `
    <div class="random-card-wrap">
      <div class="random-card" style="${cardStyle}">
        <span class="random-quote-mark">&ldquo;</span>
        <p class="random-text">${escapeHTML(q.text)}</p>
        <div class="random-author">— ${escapeHTML(q.author)}</div>
        <span class="random-tag">${escapeHTML(q.tag)}</span>
      </div>
      <div class="random-counter">${randomIdx + 1} / ${randomQueue.length}</div>
    </div>
    <div class="random-controls">
      <button class="random-like-btn${liked?" liked":""}" id="r-like-btn">
        ${liked?"❤":"♡"} ${q.likes||0}
      </button>
      <button class="random-next-btn" id="r-next-btn">Następny →</button>
      <button class="random-close-btn" id="r-close-btn">✕ Zamknij</button>
    </div>`;

  document.getElementById("r-next-btn").addEventListener("click", nextRandomCard);
  document.getElementById("r-close-btn").addEventListener("click", closeRandomMode);
  document.getElementById("r-like-btn").addEventListener("click", () => {
    toggleLike(q.id);
    renderRandomCard(); // odśwież przycisk
  });
}

function nextRandomCard() {
  randomIdx = (randomIdx + 1) % randomQueue.length;
  // Jeśli wróciliśmy na początek — przetasuj od nowa
  if (randomIdx === 0) randomQueue = randomQueue.sort(() => Math.random() - 0.5);
  renderRandomCard();
}

function closeRandomMode() {
  if (randomOverlay) { randomOverlay.remove(); randomOverlay = null; }
  document.body.style.overflow = "";
  document.removeEventListener("keydown", onRandomKey);
}

function onRandomKey(e) {
  if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextRandomCard(); }
  if (e.key === "Escape") closeRandomMode();
}


// ═══════════════════════════════════════════
//  🔗 LINKI DO CYTATÓW
// ═══════════════════════════════════════════

function getShareUrl(id) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash   = "";
  url.searchParams.set("q", id);
  return url.toString();
}

function showShareBar(quoteId) {
  const row = document.getElementById("modal-share-row");
  const url = getShareUrl(quoteId);
  row.style.display = "block";
  row.innerHTML = `
    <div class="share-bar">
      <span class="share-url">${escapeHTML(url)}</span>
      <button class="share-copy-btn" id="share-copy-url">Kopiuj link</button>
    </div>`;
  document.getElementById("share-copy-url").addEventListener("click", () => {
    navigator.clipboard.writeText(url).then(
      () => showToast("✓ Link skopiowany!"),
      () => showToast("Błąd kopiowania.")
    );
  });
}

// Otwórz cytat z URL ?q=ID przy starcie
function checkUrlQuote() {
  const params = new URLSearchParams(window.location.search);
  const qId    = params.get("q");
  if (!qId) return;
  const q = quotes.find(x => x.id === qId);
  if (q) { openModal(q); }
}


// ═══════════════════════════════════════════
//  💬 KOMENTARZE
// ═══════════════════════════════════════════

function commentsUrl(quoteId, path="") {
  return `${FIREBASE_URL}/comments/${quoteId}${path}.json`;
}

async function loadComments(quoteId) {
  try {
    const res  = await fetch(commentsUrl(quoteId));
    const data = await res.json();
    return data ? Object.values(data).sort((a,b) => new Date(a.date) - new Date(b.date)) : [];
  } catch(e) { return []; }
}

async function renderCommentsSection(quoteId) {
  const section = document.getElementById("modal-comments-section");
  section.innerHTML = `<div class="comments-section">
    <div class="comments-title">Komentarze</div>
    <div class="comments-list" id="comments-list-${quoteId}">
      <div class="comments-empty">Ładowanie…</div>
    </div>
    <div class="comment-form">
      <input type="text" class="comment-input" id="c-nick-${quoteId}" placeholder="Nick (opcjonalnie)" maxlength="40" />
      <textarea class="comment-textarea" id="c-text-${quoteId}" placeholder="Napisz komentarz…" maxlength="300" rows="2"></textarea>
      <div class="comment-submit-row">
        <span class="comment-char" id="c-char-${quoteId}">0 / 300</span>
        <button class="comment-send-btn" id="c-send-${quoteId}">Wyślij</button>
      </div>
    </div>
  </div>`;

  document.getElementById(`c-text-${quoteId}`).addEventListener("input", e => {
    document.getElementById(`c-char-${quoteId}`).textContent = `${e.target.value.length} / 300`;
  });
  document.getElementById(`c-send-${quoteId}`).addEventListener("click", () => addComment(quoteId));

  // Załaduj komentarze
  const comments = await loadComments(quoteId);
  renderCommentsList(quoteId, comments);
}

function renderCommentsList(quoteId, comments) {
  const list = document.getElementById(`comments-list-${quoteId}`);
  if (!list) return;
  if (!comments.length) {
    list.innerHTML = `<div class="comments-empty">Brak komentarzy. Bądź pierwszy!</div>`;
    return;
  }
  list.innerHTML = comments.map(c => `
    <div class="comment-item">
      <div class="comment-nick">${escapeHTML(c.nick||"Anonim")}</div>
      <div class="comment-text">${escapeHTML(c.text)}</div>
      <div class="comment-date">${c.date||""}</div>
    </div>`).join("");
  // Przewiń do najnowszego
  list.scrollTop = list.scrollHeight;
}

async function addComment(quoteId) {
  const nick  = document.getElementById(`c-nick-${quoteId}`).value.trim();
  const text  = document.getElementById(`c-text-${quoteId}`).value.trim();
  if (!text) { showToast("Napisz coś przed wysłaniem!"); return; }

  const btn = document.getElementById(`c-send-${quoteId}`);
  btn.textContent = "Wysyłam…"; btn.disabled = true;

  const c = {
    id:   "c-" + Date.now(),
    nick: nick || "Anonim",
    text,
    date: new Date().toLocaleString("pl-PL", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })
  };

  try {
    const res = await fetch(commentsUrl(quoteId, `/${c.id}`), {
      method:  "PUT",
      headers: {"Content-Type":"application/json"},
      body:    JSON.stringify(c)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    document.getElementById(`c-text-${quoteId}`).value = "";
    document.getElementById(`c-char-${quoteId}`).textContent = "0 / 300";
    const updated = await loadComments(quoteId);
    renderCommentsList(quoteId, updated);
    showToast("✓ Komentarz dodany!");
  } catch(e) {
    showToast("Błąd: " + e.message);
  }
  btn.textContent = "Wyślij"; btn.disabled = false;
}
