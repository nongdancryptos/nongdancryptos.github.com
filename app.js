/* ===== Utils ===== */
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const fmt = (n, d = 2) => {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
};
const clip = (str, n = 110) => (str?.length > n ? str.slice(0, n) + '…' : str || '');

/* ===== Year in footer ===== */
$('#year').textContent = new Date().getFullYear();

/* ===== Price Ticker (Top 20) =====
   Source: CoinGecko (public, no API key)
*/
async function loadTicker() {
  try {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=1h,24h';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Ticker fetch failed');
    const data = await res.json();

    const items = data.map(c => {
      const delta = c.price_change_percentage_24h;
      const cls = delta >= 0 ? 'ticker-up' : 'ticker-down';
      return `<span class="ticker-item">
        <img src="${c.image}" alt="${c.symbol}" width="18" height="18" style="border-radius:50%;"/>
        <b>${c.symbol.toUpperCase()}</b> $${fmt(c.current_price, 4)}
        <span class="${cls}">${delta ? delta.toFixed(2) : '0.00'}%</span>
      </span>`;
    });
    // duplicate (for seamless looping)
    $('#ticker').innerHTML = items.join('') + items.join('');
  } catch (e) {
    console.error(e);
    $('#ticker').innerHTML = `<span class="ticker-item">Không tải được giá coin.</span>`;
  }
}

/* ===== Crypto News (4 newest + hot flag) =====
   Source: CryptoCompare top news (no API key)
*/
async function loadNews() {
  const list = $('#news-list');
  const empty = $('#news-empty');
  empty.classList.add('hidden');
  list.innerHTML = '';

  try {
    const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN', { cache: 'no-store' });
    if (!res.ok) throw new Error('News fetch failed');
    const json = await res.json();
    const articles = (json?.Data || [])
      .filter(a => a.title && a.url)
      .sort((a,b) => b.published_on - a.published_on)  // newest
      .slice(0, 4);                                    // only 4

    if (!articles.length) throw new Error('No news');

    const html = articles.map(a => {
      const t = new Date(a.published_on * 1000);
      const when = t.toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' });
      const img = a.imageurl || 'https://cryptocompare.com/media/37746251/cryptocompare.png';
      return `<article class="card news-card">
        <img class="news-img" src="${img}" alt="">
        <div>
          <a href="${a.url}" target="_blank" rel="noopener">
            <h3 style="margin:.2rem 0;">${clip(a.title, 120)}</h3>
          </a>
          <p class="muted" style="margin:.2rem 0;">${clip(a.body, 160)}</p>
          <div class="news-meta">
            <span class="badge-news">${a.source_info?.name || 'Source'}</span>
            <span>${when}</span>
          </div>
        </div>
      </article>`;
    }).join('');

    list.innerHTML = html;
  } catch (e) {
    console.error(e);
    empty.classList.remove('hidden');
  }
}

/* ===== Events ===== */
$('#reloadNews').addEventListener('click', loadNews);

/* ===== Boot ===== */
loadTicker();
loadNews();

/* Refresh ticker every 60s */
setInterval(loadTicker, 60_000);
