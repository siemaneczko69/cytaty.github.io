/**
 * mobile.js — Głosy Świata (wersja mobilna)
 * Wspólna baza Firebase z app.js, osobna warstwa widoku.
 */

const FIREBASE_URL = "https://glosy-swiata-default-rtdb.europe-west1.firebasedatabase.app/";

// ─── Config ───
let CONFIG = { colors: {}, tags: [] };

const DEFAULT_COLORS = {
  ink:      { label:"ink",      bg1:"#1a1a2e", bg2:"#16213e", text:"#e8e4d8", adminOnly:false, order:0 },
  wine:     { label:"wine",     bg1:"#4a0e0e", bg2:"#2d0a0a", text:"#e8e4d8", adminOnly:false, order:1 },
  forest:   { label:"forest",   bg1:"#0d2b1e", bg2:"#081a12", text:"#e8e4d8", adminOnly:false, order:2 },
  ocean:    { label:"ocean",    bg1:"#0a1f3a", bg2:"#060f1d", text:"#e8e4d8", adminOnly:false, order:3 },
  dusk:     { label:"dusk",     bg1:"#2a1a3e", bg2:"#180e26", text:"#e8e4d8", adminOnly:false, order:4 },
  cream:    { label:"cream",    bg1:"#f5f0e8", bg2:"#ede7d7", text:"#2a2018", adminOnly:false, order:5 },
  petal:    { label:"petal",    bg1:"#f7e0ee", bg2:"#eed5e5", text:"#3a1f2e", adminOnly:true,  order:6 },
  rose:     { label:"rose",     bg1:"#3d1525", bg2:"#220b15", text:"#e8e4d8", adminOnly:false, order:7 },
  ember:    { label:"ember",    bg1:"#3a1f0a", bg2:"#1f0e00", text:"#e8e4d8", adminOnly:false, order:8 },
  sage:     { label:"sage",     bg1:"#1e2a22", bg2:"#101a14", text:"#e8e4d8", adminOnly:false, order:9 },
  obsidian: { label:"obsidian", bg1:"#1f0c0c", bg2:"#0e0608", text:"#e8e4d8", adminOnly:false, order:10 },
  abyss:    { label:"abyss",    bg1:"#091a1f", bg2:"#040d10", text:"#e8e4d8", adminOnly:false, order:11 },
  storm:    { label:"storm",    bg1:"#111820", bg2:"#090e15", text:"#e8e4d8", adminOnly:false, order:12 },
  void:     { label:"void",     bg1:"#141418", bg2:"#0c0c10", text:"#e8e4d8", adminOnly:false, order:13 },
};
const DEFAULT_TAGS = [
  { id:"ogólne", label:"ogólne", order:0 }, { id:"motywacja", label:"motywacja", order:1 },
  { id:"miłość",  label:"miłość",  order:2 }, { id:"mądrość",   label:"mądrość",   order:3 },
  { id:"humor",   label:"humor",   order:4 }, { id:"filozofia", label:"filozofia", order:5 },
];

// ─── Firebase helpers ───
const quotesUrl      = (p="")  => `${FIREBASE_URL}/quotes${p}.json`;
const allLikesUrl    = ()      => `${FIREBASE_URL}/likes.json`;
const reactionsUrl   = (id,p="") => `${FIREBASE_URL}/reactions/${id}${p}.json`;
const allReactionsUrl= ()      => `${FIREBASE_URL}/reactions.json`;
const allCommentsUrl = ()      => `${FIREBASE_URL}/comments.json`;
const commentsUrl    = (qid,p="") => `${FIREBASE_URL}/comments/${qid}${p}.json`;
const suggestionsUrl = (p="")  => `${FIREBASE_URL}/sugestie${p}.json`;
const configUrl      = (p="")  => `${FIREBASE_URL}/config${p}.json`;

// ─── State ───
let quotes = [], currentFilter = "all", currentSearch = "", currentCategory = "";
let selectedTag = "ogólne", selectedColor = "ink";
let selectedSuggestionType = "pomysł";
let _currentSheetQuote = null;

// ─── Config ───
async function fetchConfig() {
  try {
    const res = await fetch(configUrl()); const data = await res.json();
    CONFIG.colors = (data && data.colors && Object.keys(data.colors).length) ? data.colors : DEFAULT_COLORS;
    CONFIG.tags   = (data && data.tags   && data.tags.length)
      ? data.tags.slice().sort((a,b)=>(a.order||0)-(b.order||0)) : DEFAULT_TAGS;
  } catch(e) { CONFIG.colors = DEFAULT_COLORS; CONFIG.tags = DEFAULT_TAGS; }
  injectColorCSS();
}

