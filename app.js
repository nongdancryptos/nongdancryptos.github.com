// ===== Mobile menu (optional: nếu muốn mở menu phụ) =====
const hamburger = document.querySelector('.hamburger');
const menu = document.querySelector('.menu');
if (hamburger && menu){
  hamburger.addEventListener('click', () => {
    menu.style.display = (menu.style.display === 'flex' ? 'none' : 'flex');
  });
}

// ===== Footer year =====
document.getElementById('y').textContent = new Date().getFullYear();

// ===== Copy helper (proxy) =====
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  const target = document.querySelector(btn.getAttribute('data-copy'));
  if (!target) return;
  const text = target.value || target.textContent || '';
  navigator.clipboard.writeText(text.trim()).then(() => {
    const prev = btn.textContent;
    btn.textContent = 'Đã copy ✓';
    setTimeout(() => (btn.textContent = prev), 1400);
  });
});

// ===== LIVE TICKER: Top 20 (CoinGecko) =====
// Không cần API key. Tự động refresh mỗi 60s
const geckoURL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=1h,24h,7d';

const tickerEl = document.getElementById('ticker');

function fmt(n, d=2){
  if (n === null || n === undefined || isNaN(n)) return '-';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
}

function upDownClass(v){
  if (v > 0) return 'up';
  if (v < 0) return 'down';
  return '';
}

async function loadTicker(){
  try{
    const res = await fetch(geckoURL, { cache: 'no-store' });
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Invalid price data');

    const items = data.map(c => {
      const chg = c.price_change_percentage_24h;
      return `
        <span class="ti">
          <img src="${c.image}" alt="${c.symbol}" width="18" height="18" loading="lazy" />
          <b>${c.symbol.toUpperCase()}</b>
          <span>$${fmt(c.current_price, c.current_price > 1 ? 2 : 4)}</span>
          <span class="chg ${upDownClass(chg)}">${chg ? chg.toFixed(2) : '0.00'}%</span>
        </span>
      `;
    }).join('');

    // duplicate once to create seamless loop
    tickerEl.innerHTML = items + items;
  }catch(err){
    console.error(err);
    tickerEl.innerHTML = `<span class="ti"><b>Prices</b> đang tạm gián đoạn…</span>`;
  }
}
loadTicker();
setInterval(loadTicker, 60_000);

// ===== CRYPTO NEWS (CoinStats public API) =====
// API không cần key, hỗ trợ CORS, có thumb & nguồn bài
const newsURL = 'https://api.coinstats.app/public/v1/news?skip=0&limit=18';

const newsList = document.getElementById('news-list');
const reloadNewsBtn = document.getElementById('reload-news');

async function loadNews(){
  try{
    newsList.innerHTML = '';
    const res = await fetch(newsURL, { cache: 'no-store' });
    const json = await res.json();
    const news = json?.news || [];

    if (news.length === 0){
      newsList.innerHTML = `<div class="card glass"><p class="muted">Chưa có tin nào.</p></div>`;
      return;
    }

    const cards = news.map(n => {
      const img = n.imgURL || n.sourceImg || 'https://dummyimage.com/800x450/0b1220/ffffff&text=Crypto+News';
      const date = n.feedDate ? new Date(n.feedDate).toLocaleString() : '';
      const site = n.source || 'Source';
      const title = n.title || 'Untitled';
      const desc = n.description || '';
      const link = n.link || '#';

      return `
        <article class="news">
          <img class="thumb" src="${img}" alt="${site}" loading="lazy" />
          <div class="inner">
            <h3>${title}</h3>
            <p>${desc}</p>
            <div class="meta"><span>${site}</span><span>${date}</span></div>
            <a class="read" href="${link}" target="_blank" rel="noopener">Đọc bài →</a>
          </div>
        </article>
      `;
    }).join('');

    newsList.innerHTML = cards;
  }catch(err){
    console.error(err);
    newsList.innerHTML = `<div class="card glass"><p class="muted">Không tải được tin tức. Thử lại sau.</p></div>`;
  }
}
loadNews();
reloadNewsBtn.addEventListener('click', loadNews);
