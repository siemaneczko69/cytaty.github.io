/**
 * app.js — Głosy Świata
 * Backend: Firebase Realtime Database
 *
 * KONFIGURACJA (5 minut):
 *  1. Wejdź na https://console.firebase.google.com
 *  2. "Add project" → nazwa np. "glosy-swiata" → Continue
 *  3. Build → Realtime Database → Create Database → Start in TEST MODE → Enable
 *  4. Skopiuj URL bazy (np. https://glosy-swiata-default-rtdb.firebaseio.com)
 *  5. Wklej poniżej w FIREBASE_URL
 */

const FIREBASE_URL = "https://glosy-swiata-default-rtdb.europe-west1.firebasedatabase.app/"; // np. "https://glosy-swiata-default-rtdb.firebaseio.com"

// ─── Seed quotes ───
const SEED_QUOTES = [
  { id:"seed-1", text:"Nie ma nic piękniejszego niż człowiek, który nie boi się być sobą.", author:"Anna M.", tag:"filozofia", color:"dusk",   likes:14, date:"2024-01-10" },
  { id:"seed-2", text:"Każdy poranek to drugi egzemplarz tej samej książki — czytamy go zupełnie inaczej.", author:"Tomasz W.", tag:"filozofia", color:"ocean",  likes:9,  date:"2024-02-03" },
  { id:"seed-3", text:"Śmiech to najkrótszy dystans między dwojgiem ludzi.", author:"Viktor Borge", tag:"humor", color:"wine",   likes:22, date:"2024-01-28" },
  { id:"seed-4", text:"Podróż tysiąca mil zaczyna się od jednego kroku.", author:"Laozi", tag:"motywacja", color:"forest", likes:31, date:"2024-03-01" },
  { id:"seed-5", text:"Kochać to znaleźć własne szczęście w szczęściu drugiej osoby.", author:"Gottfried Leibniz", tag:"miłość", color:"cream",  likes:18, date:"2024-02-14" },
  { id:"seed-6", text:"Wiedza mówi — mądrość słucha.", author:"Jimi Hendrix", tag:"mądrość", color:"ink",    likes:27, date:"2024-03-12" }
];

let quotes = [], currentFilter="all", currentSearch="", selectedTag="ogólne", selectedColor="ink";

// ─── Firebase REST API ───

function dbUrl(path="") {
  return `${FIREBASE_URL}/quotes${path}.json`;
}

async function fetchQuotes() {
  if (FIREBASE_URL === "WKLEJ_TUTAJ_URL_FIREBASE") {
    showConfigWarning();
    return [...SEED_QUOTES];
  }
  try {
    const res = await fetch(dbUrl());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data) {
      // Pusta baza — zapisz seed
      await seedDatabase();
      return [...SEED_QUOTES];
    }
    // Firebase zwraca obiekt { id: {quote} } — konwertuj na tablicę
    const arr = Object.values(data);
    arr.sort((a,b) => new Date(b.date) - new Date(a.date));
    return arr;
  } catch(e) {
    console.error("fetchQuotes:", e);
    showToast("Błąd połączenia: " + e.message);
    return [...SEED_QUOTES];
  }
}

async function seedDatabase() {
  for (const q of SEED_QUOTES) {
    await fetch(dbUrl(`/${q.id}`), {
      method:"PUT",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(q)
    });
  }
}