function injectColorCSS() {
  let css = "";
  for (const [key, c] of Object.entries(CONFIG.colors)) {
    const bg  = `linear-gradient(135deg,${c.bg1},${c.bg2})`;
    const txt = c.text || "#e8e4d8";
    const dim = isLightColor(c) ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";
    const markCol = isLightColor(c) ? adjustColor(c.bg1, -60) : "#c9a84c";
    css += `
.quote-card[data-color="${key}"] { background:${bg}; color:${txt}; }
.quote-card[data-color="${key}"] .quote-meta,
.quote-card[data-color="${key}"] .quote-author-line { color:${dim}; }
.quote-card[data-color="${key}"] .quote-tag { color:${dim}; border-color:${dim}; }
.quote-card[data-color="${key}"] .action-btn { color:${dim}; }
.quote-card[data-color="${key}"] .action-btn:active { color:${txt}; background:rgba(128,128,128,0.1); }
.quote-card[data-color="${key}"] .action-btn.reacted { color:${markCol}; background:rgba(128,128,128,0.1); }
.quote-card[data-color="${key}"] .quote-mark { color:${markCol}; }
.preview-card[data-color="${key}"] { background:${bg}; color:${txt}; }
`;
  }
  let el = document.getElementById("dynamic-color-css");
  if (!el) { el = document.createElement("style"); el.id="dynamic-color-css"; document.head.appendChild(el); }
  el.textContent = css;
}

function isLightColor(c) {
  const hex = (c.bg1||"#1a1a2e").replace("#","");
  const r=parseInt(hex.substr(0,2),16), g=parseInt(hex.substr(2,2),16), b=parseInt(hex.substr(4,2),16);
  return (r*0.299 + g*0.587 + b*0.114) > 128;
}
function adjustColor(hex, amount) {
  const h=hex.replace("#","");
  const r=Math.max(0,Math.min(255,parseInt(h.substr(0,2),16)+amount));
  const g=Math.max(0,Math.min(255,parseInt(h.substr(2,2),16)+amount));
  const b=Math.max(0,Math.min(255,parseInt(h.substr(4,2),16)+amount));
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}
function getColorGradient(key) {
  const c = CONFIG.colors[key]; if (!c) return "linear-gradient(135deg,#1a1a2e,#16213e)";
  return `linear-gradient(135deg,${c.bg1},${c.bg2})`;
}
function getColorText(key) { return (CONFIG.colors[key]||{}).text || "#e8e4d8"; }

// ─── Dynamic UI ───
function buildCategoryStrip() {
  const strip = document.getElementById("category-strip"); if (!strip) return;
  strip.innerHTML = `<button class="chip cat active" data-cat="">Wszystkie</button>`;
  CONFIG.tags.forEach(t => {
    const btn = document.createElement("button");
    btn.className = "chip cat"; btn.dataset.cat = t.id; btn.textContent = t.label;
    btn.addEventListener("click", () => {
      strip.querySelectorAll(".chip.cat").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active"); currentCategory = t.id; renderQuotes();
    });
    strip.appendChild(btn);
  });
  strip.querySelector("[data-cat='']").addEventListener("click", () => {
    strip.querySelectorAll(".chip.cat").forEach(b=>b.classList.remove("active"));
    strip.querySelector("[data-cat='']").classList.add("active"); currentCategory=""; renderQuotes();
  });
}
function buildTagSelector() {
  const sel = document.getElementById("tag-selector"); if (!sel) return;
  sel.innerHTML = "";
  CONFIG.tags.forEach((t,i) => {
    const btn = document.createElement("button");
    btn.className = "tag-option" + (i===0?" active":""); btn.dataset.tag = t.id; btn.textContent = t.label;
    btn.addEventListener("click", () => {
      sel.querySelectorAll(".tag-option").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active"); selectedTag=t.id; updatePreview();
    });
    sel.appendChild(btn);
  });
  if (CONFIG.tags.length) selectedTag = CONFIG.tags[0].id;
}
function buildColorPicker() {
  const picker = document.getElementById("color-picker"); if (!picker) return;
  picker.innerHTML = "";
  const publicColors = Object.entries(CONFIG.colors)
    .filter(([,c])=>!c.adminOnly).sort(([,a],[,b])=>(a.order||0)-(b.order||0));
  publicColors.forEach(([key,c],i) => {
    const btn = document.createElement("button");
    btn.className = "color-swatch"+(i===0?" active":"");
    if (isLightColor(c)) btn.classList.add("light");
    btn.dataset.color=key; btn.style.background=c.bg1; btn.title=c.label;
    btn.addEventListener("click", () => {
      picker.querySelectorAll(".color-swatch").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active"); selectedColor=key; updatePreview();
    });
    picker.appendChild(btn);
  });
  if (publicColors.length) selectedColor = publicColors[0][0];
}

// ─── Fetch ───
async function fetchQuotes() {
  try {
    const [qRes,lRes,rRes,cRes] = await Promise.all([
      fetch(quotesUrl()), fetch(allLikesUrl()), fetch(allReactionsUrl()), fetch(allCommentsUrl())
    ]);
    if (!qRes.ok) throw new Error(`HTTP ${qRes.status}`);
    const qData=await qRes.json(), lData=lRes.ok?await lRes.json():{};
    const rData=rRes.ok?await rRes.json():{}, cData=cRes.ok?await cRes.json():{};
    const lMap=lData||{}, rMap=rData||{}, myLikes=getMyLikes(), myReactions=getMyReactions();
    const commentCounts={};
    if(cData) for(const [qid,obj] of Object.entries(cData)) commentCounts[qid]=obj?Object.keys(obj).length:0;
    if(!qData) return [];
    const arr=Object.values(qData).map(q=>({
      ...q, likes:lMap[q.id]||0, likedByMe:myLikes.includes(q.id),
      reactions:rMap[q.id]||{heart:0,haha:0,wow:0}, myReaction:myReactions[q.id]||null,
      commentCount:commentCounts[q.id]||0,
    }));
    arr.sort((a,b)=>new Date(b.date)-new Date(a.date));
    return arr;
  } catch(e) { showToast("Błąd połączenia: "+e.message); return []; }
}

