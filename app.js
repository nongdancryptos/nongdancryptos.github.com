/* ===== Helpers & State ===== */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const state = {
  allProducts: [],
  visibleCount: 8,
  filter: 'all',
  sort: 'popular'
};

/* ===== DATA: Thay bằng link của bạn khi có sản phẩm cụ thể ===== */
const MOCK = [
  {
    id: 1,
    title: "MMO — Toolkit Starter",
    category: "mmo",
    price: 0,
    oldPrice: null,
    likes: 620,
    views: 9200,
    badge: "Free",
    img: "https://github.com/nongdancryptos/nongdancryptos/raw/main/QR-Code/Binance-Pay-QR.jpg",
    url: "https://nongdancryptos.github.io"
  },
  {
    id: 2,
    title: "Bot Script — Auto Tasks v1",
    category: "bot",
    price: 9.9,
    oldPrice: 19.9,
    likes: 350,
    views: 7800,
    badge: "Sale",
    img: "https://github.com/nongdancryptos/nongdancryptos/raw/main/images/Developer.gif",
    url: "https://telegram.me/TieuPhuOnTop"
  },
  {
    id: 3,
    title: "Web Scraping — Starter Guide",
    category: "scraping",
    price: 0,
    oldPrice: null,
    likes: 280,
    views: 6100,
    badge: "Guide",
    img: "https://github.com/nongdancryptos/nongdancryptos/raw/main/images/marquee.svg",
    url: "https://github.com/nongdancryptos"
  },
  {
    id: 4,
    title: "Blockchain — Basic Ops",
    category: "blockchain",
    price: 14.9,
    oldPrice: 24.9,
    likes: 210,
    views: 5200,
    badge: "New",
    img: "https://raw.githubusercontent.com/nongdancryptos/nongdancryptos/refs/heads/main/QR-Code/evm_wallet_qr.png",
    url: "https://x.com/OnTopAirdrop"
  },
  {
    id: 5,
    title: "Hướng dẫn — Setup môi trường",
    category: "guide",
    price: 0,
    oldPrice: null,
    likes: 160,
    views: 4200,
    badge: "Free",
    img: "https://github.com/nongdancryptos/nongdancryptos/raw/main/images/footer.svg",
    url: "mailto:nongdancryptos@gmail.com"
  },
  { id: 6, title: "Bot Script — Auto Check v2", category: "bot", price: 12.9, oldPrice: 19.9, likes: 190, views: 4800, badge:"Pro", img:"https://github.com/nongdancryptos/nongdancryptos/raw/main/images/Developer.gif", url:"https://telegram.me/TieuPhuOnTop" },
  { id: 7, title: "MMO — Tối ưu quy trình", category: "mmo", price: 7.9, oldPrice: 12.9, likes: 230, views: 5000, badge:"Tip", img:"https://github.com/nongdancryptos/nongdancryptos/raw/main/images/marquee.svg", url:"https://nongdancryptos.github.io" },
  { id: 8, title: "Blockchain — Wallet Safety", category: "blockchain", price: 0, oldPrice: null, likes: 260, views: 6200, badge:"Free", img:"https://raw.githubusercontent.com/nongdancryptos/nongdancryptos/refs/heads/main/QR-Code/sol_wallet_qr.png", url:"https://github.com/nongdancryptos" },
  { id: 9, title: "Web Scraping — Template", category:"scraping", price:5.9, oldPrice:9.9, likes:140, views:3000, badge:"Template", img:"https://raw.githubusercontent.com/nongdancryptos/nongdancryptos/refs/heads/main/QR-Code/btc_wallet_qr.png", url:"https://github.com/nongdancryptos" },
  { id:10, title: "Guide — FAQs & Tips", category:"guide", price:0, oldPrice:null, likes:120, views:2200, badge:"Note", img:"https://github.com/nongdancryptos/nongdancryptos/raw/main/images/footer.svg", url:"https://nongdancryptos.github.io" }
];

/* ===== Render ===== */
const grid = $('#productGrid');
function priceTemplate(p){
  if (p.price === 0) return `<span class="price">FREE</span>`;
  const cur = new Intl.NumberFormat('vi-VN', {style:'currency', currency:'USD', maximumFractionDigits:2}).format(p.price);
  const old = p.oldPrice ? `<s>${new Intl.NumberFormat('vi-VN',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(p.oldPrice)}</s>` : '';
  return `<span class="price">${cur}${old ? ' ' + old : ''}</span>`;
}
function cardTemplate(p){
  return `
    <article class="card">
      <a class="card__media" href="${p.url}" target="_blank" rel="noopener">
        ${p.badge ? `<span class="badge">${p.badge}</span>`:''}
        <img src="${p.img}" alt="${p.title}" loading="lazy">
      </a>
      <div class="card__body">
        <h3 class="card__title"><a href="${p.url}" target="_blank" rel="noopener">${p.title}</a></h3>
        <div class="card__meta">
          <span class="pill">👁 ${p.views.toLocaleString('vi-VN')}</span>
          <span class="pill">❤ ${p.likes.toLocaleString('vi-VN')}</span>
        </div>
      </div>
      <div class="card__foot">
        ${priceTemplate(p)}
        <div class="card__cta">
          <a class="icon-btn" href="${p.url}" target="_blank" rel="noopener">Xem</a>
          <a class="icon-btn icon-btn--primary" href="https://telegram.me/TieuPhuOnTop" target="_blank" rel="noopener">Telegram</a>
        </div>
      </div>
    </article>
  `;
}
function applyFilterSort(list){
  let out = [...list];
  if (state.filter !== 'all') out = out.filter(i => i.category === state.filter);
  switch (state.sort){
    case 'popular': out.sort((a,b)=> (b.views+b.likes) - (a.views+a.likes)); break;
    case 'new': out.sort((a,b)=> b.id - a.id); break;
    case 'price_asc': out.sort((a,b)=> (a.price ?? 0) - (b.price ?? 0)); break;
    case 'price_desc': out.sort((a,b)=> (b.price ?? 0) - (a.price ?? 0)); break;
  }
  return out;
}
function render(){
  const filtered = applyFilterSort(state.allProducts);
  const slice = filtered.slice(0, state.visibleCount);
  grid.innerHTML = slice.map(cardTemplate).join('');
  $('#loadMore').style.display = slice.length < filtered.length ? 'inline-flex' : 'none';
}

/* ===== Interactions ===== */
function initFilters(){
  $$('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.chip').forEach(c => c.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.filter = btn.dataset.filter;
      state.visibleCount = 8;
      render();
      window.scrollTo({top: $('#products').offsetTop - 90, behavior:'smooth'});
    });
  });
  $('#sortSelect').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('#loadMore').addEventListener('click', () => { state.visibleCount += 8; render(); });
}
function initNav(){
  const toggle = $('#navToggle'), list = $('#navList');
  toggle.addEventListener('click', () => list.classList.toggle('is-open'));
  $$('#navList a').forEach(a => a.addEventListener('click', ()=> list.classList.remove('is-open')));
}
function initStickyHeader(){ window.addEventListener('scroll', () => { document.body.classList.toggle('is-compact', (window.scrollY||0) > 10); }, {passive:true}); }

/* ===== Boot ===== */
document.addEventListener('DOMContentLoaded', () => {
  state.allProducts = MOCK;
  render(); initFilters(); initNav(); initStickyHeader();
});
