// Footer year
document.getElementById('y').textContent = new Date().getFullYear();

/* ================== CRYPTO TICKER (Top 20) ================== */
const tickerRow = document.getElementById('tickerRow');

async function loadTicker() {
  try {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=1h,24h';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Ticker request failed');
    const data = await res.json();

    tickerRow.innerHTML = '';
    data.forEach(c => {
      const item = document.createElement('div');
      item.className = 'ti';
      const chg = c.price_change_percentage_24h ?? 0;
      const chgClass = chg >= 0 ? 'up' : 'down';
      item.innerHTML = `
        <strong>${c.symbol.toUpperCase()}</strong>
        <span>$${Number(c.current_price).toLocaleString()}</span>
        <span class="chg ${chgClass}">${chg.toFixed(2)}%</span>
      `;
      tickerRow.appendChild(item);
    });
  } catch (e) {
    tickerRow.textContent = 'Không tải được giá crypto.';
    console.error(e);
  }
}
loadTicker();
setInterval(loadTicker, 60 * 1000); // refresh mỗi phút

/* ================== CRYPTO NEWS (4 items) ================== */
const newsList = document.getElementById('newsList');
const newsEmpty = document.getElementById('newsEmpty');
const btnReload = document.getElementById('btnReloadNews');

// Provider 1: CryptoCompare (public, thường cho CORS)
async function fetchNewsCryptoCompare(limit = 4) {
  const url = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('news provider 1 failed');
  const j = await r.json();
  // sort by published_on desc & take top 4 hot-ish
  const items = (j.Data || [])
    .sort((a, b) => b.published_on - a.published_on)
    .slice(0, limit)
    .map(n => ({
      title: n.title,
      url: n.url,
      source: n.source_info?.name || 'CryptoCompare',
      time: new Date(n.published_on * 1000),
      img: n.imageurl
    }));
  return items;
}

// Provider 2: rss2json(Coindesk) fallback
async function fetchNewsFallback(limit = 4) {
  const url = 'https://api.rss2json.com/v1/api.json?rss_url=https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml';
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('news provider 2 failed');
  const j = await r.json();
  const items = (j.items || []).slice(0, limit).map(n => ({
    title: n.title,
    url: n.link,
    source: 'CoinDesk',
    time: new Date(n.pubDate),
    img: n.thumbnail || ''
  }));
  return items;
}

function renderNews(items) {
  newsList.innerHTML = '';
  if (!items || !items.length) {
    newsList.appendChild(newsEmpty);
    newsEmpty.style.display = 'block';
    return;
  }
  items.forEach(n => {
    const card = document.createElement('article');
    card.className = 'card glass news-card';
    const t = n.time ? n.time.toLocaleString('vi-VN') : '';
    card.innerHTML = `
      ${n.img ? `<img src="${n.img}" alt="">` : ''}
      <h4><a href="${n.url}" target="_blank" rel="noopener">${n.title}</a></h4>
      <div class="meta"><span>${n.source}</span> • <time>${t}</time></div>
    `;
    newsList.appendChild(card);
  });
}

async function loadNews() {
  newsEmpty.style.display = 'none';
  try {
    const items = await fetchNewsCryptoCompare(4);
    renderNews(items);
  } catch (e1) {
    console.warn('Provider1 failed, try fallback', e1);
    try {
      const items = await fetchNewsFallback(4);
      renderNews(items);
    } catch (e2) {
      console.error(e2);
      newsList.innerHTML = '';
      newsList.appendChild(newsEmpty);
      newsEmpty.style.display = 'block';
    }
  }
}
btnReload?.addEventListener('click', loadNews);
loadNews();
