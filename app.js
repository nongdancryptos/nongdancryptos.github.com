// Year in footer
document.getElementById('y').textContent = new Date().getFullYear();

/* ---------------- Utils: fetch with timeout ---------------- */
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 12000 } = options; // 12s
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return resp;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

/* ---------------- CRYPTO TICKER (Top 20) ------------------ */
const tickerRow = document.getElementById('tickerRow');

async function loadTicker() {
  try {
    const url =
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h';
    const res = await fetchWithTimeout(url, { cache: 'no-store', timeout: 15000 });
    if (!res.ok) throw new Error('Ticker request failed: ' + res.status);
    const data = await res.json();

    tickerRow.innerHTML = '';
    for (const c of data) {
      const item = document.createElement('div');
      item.className = 'ti';
      const chg = Number(c.price_change_percentage_24h || 0);
      const chgClass = chg >= 0 ? 'up' : 'down';
      item.innerHTML = `
        <strong>${(c.symbol || '').toUpperCase()}</strong>
        <span>$${Number(c.current_price || 0).toLocaleString()}</span>
        <span class="chg ${chgClass}">${isFinite(chg) ? chg.toFixed(2) : '0.00'}%</span>
      `;
      tickerRow.appendChild(item);
    }
  } catch (e) {
    console.error('Ticker error:', e);
    tickerRow.textContent = 'Không tải được giá crypto.';
  }
}
loadTicker();
setInterval(loadTicker, 60 * 1000); // refresh mỗi phút

/* -------------------- CRYPTO NEWS (4) --------------------- */
const newsList = document.getElementById('newsList');
const newsEmpty = document.getElementById('newsEmpty');
const btnReload = document.getElementById('btnReloadNews');

function renderNews(items) {
  newsList.innerHTML = '';
  if (!items || !items.length) {
    newsEmpty.textContent = 'Không có tin tức phù hợp.';
    newsEmpty.style.display = 'block';
    newsList.appendChild(newsEmpty);
    return;
  }
  for (const n of items) {
    const card = document.createElement('article');
    card.className = 'card glass news-card';
    const t = n.time ? new Date(n.time).toLocaleString('vi-VN') : '';
    card.innerHTML = `
      ${n.img ? `<img src="${n.img}" alt="">` : ''}
      <h4><a href="${n.url}" target="_blank" rel="noopener noreferrer">${n.title}</a></h4>
      <div class="meta"><span>${n.source}</span> • <time>${t}</time></div>
    `;
    newsList.appendChild(card);
  }
}

// Provider 1: CryptoCompare (thường cho CORS)
async function providerCryptoCompare(limit = 4) {
  const url = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
  const r = await fetchWithTimeout(url, { cache: 'no-store', timeout: 12000 });
  if (!r.ok) throw new Error('news provider 1 failed: ' + r.status);
  const j = await r.json();
  const items = (j?.Data || [])
    .sort((a, b) => (b.published_on || 0) - (a.published_on || 0))
    .slice(0, limit)
    .map(n => ({
      title: n.title,
      url: n.url,
      source: n.source_info?.name || 'CryptoCompare',
      time: (n.published_on || 0) * 1000,
      img: n.imageurl || ''
    }));
  return items;
}

// Provider 2: Coindesk qua rss2json fallback
async function providerCoindesk(limit = 4) {
  const url = 'https://api.rss2json.com/v1/api.json?rss_url=https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml';
  const r = await fetchWithTimeout(url, { cache: 'no-store', timeout: 12000 });
  if (!r.ok) throw new Error('news provider 2 failed: ' + r.status);
  const j = await r.json();
  const items = (j?.items || [])
    .slice(0, limit)
    .map(n => ({
      title: n.title,
      url: n.link,
      source: 'CoinDesk',
      time: Date.parse(n.pubDate || ''),
      img: n.thumbnail || ''
    }));
  return items;
}

// Fallback cuối: tin mẫu tĩnh (đảm bảo UI hiển thị)
function providerStatic(limit = 4) {
  const now = Date.now();
  const base = [
    { title: 'BTC sideway, alt tăng nhẹ', url: '#', source: 'Local', time: now - 3600e3, img: '' },
    { title: 'ETH gas giảm, NFT hồi phục', url: '#', source: 'Local', time: now - 2*3600e3, img: '' },
    { title: 'Binance công bố chương trình Earn mới', url: '#', source: 'Local', time: now - 3*3600e3, img: '' },
    { title: 'Solana hệ sinh thái mở rộng dApp', url: '#', source: 'Local', time: now - 4*3600e3, img: '' },
  ];
  return base.slice(0, limit);
}

async function loadNews() {
  newsEmpty.style.display = 'none';
  try {
    const items = await providerCryptoCompare(4);
    renderNews(items);
  } catch (e1) {
    console.warn('Provider1 failed → fallback', e1);
    try {
      const items = await providerCoindesk(4);
      renderNews(items);
    } catch (e2) {
      console.warn('Provider2 failed → static', e2);
      const items = providerStatic(4);
      renderNews(items);
    }
  }
}

btnReload?.addEventListener('click', loadNews);
loadNews();
