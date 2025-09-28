// ===== Helpers =====
const $ = (q) => document.querySelector(q);

// Year in footer
$("#y") && ($("#y").textContent = new Date().getFullYear());

/* =========================================================
   REAL-TIME TICKER (Top 20) – CoinGecko, refresh mỗi 60s
   ========================================================= */
const TICKER_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&price_change_percentage=1h,24h";

const tickerTrack = document.getElementById("ticker-track");

function renderTicker(coins) {
  const items = coins
    .map((c) => {
      const chg = Number(c.price_change_percentage_24h || 0).toFixed(2);
      const cls = chg >= 0 ? "up" : "down";
      const price = "$" + Number(c.current_price).toLocaleString();
      return `<span class="badge">
          <img src="${c.image}" alt="${c.symbol}" width="18" height="18" loading="lazy"/>
          <b>${c.symbol.toUpperCase()}</b> <span>${price}</span>
          <span class="chg ${cls}">${chg}%</span>
        </span>`;
    })
    .join("");

  tickerTrack.innerHTML = items + items; // nhân đôi cho hiệu ứng marquee mượt
}

async function loadTicker() {
  try {
    const res = await fetch(TICKER_URL, { cache: "no-store" });
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("invalid");
    renderTicker(data);
  } catch (e) {
    console.error("Ticker error:", e);
    tickerTrack.innerHTML =
      '<span class="badge">Không tải được giá. Thử lại sau.</span>';
  }
}
loadTicker();
setInterval(loadTicker, 60_000);

/* =========================================================
   CRYPTO NEWS – chỉ hiện 4 tin hot & mới nhất
   Nguồn chính: CryptoCompare (CORS OK)
   Fallback: CoinDesk RSS qua allorigins
   ========================================================= */
const NEWS_LIMIT = 4;

const newsList = document.getElementById("news-list");
const reloadNewsBtn = document.getElementById("reload-news");

const CC_URL = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN";
const COINDESK_RSS =
  "https://api.allorigins.win/raw?url=" +
  encodeURIComponent("https://www.coindesk.com/arc/outboundfeeds/rss/");

function newsCard({ title, url, image, source, date, description }) {
  const img =
    image ||
    "https://dummyimage.com/800x450/0b1220/ffffff&text=Crypto+News";
  const dt = date ? new Date(date).toLocaleString() : "";
  const desc = description ? description.slice(0, 180) + "…" : "";
  return `
    <article class="news">
      <img class="thumb" src="${img}" alt="${source}" loading="lazy" />
      <div class="inner">
        <h3>${title}</h3>
        <p>${desc}</p>
        <div class="meta"><span>${source}</span><span>${dt}</span></div>
        <a class="read" href="${url}" target="_blank" rel="noopener">Đọc bài →</a>
      </div>
    </article>
  `;
}

async function fetchCryptoCompare() {
  const res = await fetch(CC_URL, { cache: "no-store" });
  const json = await res.json();
  if (!json?.Data) throw new Error("CC empty");
  return json.Data.map((n) => ({
    title: n.title,
    url: n.url,
    image: n.imageurl,
    source: n.source_info?.name || "CryptoCompare",
    date: n.published_on * 1000,
    description: n.body,
  }));
}

async function fetchCoinDesk() {
  const res = await fetch(COINDESK_RSS, { cache: "no-store" });
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const items = [...doc.querySelectorAll("item")];
  return items.map((it) => ({
    title: it.querySelector("title")?.textContent ?? "Untitled",
    url: it.querySelector("link")?.textContent ?? "#",
    image: null,
    source: "CoinDesk",
    date: it.querySelector("pubDate")
      ? new Date(it.querySelector("pubDate").textContent)
      : null,
    description: it.querySelector("description")?.textContent ?? "",
  }));
}

async function loadNews() {
  try {
    newsList.innerHTML =
      '<div class="card glass"><p class="muted">Đang tải tin tức…</p></div>';

    // Lấy news (CC -> fallback CoinDesk)
    let data = [];
    try {
      data = await fetchCryptoCompare();
    } catch {
      data = await fetchCoinDesk();
    }

    if (!data.length) throw new Error("no news");

    // Sắp xếp theo thời gian mới nhất, lấy đúng 4 tin
    const top4 = data
      .filter((n) => n.date) // có thời gian
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, NEWS_LIMIT);

    newsList.innerHTML = top4.map(newsCard).join("");
  } catch (e) {
    console.error(e);
    newsList.innerHTML =
      '<div class="card glass"><p class="muted">Không tải được tin tức. Thử lại sau.</p></div>';
  }
}
loadNews();
reloadNewsBtn?.addEventListener("click", loadNews);
