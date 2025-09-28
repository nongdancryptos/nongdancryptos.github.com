/* ===== Year in footer ===== */
document.getElementById("y").textContent = new Date().getFullYear();

/* ===== Theme toggle (Light/Dark) ===== */
(function initThemeToggle(){
  const root = document.documentElement;
  const btn  = document.getElementById("themeToggle");
  const sun  = document.getElementById("icon-sun");
  const moon = document.getElementById("icon-moon");

  const saved = localStorage.getItem("tp-theme");
  if(saved === "light" || saved === "dark"){
    root.setAttribute("data-theme", saved);
  }else{
    // default dark
    root.setAttribute("data-theme", "dark");
  }
  updateIcon();

  btn.addEventListener("click", ()=>{
    const cur = root.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("tp-theme", next);
    updateIcon();
  });

  function updateIcon(){
    const cur = root.getAttribute("data-theme");
    const isLight = cur === "light";
    sun.hidden  = isLight; // hiển thị moon ở light
    moon.hidden = !isLight;
  }
})();

/* ======= TOP COIN TICKER (Binance WS + CoinGecko fallback) ======= */
const TOP_SYMBOLS = [
  "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT",
  "ADAUSDT","DOGEUSDT","TRXUSDT","TONUSDT","DOTUSDT",
  "AVAXUSDT","SHIBUSDT","LINKUSDT","BCHUSDT","LTCUSDT",
  "MATICUSDT","UNIUSDT","XLMUSDT","NEARUSDT","ATOMUSDT"
];
const CG_IDS = {
  BTCUSDT:"bitcoin", ETHUSDT:"ethereum", BNBUSDT:"binancecoin", SOLUSDT:"solana",
  XRPUSDT:"ripple", ADAUSDT:"cardano", DOGEUSDT:"dogecoin", TRXUSDT:"tron",
  TONUSDT:"the-open-network", DOTUSDT:"polkadot", AVAXUSDT:"avalanche-2",
  SHIBUSDT:"shiba-inu", LINKUSDT:"chainlink", BCHUSDT:"bitcoin-cash",
  LTCUSDT:"litecoin", MATICUSDT:"polygon", UNIUSDT:"uniswap", XLMUSDT:"stellar",
  NEARUSDT:"near", ATOMUSDT:"cosmos"
};
const $tickerTrack = document.getElementById("ticker-track");
let ws, wsAlive = false;

function renderTickerSkeleton(){
  const ph = TOP_SYMBOLS.slice(0,10).map(s=>(
    `<span class="ticker__item">
      <span class="ticker__sym">${s.replace("USDT","")}</span>
      <span class="ticker__price">…</span>
      <span class="ticker__pct">…</span>
    </span>`
  )).join("");
  $tickerTrack.innerHTML = ph + ph;
}
renderTickerSkeleton();

function connectBinanceWS(){
  try{
    ws = new WebSocket("wss://stream.binance.com:9443/ws/!ticker@arr");
    ws.onopen  = ()=>{ wsAlive = true; };
    ws.onclose = ()=>{ wsAlive = false; setTimeout(connectBinanceWS, 8000); };
    ws.onerror = ()=>{ wsAlive = false; };
    ws.onmessage = (ev)=>{
      const arr = JSON.parse(ev.data);
      const picks = [];
      for(const t of arr){
        if(TOP_SYMBOLS.includes(t.s)){
          picks.push({ sym:t.s, price:Number(t.c), pct:Number(t.P) });
        }
      }
      if(picks.length) renderTicker(picks);
    };
  }catch(e){
    wsAlive = false; fetchTickerFallback();
  }
}

async function fetchTickerFallback(){
  try{
    const ids = TOP_SYMBOLS.map(s=>CG_IDS[s]).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const r = await fetch(url,{cache:"no-store"});
    if(!r.ok) throw new Error("cg");
    const j = await r.json();
    const picks = TOP_SYMBOLS.map(s=>{
      const o = j[CG_IDS[s]];
      return o ? { sym:s, price:+o.usd, pct:+o.usd_24h_change } : null;
    }).filter(Boolean);
    if(picks.length) renderTicker(picks);
  }catch(_){}
}

