export function primeInkPath() {
  const splash = document.getElementById('splash');
  const path = splash.querySelector('.ink');
  const len = path.getTotalLength();
  path.style.strokeDasharray = len;
  path.style.strokeDashoffset = len;

  // Class ini yang memicu semua animasi (lihat splash.css, aturan
  // #splash.is-ready ...). Baru ditambahkan SETELAH panjang path asli
  // terpasang, supaya tidak ada celah waktu di mana goresan sempat
  // kelihatan dengan nilai placeholder sebelum digambar ulang.
  splash.classList.add('is-ready');
}

export function hideSplash() {
  const el = document.getElementById('splash');
  el.style.transition = 'opacity 300ms ease';
  el.style.opacity = '0';
  setTimeout(() => el.remove(), 300);
}