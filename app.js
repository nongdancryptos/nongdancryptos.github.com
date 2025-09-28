// Theme handling
const root = document.documentElement;
const label = document.getElementById('themeLabel');
const btn = document.getElementById('themeToggle');

function setTheme(mode){
  root.setAttribute('data-theme', mode);
  try { localStorage.setItem('theme', mode); } catch {}
  if (label) label.textContent = mode === 'dark' ? 'Dark' : 'Light';
}
function getSystemPrefers(){
  return matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function initTheme(){
  const saved = (()=>{ try { return localStorage.getItem('theme'); } catch { return null; } })();
  setTheme(saved || getSystemPrefers());
}
function toggleTheme(){
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  setTheme(next);
}

btn?.addEventListener('click', toggleTheme);
initTheme();

// Update year
const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

// Optional: listen system change & sync if user chưa chọn thủ công
try {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener?.('change', e => {
    const saved = localStorage.getItem('theme');
    if (!saved) setTheme(e.matches ? 'dark' : 'light');
  });
} catch {}
