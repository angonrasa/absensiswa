import { openDB } from "../../src/database/db.js";
import { AppBar, BottomNav } from "../../src/components/components.js";
import { runPage } from "../../src/components/pageState.js";

const app = document.getElementById("app");

// Versi ditulis manual di sini (halaman statis murni, tidak ada sumber versi
// terpusat lain di aplikasi ini). Perbarui nilai ini setiap rilis publik baru.
// Catatan: ini TIDAK terkait dengan DB_VERSION di src/database/db.js —
// itu murni internal IndexedDB (naik hanya kalau ada store/index baru),
// sedangkan ini adalah nomor versi yang dilihat guru.
const APP_VERSION = "1.1.0";

function render() {
  app.innerHTML = "";

  const backBtn = document.createElement("button");
  backBtn.className = "appbar__action";
  backBtn.setAttribute("aria-label", "Kembali ke Pengaturan");
  backBtn.textContent = "←";
  backBtn.addEventListener("click", () => {
    window.location.href = "../settings/index.html";
  });

  app.appendChild(AppBar({ title: "Tentang", leftAction: backBtn }));
  app.appendChild(BottomNav({ active: "pengaturan" }));

  const main = document.createElement("main");

  const hero = document.createElement("div");
  hero.className = "about-hero";
  hero.innerHTML = `
    <div class="about-hero__icon" aria-hidden="true">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
        <path d="M9 3.5h6a1 1 0 0 1 1 1V6h1.5A1.5 1.5 0 0 1 19 7.5v13A1.5 1.5 0 0 1 17.5 22h-11A1.5 1.5 0 0 1 5 20.5v-13A1.5 1.5 0 0 1 6.5 6H8V4.5a1 1 0 0 1 1-1Z"
          stroke="#fff" stroke-width="1.6" stroke-linejoin="round" />
        <circle cx="12" cy="4.5" r="1" fill="#fff" />
        <path d="M8.2 10.5h5.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
        <path d="M8.2 13.2h4" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
        <path d="M8.5 17.3l2.3 2.3 4.7-4.9" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <h3 class="about-hero__title">Teacher Attendance Companion</h3>
    <span class="about-hero__version">Versi ${APP_VERSION}</span>
  `;
  main.appendChild(hero);

  const body = document.createElement("div");
  body.className = "about-body";
  body.innerHTML = `
    Pendamping guru sebelum pembelajaran dimulai — absensi selesai kurang dari
    30 detik, riwayat kehadiran siswa terbentuk otomatis.
    <br><br>
    Seluruh data tersimpan lokal di perangkat. Gunakan <strong>Backup &amp; Restore</strong>
    di Pengaturan untuk menyimpan salinan data.
    <br><br>
    Dibuat untuk dipakai sendiri oleh guru, bukan aplikasi administrasi sekolah.
  `;
  main.appendChild(body);

  const credit = document.createElement("div");
  credit.className = "about-credit";
  credit.textContent = "Dibuat oleh M. Novi Irkhami — Angon Rasa";
  main.appendChild(credit);

  app.appendChild(main);
}

async function main() {
  await openDB();
  await runPage(app, render);
}

main();