// ─── LocalStorage ───
function getMyLikes()     { try{return JSON.parse(localStorage.getItem("glosy_my_likes")||"[]");}catch{return[];} }
function saveMyLikes(arr) { localStorage.setItem("glosy_my_likes",JSON.stringify(arr)); }
function getMyReactions() { try{return JSON.parse(localStorage.getItem("glosy_my_reactions")||"{}");}catch{return{};} }
function saveMyReactions(obj){ localStorage.setItem("glosy_my_reactions",JSON.stringify(obj)); }

// ─── Render ───
function renderQuotes() {
  const feed = document.getElementById("quotes-feed");
  const empty= document.getElementById("empty-state");
  const totalR = q => { const r=q.reactions||{}; return (r.heart||0)+(r.haha||0)+(r.wow||0); };
  let filtered = [...quotes].sort((a,b)=>new Date(b.date)-new Date(a.date));
  if (currentFilter==="popularne")  filtered = [...filtered].sort((a,b)=>totalR(b)-totalR(a));
  if (currentFilter==="wyróżnione") filtered = filtered.filter(q=>q.featured);
  if (currentCategory) filtered = filtered.filter(q=>q.tag===currentCategory);
  if (currentSearch.trim()) {
    const s=currentSearch.toLowerCase();
    filtered=filtered.filter(q=>q.text.toLowerCase().includes(s)||(q.author||"").toLowerCase().includes(s)||q.tag.toLowerCase().includes(s));
  }
  feed.innerHTML="";
  if (!filtered.length) { empty.classList.remove("hidden"); return; }
  empty.classList.add("hidden");
  filtered.forEach((q,i) => feed.appendChild(buildCard(q,i)));
}

function buildCard(q, delay) {
  const card = document.createElement("div");
  card.className="quote-card"; card.dataset.color=q.color||"ink"; card.dataset.id=q.id;
  card.style.animationDelay=`${delay*0.04}s`;
  const tagLabel=(CONFIG.tags.find(t=>t.id===q.tag)||{}).label||q.tag;
  const featBadge=q.featured?`<span class="quote-featured-badge">⭐ Wyróżnione</span>`:"";
  const r=q.reactions||{heart:0,haha:0,wow:0}, mr=q.myReaction;
  card.innerHTML=`
    <span class="quote-meta">${q.date?formatDate(q.date):""}</span>
    <span class="quote-mark">&ldquo;</span>
    <p class="quote-body">${escapeHTML(q.text)}</p>
    <div class="quote-author-line">— ${escapeHTML(q.author)}</div>
    <div class="card-footer">
      <div class="card-tags">
        <span class="quote-tag">${escapeHTML(tagLabel)}</span>${featBadge}
      </div>
      <div class="card-actions">
        <button class="action-btn reaction-btn${mr==="heart"?" reacted":""}" data-id="${q.id}" data-r="heart" title="Lubię">❤ <span>${r.heart||0}</span></button>
        <button class="action-btn reaction-btn${mr==="haha"?" reacted":""}" data-id="${q.id}" data-r="haha" title="Śmieszne">😂 <span>${r.haha||0}</span></button>
        <button class="action-btn reaction-btn${mr==="wow"?" reacted":""}" data-id="${q.id}" data-r="wow" title="Mocne">🤔 <span>${r.wow||0}</span></button>
        <button class="action-btn comment-count-btn" data-id="${q.id}" title="Komentarze">💬 <span>${q.commentCount||0}</span></button>
      </div>
    </div>`;
  card.addEventListener("click", e => { if(!e.target.closest(".action-btn")) openSheet(q); });
  card.querySelectorAll(".reaction-btn").forEach(btn=>{
    btn.addEventListener("click", e=>{e.stopPropagation(); toggleReaction(q.id,btn.dataset.r);});
  });
  card.querySelector(".comment-count-btn").addEventListener("click", e=>{e.stopPropagation(); openSheet(q);});
  return card;
}

function updateStats() {
  const el=document.getElementById("feed-stats"); if(!el) return;
  const total=quotes.length;
  const reactions=quotes.reduce((s,q)=>{const r=q.reactions||{};return s+(r.heart||0)+(r.haha||0)+(r.wow||0);},0);
  if(!total){el.textContent="";return;}
  const qW=total===1?"cytat":total<5?"cytaty":"cytatów";
  const rW=reactions===1?"reakcja":reactions<5?"reakcje":"reakcji";
  el.textContent=`${total} ${qW} · ${reactions} ${rW}`;
}