function renderTicker(list){
  const by = new Map(list.map(i=>[i.sym,i]));
  const ordered = TOP_SYMBOLS.map(s=>by.get(s)).filter(Boolean).slice(0,20);
  const nf = new Intl.NumberFormat("en-US",{ maximumFractionDigits:4 });

  const html = ordered.map(o=>{
    const name = o.sym.replace("USDT","");
    const up = o.pct >= 0;
    const priceStr = (o.price >= 100) ? nf.format(o.price)
                    : (o.price >= 1 ? o.price.toFixed(2) : o.price.toPrecision(3));
    const pctStr = (up?"+":"") + o.pct.toFixed(2) + "%";
    return `<span class="ticker__item">
      <span class="ticker__sym">${name}</span>
      <span class="ticker__price">$${priceStr}</span>
      <span class="ticker__pct ${up?"up":"down"}">${pctStr}</span>
    </span>`;
  }).join("");

  $tickerTrack.innerHTML = html + html; // loop vô hạn
}

connectBinanceWS();
setInterval(()=>{ if(!wsAlive) fetchTickerFallback(); }, 20000);

/* ====== Crypto News (4 bài mới & hot) ====== */
/**
 * Dùng RSS qua rss2json làm lớp chống CORS (free, rate-limit nhẹ).
 * Gộp nhiều nguồn -> sort theo pubDate -> chọn 4 bài.
 */
const RSS_SOURCES = [
  // cointelegraph, coindesk, decrypt
  "https://cointelegraph.com/rss",
  "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
  "https://decrypt.co/feed"
];

const $news = document.getElementById("news-list");
const $reloadBtn = document.getElementById("btnReloadNews");

async function loadNews(){
  $news.innerHTML = `<div class="card" style="grid-column:1/-1"><p class="muted">Đang tải tin…</p></div>`;
  try{
    const all = [];
    for(const src of RSS_SOURCES){
      const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(src)}`;
      const r = await fetch(url, {cache:"no-store"});
      if(!r.ok) continue;
      const j = await r.json();
      if(j && Array.isArray(j.items)){
        j.items.forEach(it=>{
          all.push({
            title: it.title,
            link: it.link,
            pub: new Date(it.pubDate || it.pubdate || it.date || Date.now()),
            source: (j.feed && j.feed.title) || "Source",
            thumb: it.enclosure?.link || it.thumbnail || ""
          });
        });
      }
    }
    all.sort((a,b)=>b.pub - a.pub);
    const picks = all.slice(0, 4);
    if(!picks.length) throw new Error("no news");

    $news.innerHTML = picks.map(n=>`
      <a class="news-card" href="${n.link}" target="_blank" rel="noopener">
        <img src="${n.thumb || 'https://images.unsplash.com/photo-1649180551741-6a3df9b21965?q=80&w=600&auto=format&fit=crop'}" alt="">
        <div class="news-body">
          <h4 class="title">${escapeHTML(n.title)}</h4>
          <div class="news-meta">
            <span>${n.source || "News"}</span>
            <time>${timeAgo(n.pub)}</time>
          </div>
        </div>
      </a>
    `).join("");
  }catch(err){
    $news.innerHTML = `<div class="card" style="grid-column:1/-1"><p>Không tải được tin tức. Thử lại sau.</p></div>`;
  }
}
$reloadBtn.addEventListener("click", loadNews);
document.addEventListener("DOMContentLoaded", loadNews);

/* ===== helpers ===== */
function timeAgo(date){
  const s = Math.floor((Date.now() - date.getTime())/1000);
  const m = Math.floor(s/60), h = Math.floor(m/60), d = Math.floor(h/24);
  if(d>0) return `${d}d trước`; if(h>0) return `${h}h trước`; if(m>0) return `${m}m trước`; return `vừa xong`;
}
function escapeHTML(str){return str.replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]))}
