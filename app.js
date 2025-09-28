/* ===== util ===== */
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

/* ===== theme toggle ===== */
(() => {
  const root = document.documentElement;
  const btn = $('#themeToggle');
  const iconSun = $('#icon-sun');
  const iconMoon = $('#icon-moon');

  const saved = localStorage.getItem('theme');
  if (saved) root.setAttribute('data-theme', saved);
  const isLight = () => root.getAttribute('data-theme') === 'light';
  const syncIcon = () => {
    if (isLight()) { iconSun.hidden = true; iconMoon.hidden = false; }
    else { iconSun.hidden = false; iconMoon.hidden = true; }
  };
  syncIcon();

  btn.addEventListener('click', () => {
    root.setAttribute('data-theme', isLight() ? 'dark' : 'light');
    localStorage.setItem('theme', root.getAttribute('data-theme'));
    syncIcon();
  });
})();

/* ===== footer year ===== */
(() => { const y = new Date().getFullYear(); const el = document.getElementById('y'); if (el) el.textContent = y; })();

/* ===== COIN TICKER (Top 20) ===== */
(async () => {
  const symbols = [
    'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','USDCUSDT','DOGEUSDT','ADAUSDT','TRXUSDT','TONUSDT',
    'AVAXUSDT','SHIBUSDT','DOTUSDT','WBTCUSDT','BCHUSDT','LINKUSDT','NEARUSDT','MATICUSDT','LTCUSDT','UNIUSDT'
  ];
  const elTrack = document.getElementById('ticker-track');
  if (!elTrack) return;

  // build initial DOM items
  const makeItem = (sym, p=0, chg=0) => {
    const item = document.createElement('div');
    item.className = `ti ${chg>=0?'up':'down'}`;
    item.dataset.symbol = sym;
    item.innerHTML = `<b>${sym.replace('USDT','')}</b><span>$${Number(p).toLocaleString()}</span><span class="chg">${chg>=0?'+':''}${chg.toFixed(2)}%</span>`;
    return item;
  };
  const state = {}; // {SYM:{price, chg}}
  symbols.forEach(s => { state[s] = {price:0, chg:0}; });

  const render = () => {
    elTrack.innerHTML = '';
    // duplicate to create infinite scroll feel
    for (let k=0;k<2;k++){
      symbols.forEach(sym => {
        const {price, chg} = state[sym];
        elTrack.appendChild(makeItem(sym, price, chg));
      });
    }
  };

  // Fallback via CoinGecko simple price
  const coingeckoIds = {
    BTCUSDT:'bitcoin', ETHUSDT:'ethereum', BNBUSDT:'binancecoin', SOLUSDT:'solana', XRPUSDT:'ripple',
    USDCUSDT:'usd-coin', DOGEUSDT:'dogecoin', ADAUSDT:'cardano', TRXUSDT:'tron', TONUSDT:'toncoin',
    AVAXUSDT:'avalanche-2', SHIBUSDT:'shiba-inu', DOTUSDT:'polkadot', WBTCUSDT:'wrapped-bitcoin',
    BCHUSDT:'bitcoin-cash', LINKUSDT:'chainlink', NEARUSDT:'near', MATICUSDT:'polygon', LTCUSDT:'litecoin', UNIUSDT:'uniswap'
  };
  async function loadFallback(){
    try{
      const ids = Object.values(coingeckoIds).join(',');
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
      const json = await res.json();
      for(const [sym,id] of Object.entries(coingeckoIds)){
        const d = json[id];
        if (!d) continue;
        state[sym].price = d.usd;
        state[sym].chg = d.usd_24h_change || 0;
      }
      render();
    }catch(e){
      console.warn('CoinGecko fallback error', e);
    }
  }

  // Try Binance WS first
  function openWS(){
    const streams = symbols.map(s => s.toLowerCase()+'@ticker').join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    ws.onopen = () => {
      // also first paint from fallback to avoid blank
      loadFallback();
    };
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (!data || !data.data) return;
      const t = data.data; // 24hr ticker
      const s = t.s;
      const last = parseFloat(t.c);
      const chg = parseFloat(t.P); // percent
      if (!Number.isFinite(last)) return;
      state[s] = {price:last, chg: Number.isFinite(chg)? chg : 0};
      // update minimal DOM (only first group)
      const node = elTrack.querySelector(`.ti[data-symbol="${s}"]`);
      if (node){
        node.classList.toggle('up', chg>=0);
        node.classList.toggle('down', chg<0);
        node.innerHTML = `<b>${s.replace('USDT','')}</b><span>$${last.toLocaleString()}</span><span class="chg">${chg>=0?'+':''}${(chg||0).toFixed(2)}%</span>`;
      }
    };
    ws.onerror = () => { ws.close(); };
    ws.onclose = () => {
      // fallback polling if WS fails
      loadFallback();
      setInterval(loadFallback, 15000);
    };
  }

  render();
  openWS();
})();

/* ===== CRYPTO NEWS (take 4 newest) ===== */
(async () => {
  const list = $('#news-list');
  if (!list) return;

  const FEEDS = [
    'https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml',
    'https://cointelegraph.com/rss',
    'https://www.theblock.co/rss'
  ];

  // Use AllOrigins to bypass CORS
  async function fetchFeed(url){
    const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
    const res = await fetch(proxy);
    if (!res.ok) throw new Error('Feed error');
    return res.text();
  }

  function parseRSS(xml){
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const items = [...doc.querySelectorAll('item')].map(it => ({
      title: it.querySelector('title')?.textContent?.trim() || '',
      link: it.querySelector('link')?.textContent?.trim() || '',
      pubDate: new Date(it.querySelector('pubDate')?.textContent || Date.now()),
      source: doc.querySelector('channel > title')?.textContent || 'RSS'
    }));
    return items;
  }

  async function loadNews(){
    list.innerHTML = '';
    try{
      const results = (await Promise.allSettled(FEEDS.map(fetchFeed)))
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .flatMap(parseRSS);

      // sort by date desc, unique by link/title, then top 4
      const seen = new Set();
      const sorted = results
        .sort((a,b)=> b.pubDate - a.pubDate)
        .filter(it => {
          const key = it.link || it.title;
          if (seen.has(key)) return false;
          seen.add(key); return true;
        })
        .slice(0,4);

      if (sorted.length === 0) throw new Error('No items');

      for (const it of sorted){
        const card = document.createElement('article');
        card.className = 'news-card';
        const time = it.pubDate instanceof Date ? it.pubDate.toLocaleString() : '';
        card.innerHTML = `
          <a href="${it.link}" target="_blank" rel="noopener">
            <h4>${it.title}</h4>
          </a>
          <div class="news-meta"><span>${it.source}</span> • <time>${time}</time></div>
        `;
        list.appendChild(card);
      }
    }catch(e){
      console.warn('News error', e);
      list.innerHTML = `<div class="card"><p class="muted">Không tải được tin. Vui lòng thử lại.</p></div>`;
    }
  }

  $('#btnReloadNews')?.addEventListener('click', loadNews);
  loadNews();
})();