// ─── Reactions ───
async function toggleReaction(id, type) {
  const q=quotes.find(x=>x.id===id); if(!q) return;
  const myR=getMyReactions(), current=myR[id];
  if(!q.reactions) q.reactions={heart:0,haha:0,wow:0};
  if(current===type){
    q.reactions[type]=Math.max(0,(q.reactions[type]||0)-1); q.myReaction=null; delete myR[id];
  } else {
    if(current) q.reactions[current]=Math.max(0,(q.reactions[current]||0)-1);
    q.reactions[type]=(q.reactions[type]||0)+1; q.myReaction=type; myR[id]=type;
  }
  saveMyReactions(myR); renderQuotes(); updateStats();
  // Refresh sheet if open for this quote
  if(_currentSheetQuote&&_currentSheetQuote.id===id) refreshSheetReactions(q);
  try { await fetch(reactionsUrl(id),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(q.reactions)}); }
  catch(e){ showToast("Błąd zapisu reakcji."); }
}

// ─── Add quote ───
async function addQuote() {
  const text=document.getElementById("quote-text").value.trim();
  const author=document.getElementById("quote-author").value.trim();
  if(!text){showToast("Wpisz treść cytatu!");return;}
  if(!author){showToast("Wpisz imię lub nick!");return;}
  const btn=document.getElementById("submit-quote-btn"); btn.disabled=true; btn.textContent="Zapisuję…";
  const q={id:"q-"+Date.now(),text,author,tag:selectedTag,color:selectedColor,date:new Date().toISOString().slice(0,10)};
  try {
    const res=await fetch(quotesUrl(`/${q.id}`),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(q)});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    quotes.unshift({...q,likes:0,likedByMe:false,reactions:{heart:0,haha:0,wow:0},myReaction:null,commentCount:0});
    document.getElementById("quote-text").value=""; document.getElementById("quote-author").value="";
    document.getElementById("char-count").textContent="0 / 280";
    updatePreview(); showToast("✓ Cytat opublikowany!"); switchView("feed"); renderQuotes();
  } catch(e) { showToast("Błąd: "+e.message); }
  btn.disabled=false; btn.textContent="Opublikuj cytat";
}

// ─── Preview ───
function updatePreview() {
  const text=document.getElementById("quote-text").value.trim();
  const author=document.getElementById("quote-author").value.trim();
  document.getElementById("char-count").textContent=`${document.getElementById("quote-text").value.length} / 280`;
  document.getElementById("preview-text").textContent=text||"Twój cytat pojawi się tutaj…";
  document.getElementById("preview-author").textContent=author||"Autor";
  const tagLabel=(CONFIG.tags.find(t=>t.id===selectedTag)||{}).label||selectedTag;
  document.getElementById("preview-tag").textContent=tagLabel;
  document.getElementById("preview-card").dataset.color=selectedColor;
}

