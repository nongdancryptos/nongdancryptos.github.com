/* ========= Helpers ========= */
const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => Array.from(root.querySelectorAll(q));
const fmt = {
  money(n){ return `$${Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n)}` },
  pct(n){ return `${(n>0?'+':'')}${n?.toFixed(2)}%` }
};
const CFG = window.APP_CONFIG || {};
$("#y").textContent = new Date().getFullYear();

/* ========= Modal Giới thiệu ========= */
(function AboutModal(){
  const btn = $("#btnAbout"), modal = $("#aboutModal"), body = $("#aboutBody");
  if(!btn || !modal || !body) return;
  let loaded = false;
  const open = () => { modal.classList.add("is-open"); modal.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; if(!loaded) load(); };
  const close = () => { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden","true"); document.body.style.overflow=""; };
  async function load(){
    try{
      const r = await fetch(CFG.aboutFile || "about.html",{cache:"no-store"});
      const html = await r.text();
      body.innerHTML = html; loaded = true;
    }catch(e){ body.innerHTML = `<div class="modal__loading">Không tải được nội dung.</div>`; }
  }
  btn.addEventListener("click", open);
  modal.addEventListener("click", (e)=>{ if(e.target.matches("[data-close], .modal__backdrop")) close(); });
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && modal.classList.contains("is-open")) close(); });
})();

/* ========= Crypto Ticker (CoinGecko) ========= */
(function CryptoTicker(){
  const el = $("#ticker"); if(!el) return;
  async function fetchCoins(){
    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h";
    const r = await fetch(url, {headers:{accept:"application/json"}});
    if(!r.ok) throw new Error("coin api");
    return r.json();
  }
  function render(list){
    const items = list.map(c=>{
      const dir = c.price_change_percentage_24h ?? 0;
      const cls = dir>0 ? "up" : dir<0 ? "down" : "flat";
      return `<div class="ti"><span class="sym">${c.symbol.toUpperCase()}</span><span class="pr">${fmt.money(c.current_price)}</span><span class="${cls}">${fmt.pct(dir)}</span></div>`;
    }).join("");
    el.innerHTML = items + items;
  }
  async function load(){
    try{ render(await fetchCoins()); }
    catch{ el.innerHTML = `<span class="muted">Không lấy được giá…</span>`; }
  }
  load();
  setInterval(load,(CFG.coinsRefreshSec||60)*1000);
})();

/* ========= Crypto News (RSS) ========= */
(function CryptoNews(){
  const grid = $("#newsGrid");
  const q = $("#q");
  const sortSel = $("#sortBy");
  const sourceSel = $("#sourceFilter");

  if(!grid) return;

  let allItems = [];
  let filtered = [];

  // khởi tạo danh sách nguồn vào select
  function buildSourceFilter(sources){
    const opts = ['<option value="">Tất cả nguồn</option>', ...sources.map(s=>`<option value="${s.name}">${s.name}</option>`)];
    sourceSel.innerHTML = opts.join("");
  }

  // lấy & parse RSS qua r.jina.ai (bypass CORS), dùng DOMParser
  async function fetchFeed({name, url}){
    try{
      const res = await fetch(url, {headers:{accept:"application/xml"}});
      const xmlText = await res.text();
      const doc = new DOMParser().parseFromString(xmlText, "text/xml");
      const items = [...doc.querySelectorAll("item")].slice(0, 20).map(it=>{
        const title = (it.querySelector("title")?.textContent || "").trim();
        const link = (it.querySelector("link")?.textContent || "").trim();
        const pubDate = new Date(it.querySelector("pubDate")?.textContent || Date.now());
        const desc = (it.querySelector("description")?.textContent || "").replace(/<[^>]+>/g,"").trim();
        const enclosure = it.querySelector("enclosure")?.getAttribute("url") || "";
        const thumbnail = findImage(it.textContent) || enclosure;
        return { title, link, pubDate, desc, source:name, thumbnail };
      });
      return items;
    }catch(e){
      return [];
    }
  }

  function findImage(str=""){
    const m = str.match(/https?:\/\/[^"'\s>]+?\.(png|jpe?g|gif|webp)/i);
    return m ? m[0] : "";
  }

  function minutesAgo(d){ return Math.floor((Date.now()-d.getTime())/60000); }

  function card(n){
    const mins = minutesAgo(n.pubDate);
    const age = mins<60 ? `${mins} phút trước` : `${Math.floor(mins/60)} giờ trước`;
    const img = n.thumbnail ? `<img src="${n.thumbnail}" alt="">` : `<img src="https://i.imgur.com/7WzqF5f.jpeg" alt="">`;
    return `
      <article class="card">
        <div class="card__media cover">
          ${img}
          <span class="pill">${n.source}</span>
        </div>
        <div class="card__body">
          <h3 class="card__title"><a href="${n.link}" target="_blank" rel="noopener noreferrer">${escapeHTML(n.title)}</a></h3>
          <p>${escapeHTML(n.desc).slice(0,180)}…</p>
          <div class="card__meta">
            <span>🕒 ${age}</span>
          </div>
        </div>
      </article>
    `;
  }

  function escapeHTML(s){ const d=document.createElement("div"); d.textContent=s; return d.innerHTML; }

  function applyFilters(){
    const kw = (q.value||"").toLowerCase().trim();
    const src = sourceSel.value;
    filtered = allItems.filter(i=>{
      const okQ = !kw || i.title.toLowerCase().includes(kw) || i.desc.toLowerCase().includes(kw);
      const okS = !src || i.source===src;
      return okQ && okS;
    });
    applySort();
  }

  function applySort(){
    const mode = sortSel.value;
    filtered.sort((a,b)=> mode==="oldest" ? a.pubDate - b.pubDate : b.pubDate - a.pubDate);
    render();
  }

  function render(){
    if(!filtered.length){
      grid.innerHTML = `<div class="card" style="grid-column:1/-1; padding:28px"><div class="muted">Chưa có bài phù hợp.</div></div>`;
      return;
    }
    grid.innerHTML = filtered.slice(0, CFG.maxNews || 18).map(card).join("");
  }

  async function init(){
    try{
      buildSourceFilter(CFG.rssSources || []);
      const chunks = await Promise.all((CFG.rssSources||[]).map(fetchFeed));
      allItems = chunks.flat().filter(x=>x.title && x.link);
      // fallback nếu RSS nào lỗi => vẫn hiển thị các nguồn còn lại
      applyFilters();
    }catch(e){
      grid.innerHTML = `<div class="card" style="grid-column:1/-1; padding:28px"><div class="muted">Không tải được RSS.</div></div>`;
    }
  }

  q.addEventListener("input", applyFilters);
  sortSel.addEventListener("change", applySort);
  sourceSel.addEventListener("change", applyFilters);

  init();
})();
