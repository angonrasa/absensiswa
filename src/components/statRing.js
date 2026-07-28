/*
  src/components/statRing.js
  Milestone R3 — Komponen Ring Statistik (lihat 05-Roadmap-Redesign-UIUX.md)

  Satu tanggung jawab: merender grup kartu statistik (1 hero ring % kehadiran
  + 3 kartu mini). Modul ini TIDAK menghitung apa pun — angka dikirim dari
  luar. Penyambungan ke computeTodayStats() yang asli (di home.js) baru
  terjadi di Milestone R4.1, bukan di sini.

  Mengikuti pola components.js: tanpa dependency eksternal, setiap fungsi
  mengembalikan HTMLElement.
*/

const RING_RADIUS = 38;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ringSvgMarkup(pct) {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const offset = RING_CIRCUMFERENCE - (clamped / 100) * RING_CIRCUMFERENCE;
  return `<svg width="88" height="88" viewBox="0 0 88 88">
    <circle cx="44" cy="44" r="${RING_RADIUS}" stroke="rgba(255,255,255,0.25)" stroke-width="7" fill="none"/>
    <circle cx="44" cy="44" r="${RING_RADIUS}" stroke="#ffffff" stroke-width="7" fill="none"
      stroke-dasharray="${RING_CIRCUMFERENCE}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
  </svg>`;
}

function StatMini({ value, label, variant }) {
  const card = document.createElement("div");
  card.className = `stat-mini${variant ? ` stat-mini--${variant}` : ""}`;

  const num = document.createElement("span");
  num.className = "stat-mini__num";
  num.textContent = String(value);
  card.appendChild(num);

  const lbl = document.createElement("span");
  lbl.className = "stat-mini__lbl";
  lbl.textContent = label;
  card.appendChild(lbl);

  return card;
}

function StatHero(percent, belumAdaSesi) {
  const hasPercent = percent !== null && percent !== undefined && !Number.isNaN(percent);
  const pctValue = hasPercent ? Math.round(percent) : 0;

  const hero = document.createElement("div");
  hero.className = "stat-hero";

  const ringWrap = document.createElement("div");
  ringWrap.className = "stat-hero__ring-wrap";
  ringWrap.innerHTML = ringSvgMarkup(pctValue);

  const label = document.createElement("div");
  label.className = "stat-hero__ring-label";

  const pctEl = document.createElement("span");
  pctEl.className = "stat-hero__pct";
  pctEl.textContent = hasPercent ? String(pctValue) : "–";
  label.appendChild(pctEl);

  const symEl = document.createElement("span");
  symEl.className = "stat-hero__sym";
  symEl.textContent = "persen";
  label.appendChild(symEl);

  ringWrap.appendChild(label);
  hero.appendChild(ringWrap);

  const cap = document.createElement("div");
  cap.className = "stat-hero__cap";
  // Hotfix 1.0.1 — Isu 1: bedakan "belum ada absensi hari ini" dari hasil
  // 0%, supaya tidak terbaca seperti data hilang saat ganti hari.
  cap.textContent = belumAdaSesi ? "Belum ada absensi hari ini" : "% Kehadiran";
  hero.appendChild(cap);

  return hero;
}

/**
 * Merender grup kartu statistik: 1 hero (ring % kehadiran) + 3 mini.
 * Boleh dipanggil dengan angka contoh (belum tersambung data asli) — sesuai
 * Definition of Done Milestone R3.
 *
 * @param {Object} stats
 * @param {number|null} [stats.percent]      - persen kehadiran (0-100). null/undefined -> "–"
 * @param {number} [stats.hadirHariIni]
 * @param {number} [stats.tidakHadir]
 * @param {number} [stats.totalSiswa]
 * @returns {HTMLElement}
 */
export function StatCardGroup({ percent = null, hadirHariIni = 0, tidakHadir = 0, totalSiswa = 0 } = {}) {
  const grid = document.createElement("div");
  grid.className = "stats";

  // Hotfix 1.0.1 — Isu 1: percent null berarti belum ada satu sesi pun
  // tercatat hari ini (bukan "0% kehadiran"). Kartu Hadir/Tidak Hadir ikut
  // menampilkan "–" di kondisi ini, supaya tidak terbaca sebagai kehadiran
  // nol orang. "Total Siswa" tidak terpengaruh — itu jumlah siswa
  // terdaftar, selalu valid berapa pun harinya.
  const belumAdaSesi = percent === null || percent === undefined;

  grid.appendChild(StatHero(percent, belumAdaSesi));
  grid.appendChild(
    StatMini({ value: belumAdaSesi ? "–" : hadirHariIni, label: "Hadir Hari Ini", variant: "hadir" })
  );
  grid.appendChild(StatMini({ value: belumAdaSesi ? "–" : tidakHadir, label: "Tidak Hadir", variant: "absen" }));

  const totalCard = StatMini({ value: totalSiswa, label: "Total Siswa" });
  totalCard.style.gridColumn = "2 / 4";
  grid.appendChild(totalCard);

  return grid;
}