// ─── Sugestie ───
async function submitSuggestion() {
  const message=document.getElementById("contact-message").value.trim();
  const nick=document.getElementById("contact-nick").value.trim();
  if(!message){showToast("Wpisz treść wiadomości!");return;}
  const btn=document.getElementById("submit-contact-btn"); btn.disabled=true; btn.textContent="Wysyłam…";
  const s={id:"s-"+Date.now(),nick:nick||"Anonim",type:selectedSuggestionType,message,date:new Date().toISOString().slice(0,10),read:false};
  try {
    const res=await fetch(suggestionsUrl(`/${s.id}`),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    document.getElementById("contact-message").value=""; document.getElementById("contact-nick").value="";
    document.getElementById("contact-char-count").textContent="0 / 500";
    showToast("✓ Sugestia wysłana!"); switchView("feed");
  } catch(e){ showToast("Błąd: "+e.message); }
  btn.disabled=false; btn.textContent="Wyślij";
}

// ─── View ───
function switchView(name) {
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(b=>b.classList.remove("active"));
  document.getElementById("view-"+name).classList.add("active");
  document.querySelector(`.nav-tab[data-view="${name}"]`).classList.add("active");
  document.getElementById("main-scroll").scrollTo({top:0,behavior:"smooth"});
}

// ─── BOTTOM SHEET ───
function openSheet(q) {
  _currentSheetQuote = q;
  const tagLabel=(CONFIG.tags.find(t=>t.id===q.tag)||{}).label||q.tag;
  document.getElementById("sheet-text").textContent = q.text;
  document.getElementById("sheet-author").textContent = "— "+q.author;
  document.getElementById("sheet-tag").textContent = tagLabel;
  document.getElementById("sheet-date").textContent = q.date?"Dodano: "+formatDate(q.date):"";

  // Reset share bar
  document.getElementById("sheet-share-bar").classList.remove("open");

  // Reactions
  refreshSheetReactions(q);

  // Render for image export
  const card=document.getElementById("quote-render-card");
  card.style.background=getColorGradient(q.color); card.style.color=getColorText(q.color);
  document.getElementById("render-text").textContent=q.text;
  document.getElementById("render-author").textContent="— "+q.author;
  document.getElementById("render-tag").textContent=tagLabel;

  document.getElementById("sheet-overlay").classList.add("open");
  document.getElementById("bottom-sheet").classList.add("open");
  document.body.style.overflow="hidden";

  renderSheetComments(q.id);

  // URL
  const url=new URL(window.location.href);
  url.searchParams.set("q",q.id);
  history.replaceState(null,"",url.toString());
}

function closeSheet() {
  document.getElementById("sheet-overlay").classList.remove("open");
  document.getElementById("bottom-sheet").classList.remove("open");
  document.body.style.overflow="";
  const url=new URL(window.location.href); url.searchParams.delete("q");
  history.replaceState(null,"",url.toString());
  _currentSheetQuote=null;
}

function refreshSheetReactions(q) {
  const r=q.reactions||{heart:0,haha:0,wow:0}, mr=q.myReaction;
  document.getElementById("sheet-reactions").innerHTML=`
    <button class="sheet-reaction-btn${mr==="heart"?" reacted":""}" data-r="heart">❤ ${r.heart||0}</button>
    <button class="sheet-reaction-btn${mr==="haha"?" reacted":""}" data-r="haha">😂 ${r.haha||0}</button>
    <button class="sheet-reaction-btn${mr==="wow"?" reacted":""}" data-r="wow">🤔 ${r.wow||0}</button>`;
  document.querySelectorAll(".sheet-reaction-btn").forEach(btn=>{
    btn.addEventListener("click",()=>toggleReaction(q.id,btn.dataset.r));
  });
}

// ─── Comments in sheet ───
async function renderSheetComments(quoteId) {
  const section=document.getElementById("sheet-comments-section");
  section.innerHTML=`<div class="sheet-comments">
    <div class="sheet-comments-title">Komentarze</div>
    <div class="sheet-comments-list" id="sc-list-${quoteId}"><div class="comments-empty">Ładowanie…</div></div>
    <div class="comment-form">
      <input type="text" class="comment-input" id="sc-nick-${quoteId}" placeholder="Nick (opcjonalnie)" maxlength="40" />
      <textarea class="comment-textarea" id="sc-text-${quoteId}" placeholder="Napisz komentarz…" maxlength="300" rows="2"></textarea>
      <div class="comment-submit-row">
        <span class="comment-char" id="sc-char-${quoteId}">0 / 300</span>
        <button class="comment-send-btn" id="sc-send-${quoteId}">Wyślij</button>
      </div>
    </div>
  </div>`;
  document.getElementById(`sc-text-${quoteId}`).addEventListener("input",e=>{
    document.getElementById(`sc-char-${quoteId}`).textContent=`${e.target.value.length} / 300`;
  });
  document.getElementById(`sc-send-${quoteId}`).addEventListener("click",()=>addSheetComment(quoteId));
  renderSheetCommentsList(quoteId, await loadComments(quoteId));
}

async function loadComments(quoteId) {
  try {
    const res=await fetch(commentsUrl(quoteId)), data=await res.json();
    if(!data) return [];
    return Object.values(data).sort((a,b)=>{
      const ta=a.timestamp||a.id||"", tb=b.timestamp||b.id||""; return ta<tb?-1:ta>tb?1:0;
    });
  } catch(e){ return []; }
}

function renderSheetCommentsList(quoteId, comments) {
  const list=document.getElementById(`sc-list-${quoteId}`); if(!list) return;
  if(!comments.length){list.innerHTML=`<div class="comments-empty">Brak komentarzy. Bądź pierwszy!</div>`;return;}
  list.innerHTML=comments.map(c=>`
    <div class="comment-item${c.reported?" comment-reported":""}">
      <div class="comment-nick">${escapeHTML(c.nick||"Anonim")}${c.reported?` <span style="font-size:0.58rem;color:#e8735a;"> ⚑ zgłoszony</span>`:""}</div>
      <div class="comment-text">${escapeHTML(c.text)}</div>
      <div class="comment-footer">
        <span class="comment-date">${c.dateDisplay||c.date||""}</span>
        ${!c.reported?`<button class="comment-report-btn" data-qid="${escapeHTML(quoteId)}" data-cid="${escapeHTML(c.id)}" title="Zgłoś">⚑</button>`:""}
      </div>
    </div>`).join("");
  list.querySelectorAll(".comment-report-btn").forEach(btn=>{
    btn.addEventListener("click",()=>reportComment(btn.dataset.qid,btn.dataset.cid,quoteId));
  });
  list.scrollTop=list.scrollHeight;
}

async function reportComment(quoteId, commentId, renderQuoteId) {
  try {
    await fetch(commentsUrl(quoteId,`/${commentId}/reported`),{method:"PUT",headers:{"Content-Type":"application/json"},body:"true"});
    showToast("✓ Komentarz zgłoszony.");
    renderSheetCommentsList(renderQuoteId, await loadComments(renderQuoteId));
  } catch(e){ showToast("Błąd zgłaszania: "+e.message); }
}

async function addSheetComment(quoteId) {
  const nick=document.getElementById(`sc-nick-${quoteId}`).value.trim();
  const text=document.getElementById(`sc-text-${quoteId}`).value.trim();
  if(!text){showToast("Napisz coś!");return;}
  const btn=document.getElementById(`sc-send-${quoteId}`); btn.textContent="Wysyłam…"; btn.disabled=true;
  const now=new Date();
  const c={id:"c-"+Date.now(),nick:nick||"Anonim",text,timestamp:now.toISOString(),
    dateDisplay:now.toLocaleString("pl-PL",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}),reported:false};
  try {
    const res=await fetch(commentsUrl(quoteId,`/${c.id}`),{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    document.getElementById(`sc-text-${quoteId}`).value="";
    document.getElementById(`sc-char-${quoteId}`).textContent="0 / 300";
    renderSheetCommentsList(quoteId, await loadComments(quoteId));
    showToast("✓ Komentarz dodany!");
    // Update counter in feed
    const q=quotes.find(x=>x.id===quoteId); if(q) { q.commentCount=(q.commentCount||0)+1; renderQuotes(); }
  } catch(e){ showToast("Błąd: "+e.message); }
  btn.textContent="Wyślij"; btn.disabled=false;
}

// ─── Share ───
function getShareUrl(id) {
  const url=new URL(window.location.href); url.search=""; url.hash=""; url.searchParams.set("q",id); return url.toString();
}
function openShareBar(quoteId) {
  const bar=document.getElementById("sheet-share-bar");
  const url=getShareUrl(quoteId);
  document.getElementById("sheet-share-url").textContent=url;
  bar.classList.add("open");
  document.getElementById("sheet-share-copy").onclick=()=>{
    navigator.clipboard.writeText(url).then(()=>showToast("✓ Link skopiowany!"),()=>showToast("Błąd."));
  };
}

function checkUrlQuote() {
  const qId=new URLSearchParams(window.location.search).get("q"); if(!qId) return;
  const q=quotes.find(x=>x.id===qId); if(q) openSheet(q);
}

// ─── Random mode ───
let rOverlay=null, rQueue=[], rIdx=0;

function openRandomMode() {
  if(!quotes.length){showToast("Brak cytatów!");return;}
  rQueue=[...quotes].sort(()=>Math.random()-0.5); rIdx=0;
  rOverlay=document.createElement("div"); rOverlay.className="random-overlay";
  document.body.appendChild(rOverlay); document.body.style.overflow="hidden";
  renderRandomCard();
}

function renderRandomCard() {
  const q=rQueue[rIdx];
  const tagLabel=(CONFIG.tags.find(t=>t.id===q.tag)||{}).label||q.tag;
  const r=q.reactions||{heart:0,haha:0,wow:0}, mr=q.myReaction;
  const cardStyle=`background:${getColorGradient(q.color)};color:${getColorText(q.color)};`;
  const isLight=isLightColor(CONFIG.colors[q.color]||{bg1:"#1a1a2e"});
  const dim=isLight?"rgba(0,0,0,0.55)":"rgba(255,255,255,0.55)";
  const markCol=isLight?adjustColor((CONFIG.colors[q.color]||{bg1:"#c9a84c"}).bg1,-60):"#c9a84c";
  rOverlay.innerHTML=`
    <div class="random-card-wrap">
      <div class="random-card" style="${cardStyle}">
        <span class="random-quote-mark" style="color:${markCol}">&ldquo;</span>
        <p class="random-text" style="color:${getColorText(q.color)}">${escapeHTML(q.text)}</p>
        <div class="random-author" style="color:${dim}">— ${escapeHTML(q.author)}</div>
        <span class="random-tag" style="color:${dim};border-color:${dim};">${escapeHTML(tagLabel)}</span>
      </div>
      <div class="random-counter">${rIdx+1} / ${rQueue.length}</div>
    </div>
    <div class="random-reactions">
      <button class="random-reaction-btn${mr==="heart"?" reacted":""}" data-r="heart">❤ ${r.heart||0}</button>
      <button class="random-reaction-btn${mr==="haha"?" reacted":""}" data-r="haha">😂 ${r.haha||0}</button>
      <button class="random-reaction-btn${mr==="wow"?" reacted":""}" data-r="wow">🤔 ${r.wow||0}</button>
    </div>
    <div class="random-bottom">
      <button class="random-close-btn" id="r-close">✕</button>
      <button class="random-next-btn" id="r-next">Następny →</button>
    </div>`;
  rOverlay.querySelectorAll(".random-reaction-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{toggleReaction(q.id,btn.dataset.r); renderRandomCard();});
  });
  document.getElementById("r-next").addEventListener("click",nextRandom);
  document.getElementById("r-close").addEventListener("click",closeRandom);

  // Swipe support
  addSwipe(rOverlay, ()=>nextRandom(), null);
}

function nextRandom() {
  rIdx=(rIdx+1)%rQueue.length;
  if(rIdx===0) rQueue=rQueue.sort(()=>Math.random()-0.5);
  renderRandomCard();
}
function closeRandom() {
  if(rOverlay){rOverlay.remove();rOverlay=null;} document.body.style.overflow="";
}

// ─── Swipe helper ───
function addSwipe(el, onLeft, onRight) {
  let startX=0, startY=0;
  el.addEventListener("touchstart", e=>{startX=e.touches[0].clientX; startY=e.touches[0].clientY;},{passive:true});
  el.addEventListener("touchend", e=>{
    const dx=e.changedTouches[0].clientX-startX;
    const dy=e.changedTouches[0].clientY-startY;
    if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>50) {
      if(dx<0 && onLeft)  onLeft();
      if(dx>0 && onRight) onRight();
    }
  },{passive:true});
}