async function putQuote(q) {
  try {
    const res = await fetch(dbUrl(`/${q.id}`), {
      method: "PUT",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(q)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch(e) {
    console.error("putQuote:", e);
    showToast("Błąd zapisu: " + e.message);
  }
}

async function removeQuote(id) {
  try {
    await fetch(dbUrl(`/${id}`), { method:"DELETE" });
  } catch(e) {
    console.error("removeQuote:", e);
    showToast("Błąd usuwania: " + e.message);
  }
}

// ─── Config warning ───
function showConfigWarning() {
  document.getElementById("quotes-grid").innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#c9a84c;
      font-family:'DM Mono',monospace;font-size:0.82rem;line-height:2.4;max-width:560px;margin:0 auto;">
      <div style="font-size:2rem;margin-bottom:12px;">🔥</div>
      <strong style="font-size:1rem;color:#e8e4d8;">Skonfiguruj Firebase</strong><br><br>
      1. Wejdź na <a href="https://console.firebase.google.com" target="_blank"
        style="color:#c9a84c;text-decoration:underline">console.firebase.google.com</a><br>
      2. <strong>Add project</strong> → dowolna nazwa → Continue<br>
      3. <strong>Build → Realtime Database → Create Database</strong><br>
      4. Wybierz <strong>Start in TEST MODE</strong> → Enable<br>
      5. Skopiuj URL bazy i wklej w <strong>app.js</strong> w zmienną <strong>FIREBASE_URL</strong><br><br>
      <span style="color:rgba(201,168,76,0.5);font-size:0.72rem;">
        Przykład: https://moja-baza-default-rtdb.firebaseio.com
      </span>
    </div>`;
}

// ─── Render ───

function renderQuotes() {
  const grid=document.getElementById("quotes-grid"), empty=document.getElementById("empty-state");
  let filtered=[...quotes];
  if (currentFilter==="moje")      filtered=filtered.filter(q=>q.mine);
  if (currentFilter==="popularne") filtered=[...filtered].sort((a,b)=>b.likes-a.likes);
  if (currentSearch.trim()) {
    const s=currentSearch.toLowerCase();
    filtered=filtered.filter(q=>
      q.text.toLowerCase().includes(s)||
      q.author.toLowerCase().includes(s)||
      q.tag.toLowerCase().includes(s)
    );
  }
  grid.innerHTML="";
  if (!filtered.length) { empty.classList.remove("hidden"); return; }
  empty.classList.add("hidden");
  filtered.forEach((q,i)=>grid.appendChild(buildCard(q,i)));
}

function buildCard(q,delay) {
  const card=document.createElement("div");
  card.className="quote-card"; card.dataset.color=q.color||"ink"; card.dataset.id=q.id;
  card.style.animationDelay=`${delay*0.05}s`;
  card.innerHTML=`
    <span class="quote-meta">${q.date?formatDate(q.date):""}</span>
    <span class="quote-mark">&ldquo;</span>
    <p class="quote-body">${escapeHTML(q.text)}</p>
    <div class="quote-author-line">— ${escapeHTML(q.author)}</div>
    <div class="card-footer">
      <span class="quote-tag">${escapeHTML(q.tag)}</span>
      <div class="card-actions">
        <button class="action-btn like-btn ${q.likedByMe?"liked":""}" data-id="${q.id}">
          ${q.likedByMe?"❤":"♡"} <span>${q.likes}</span>
        </button>
        ${q.mine?`<button class="action-btn delete-btn" data-id="${q.id}" title="Usuń">✕</button>`:""}
      </div>
    </div>`;
  card.addEventListener("click",e=>{if(!e.target.closest(".action-btn"))openModal(q);});
  card.querySelector(".like-btn").addEventListener("click",e=>{e.stopPropagation();toggleLike(q.id);});
  const del=card.querySelector(".delete-btn");
  if(del) del.addEventListener("click",e=>{e.stopPropagation();deleteQuote(q.id);});
  return card;
}

// ─── Actions ───

async function toggleLike(id) {
  const q=quotes.find(x=>x.id===id); if(!q) return;
  q.likedByMe=!q.likedByMe;
  q.likes=Math.max(0,q.likes+(q.likedByMe?1:-1));
  renderQuotes();
  await putQuote(q);
}

async function deleteQuote(id) {
  quotes=quotes.filter(q=>q.id!==id);
  renderQuotes();
  showToast("Cytat usunięty.");
  await removeQuote(id);
}

async function addQuote() {
  const text=document.getElementById("quote-text").value.trim();
  const author=document.getElementById("quote-author").value.trim();
  if(!text)  {showToast("Wpisz treść cytatu!"); return;}
  if(!author){showToast("Wpisz imię lub pseudonim!"); return;}
  const btn=document.getElementById("submit-quote-btn");
  btn.disabled=true; btn.textContent="Zapisuję…";
  const q={
    id:"q-"+Date.now(), text, author, tag:selectedTag, color:selectedColor,
    likes:0, likedByMe:false, date:new Date().toISOString().slice(0,10), mine:true
  };
  quotes.unshift(q);
  renderQuotes();
  await putQuote(q);
  btn.disabled=false; btn.textContent="Opublikuj cytat";
  document.getElementById("quote-text").value="";
  document.getElementById("quote-author").value="";
  document.getElementById("char-count").textContent="0 / 280";
  updatePreview();
  showToast("✓ Cytat opublikowany i widoczny dla wszystkich!");
  switchView("feed");
}

// ─── Preview ───

function updatePreview() {
  const text=document.getElementById("quote-text").value.trim();
  const author=document.getElementById("quote-author").value.trim();
  const count=document.getElementById("quote-text").value.length;
  document.getElementById("char-count").textContent=`${count} / 280`;
  document.getElementById("preview-text").textContent=text||"Twój cytat pojawi się tutaj…";
  document.getElementById("preview-author").textContent=author||"Autor";
  document.getElementById("preview-tag").textContent=selectedTag;
  document.getElementById("preview-card").dataset.color=selectedColor;
}

// ─── Modal ───

function openModal(q) {
  document.getElementById("modal-text").textContent=q.text;
  document.getElementById("modal-author").textContent="— "+q.author;
  document.getElementById("modal-tag").textContent=q.tag;
  document.getElementById("modal-date").textContent=q.date?"Dodano: "+formatDate(q.date):"";
  document.getElementById("modal-overlay").classList.remove("hidden");
  document.body.style.overflow="hidden";
}
function closeModal(){
  document.getElementById("modal-overlay").classList.add("hidden");
  document.body.style.overflow="";
}

// ─── View ───

function switchView(name) {
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  document.getElementById("view-"+name).classList.add("active");
  document.querySelector(`[data-view="${name}"]`).classList.add("active");
}

// ─── Export ───

function exportJSON(){download("cytaty.json",JSON.stringify(quotes,null,2),"application/json");}
function exportCSV(){
  const h="id,text,author,tag,color,likes,date\n";
  const r=quotes.map(q=>[q.id,`"${q.text.replace(/"/g,'""')}"`,`"${q.author}"`,q.tag,q.color,q.likes,q.date].join(",")).join("\n");
  download("cytaty.csv",h+r,"text/csv");
}
function exportXML(){
  const items=quotes.map(q=>`\n  <cytat id="${q.id}"><tekst>${escapeXML(q.text)}</tekst><autor>${escapeXML(q.author)}</autor><kategoria>${q.tag}</kategoria><polubienia>${q.likes}</polubienia><data>${q.date}</data></cytat>`).join("");
  download("cytaty.xml",`<?xml version="1.0" encoding="UTF-8"?>\n<cytaty>${items}\n</cytaty>`,"application/xml");
}
function exportTXT(){
  download("cytaty.txt",quotes.map(q=>`"${q.text}"\n  — ${q.author} [${q.tag}] | ♡ ${q.likes} | ${q.date}`).join("\n\n---\n\n"),"text/plain");
}
function download(filename,content,mime){
  const a=Object.assign(document.createElement("a"),{
    href:URL.createObjectURL(new Blob([content],{type:mime})),download:filename
  });
  a.click(); URL.revokeObjectURL(a.href);
}

// ─── Loader / Toast ───

function showLoader(msg="Ładowanie cytatów…") {
  let el=document.getElementById("app-loader");
  if(!el){
    el=document.createElement("div"); el.id="app-loader";
    el.style.cssText="position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:rgba(14,14,20,0.88);backdrop-filter:blur(8px);";
    el.innerHTML=`<div style="text-align:center;color:#c9a84c;font-family:'DM Mono',monospace;font-size:0.85rem;">
      <div style="width:40px;height:40px;border:3px solid rgba(201,168,76,0.2);border-top-color:#c9a84c;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>${msg}</div>`;
    if(!document.querySelector("#spin-style")){
      const s=document.createElement("style");s.id="spin-style";
      s.textContent="@keyframes spin{to{transform:rotate(360deg)}}";
      document.head.appendChild(s);
    }
    document.body.appendChild(el);
  }
}
function hideLoader(){const el=document.getElementById("app-loader");if(el)el.remove();}
function showToast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg; t.classList.add("show");
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),2800);
}