// Bottom sheet drag-to-close
function initSheetDrag() {
  const sheet=document.getElementById("bottom-sheet");
  let startY=0, startScroll=0, dragging=false;
  sheet.addEventListener("touchstart", e=>{
    if(sheet.scrollTop>0) return; // don't interfere when scrolling content
    startY=e.touches[0].clientY; startScroll=sheet.scrollTop; dragging=true;
  },{passive:true});
  sheet.addEventListener("touchmove", e=>{
    if(!dragging) return;
    const dy=e.touches[0].clientY-startY;
    if(dy>0 && sheet.scrollTop<=0) {
      sheet.style.transform=`translateY(${dy}px)`;
      sheet.style.transition="none";
    }
  },{passive:true});
  sheet.addEventListener("touchend", e=>{
    if(!dragging) return; dragging=false;
    const dy=e.changedTouches[0].clientY-startY;
    sheet.style.transition="";
    if(dy>100) { sheet.style.transform=""; closeSheet(); }
    else { sheet.style.transform=""; }
  });
}


// ─── Pobierz grafikę ───
async function downloadQuoteImage() {
  const card = document.getElementById("quote-render-card");
  const btn  = document.getElementById("sheet-download-btn");
  if (!btn) return;
  btn.textContent = "Generuję…"; btn.disabled = true;
  try {
    const canvas = await html2canvas(card, { scale: 2, useCORS: true, backgroundColor: null });
    const radius = 20 * 2;
    const out = document.createElement("canvas");
    out.width = canvas.width; out.height = canvas.height;
    const ctx = out.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(radius, 0); ctx.lineTo(out.width - radius, 0);
    ctx.quadraticCurveTo(out.width, 0, out.width, radius);
    ctx.lineTo(out.width, out.height - radius);
    ctx.quadraticCurveTo(out.width, out.height, out.width - radius, out.height);
    ctx.lineTo(radius, out.height);
    ctx.quadraticCurveTo(0, out.height, 0, out.height - radius);
    ctx.lineTo(0, radius); ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath(); ctx.clip(); ctx.drawImage(canvas, 0, 0);
    const a = document.createElement("a");
    a.download = "cytat-glosy-swiata.png";
    a.href = out.toDataURL("image/png");
    a.click();
  } catch(e) { showToast("Błąd generowania obrazka."); }
  btn.textContent = "⬇ Pobierz grafikę"; btn.disabled = false;
}

// ─── Export ───
function exportJSON(){ dl("cytaty.json",JSON.stringify(quotes,null,2),"application/json"); }
function exportCSV(){
  const h="id,text,author,tag,color,likes,date\n";
  const r=quotes.map(q=>[q.id,`"${q.text.replace(/"/g,'""')}"`,`"${q.author}"`,q.tag,q.color,q.likes,q.date].join(",")).join("\n");
  dl("cytaty.csv",h+r,"text/csv");
}
function exportXML(){
  const items=quotes.map(q=>`\n  <cytat id="${q.id}"><tekst>${escXML(q.text)}</tekst><autor>${escXML(q.author)}</autor><kategoria>${q.tag}</kategoria><data>${q.date}</data></cytat>`).join("");
  dl("cytaty.xml",`<?xml version="1.0" encoding="UTF-8"?>\n<cytaty>${items}\n</cytaty>`,"application/xml");
}
function exportTXT(){ dl("cytaty.txt",quotes.map(q=>`"${q.text}"\n  — ${q.author} [${q.tag}] | ${q.date}`).join("\n\n---\n\n"),"text/plain"); }
function dl(filename,content,mime){
  const a=Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([content],{type:mime})),download:filename});
  a.click(); URL.revokeObjectURL(a.href);
}

// ─── Loader / Toast ───
function showLoader(msg="Ładowanie…") {
  let el=document.getElementById("app-loader");
  if(!el){
    el=document.createElement("div"); el.id="app-loader";
    el.innerHTML=`<div style="text-align:center;color:#c9a84c;font-family:'DM Mono',monospace;font-size:0.85rem;">
      <div style="width:36px;height:36px;border:3px solid rgba(201,168,76,0.2);border-top-color:#c9a84c;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 14px;"></div>${msg}</div>`;
    const s=document.createElement("style"); s.textContent="@keyframes spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(s); document.body.appendChild(el);
  }
}
function hideLoader(){ const el=document.getElementById("app-loader"); if(el) el.remove(); }
function showToast(msg){
  const t=document.getElementById("toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),2600);
}

// ─── Helpers ───
function escapeHTML(str){ return String(str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function escXML(str){ return String(str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;"); }
function formatDate(d){ try{return new Date(d).toLocaleDateString("pl-PL",{day:"numeric",month:"short",year:"numeric"});}catch{return d;} }


// ══════════════════════════════════════════
//  🎨 MOTYWY — wersja mobilna
// ══════════════════════════════════════════

function applyTheme(id) {
  if (id === "gold-dark") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", id);
  }
  localStorage.setItem("glosy_theme", id);
  document.querySelectorAll(".theme-popover-item-m").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === id);
  });
}

function initThemePickerMobile() {
  const btn     = document.getElementById("theme-picker-btn-m");
  const popover = document.getElementById("theme-popover-m");
  if (!btn || !popover) return;

  btn.addEventListener("click", e => {
    e.stopPropagation();
    popover.classList.toggle("open");
  });
  document.addEventListener("click", () => popover.classList.remove("open"));
  popover.addEventListener("click", e => e.stopPropagation());

  popover.querySelectorAll(".theme-popover-item-m").forEach(item => {
    item.addEventListener("click", () => {
      applyTheme(item.dataset.theme);
      popover.classList.remove("open");
    });
  });

  // Zaznacz aktualny
  const current = localStorage.getItem("glosy_theme") || "gold-dark";
  applyTheme(current);
}

// ─── INIT ───
document.addEventListener("DOMContentLoaded", async () => {
  showLoader("Ładowanie…");
  await fetchConfig();
  buildCategoryStrip();
  buildTagSelector();
  buildColorPicker();
  initThemePickerMobile();
  quotes=await fetchQuotes();
  hideLoader();
  renderQuotes(); updateStats();

  // Nav tabs
  document.querySelectorAll(".nav-tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      switchView(btn.dataset.view);
      if(btn.dataset.view==="feed"){
        showLoader("Odświeżam…");
        fetchQuotes().then(q=>{quotes=q;hideLoader();renderQuotes();updateStats();});
      }
    });
  });

  // Search toggle
  const searchBar=document.getElementById("top-search-bar");
  document.getElementById("search-toggle-btn").addEventListener("click",()=>{
    const open=searchBar.classList.toggle("open");
    if(open) document.getElementById("search-input").focus();
    else { document.getElementById("search-input").value=""; currentSearch=""; renderQuotes(); }
  });
  document.getElementById("search-input").addEventListener("input", e=>{currentSearch=e.target.value; renderQuotes();});

  // Filter chips
  document.querySelectorAll("#filter-strip .chip[data-filter]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll("#filter-strip .chip[data-filter]").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active"); currentFilter=btn.dataset.filter; renderQuotes();
    });
  });
  document.getElementById("random-btn").addEventListener("click",openRandomMode);

  // Add form
  document.getElementById("quote-text").addEventListener("input", updatePreview);
  document.getElementById("quote-author").addEventListener("input", updatePreview);
  document.getElementById("submit-quote-btn").addEventListener("click", addQuote);
  document.getElementById("clear-form-btn").addEventListener("click",()=>{
    document.getElementById("quote-text").value=""; document.getElementById("quote-author").value=""; updatePreview();
  });
  document.getElementById("go-add-btn").addEventListener("click",()=>switchView("add"));

  // Sheet
  initSheetDrag();
  document.getElementById("sheet-overlay").addEventListener("click", closeSheet);
  document.getElementById("sheet-share-btn").addEventListener("click",()=>{
    if(_currentSheetQuote) openShareBar(_currentSheetQuote.id);
  });
  document.getElementById("sheet-copy-btn").addEventListener("click",()=>{
    if(!_currentSheetQuote) return;
    const q=_currentSheetQuote;
    navigator.clipboard.writeText(`„${q.text}" — ${q.author}`).then(
      ()=>showToast("✓ Skopiowano!"),()=>showToast("Błąd kopiowania.")
    );
  });
  document.getElementById("sheet-download-btn").addEventListener("click", downloadQuoteImage);

  // Download btn (sheet doesn't have it, but render card is there for compatibility)
  // Contact
  document.querySelectorAll("#suggestion-type-selector .tag-option").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll("#suggestion-type-selector .tag-option").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active"); selectedSuggestionType=btn.dataset.type;
    });
  });
  document.getElementById("contact-message").addEventListener("input",e=>{
    document.getElementById("contact-char-count").textContent=`${e.target.value.length} / 500`;
  });
  document.getElementById("submit-contact-btn").addEventListener("click", submitSuggestion);
  document.getElementById("clear-contact-btn").addEventListener("click",()=>{
    document.getElementById("contact-message").value=""; document.getElementById("contact-nick").value="";
    document.getElementById("contact-char-count").textContent="0 / 500";
  });

  // Export
  document.getElementById("export-json").addEventListener("click",exportJSON);
  document.getElementById("export-csv").addEventListener("click",exportCSV);
  document.getElementById("export-xml").addEventListener("click",exportXML);
  document.getElementById("export-txt").addEventListener("click",exportTXT);

  // Desktop link — force desktop mode
  document.getElementById("desktop-link").addEventListener("click", e=>{
    e.preventDefault(); sessionStorage.setItem("glosy_force_desktop","1");
    window.location.href="index.html";
  });

  // URL ?q= param
  checkUrlQuote();

  // Auto-refresh co 45s
  setInterval(async()=>{
    if(document.getElementById("view-feed").classList.contains("active")){
      quotes=await fetchQuotes(); renderQuotes(); updateStats();
    }
  }, 45_000);
});