// ─── Helpers ───

function escapeHTML(str){return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function escapeXML(str){return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");}
function formatDate(d){try{return new Date(d).toLocaleDateString("pl-PL",{day:"numeric",month:"short",year:"numeric"});}catch{return d;}}

// ─── Init ───

document.addEventListener("DOMContentLoaded", async () => {
  showLoader();
  quotes=await fetchQuotes();
  hideLoader();
  renderQuotes();

  document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>{
    switchView(btn.dataset.view);
    if(btn.dataset.view==="feed"){
      showLoader("Odświeżam…");
      fetchQuotes().then(q=>{quotes=q;hideLoader();renderQuotes();});
    }
  }));

  document.getElementById("search-input").addEventListener("input",e=>{currentSearch=e.target.value;renderQuotes();});
  document.querySelectorAll(".filter-btn").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll(".filter-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active"); currentFilter=btn.dataset.filter; renderQuotes();
  }));
  document.querySelectorAll(".tag-option").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll(".tag-option").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active"); selectedTag=btn.dataset.tag; updatePreview();
  }));
  document.querySelectorAll(".color-swatch").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll(".color-swatch").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active"); selectedColor=btn.dataset.color; updatePreview();
  }));
  document.getElementById("quote-text").addEventListener("input",updatePreview);
  document.getElementById("quote-author").addEventListener("input",updatePreview);
  document.getElementById("submit-quote-btn").addEventListener("click",addQuote);
  document.getElementById("clear-form-btn").addEventListener("click",()=>{
    document.getElementById("quote-text").value="";
    document.getElementById("quote-author").value="";
    updatePreview();
  });
  document.getElementById("go-add-btn").addEventListener("click",()=>switchView("add"));
  document.getElementById("modal-close").addEventListener("click",closeModal);
  document.getElementById("modal-overlay").addEventListener("click",e=>{if(e.target===e.currentTarget)closeModal();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
  document.getElementById("export-json").addEventListener("click",exportJSON);
  document.getElementById("export-csv").addEventListener("click",exportCSV);
  document.getElementById("export-xml").addEventListener("click",exportXML);
  document.getElementById("export-txt").addEventListener("click",exportTXT);

  // Auto-refresh co 30s
  setInterval(async()=>{
    if(document.getElementById("view-feed").classList.contains("active")){
      quotes=await fetchQuotes(); renderQuotes();
    }
  },30_000);
});
