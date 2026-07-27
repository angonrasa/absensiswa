import { openDB } from "../../src/database/db.js";
import { AppBar } from "../../src/components/components.js";
import { runPage } from "../../src/core/pageState.js";

const app = document.getElementById("app");

// R6.2 — versi ditulis manual di sini (halaman statis murni, tidak ada
// sumber versi terpusat lain di aplikasi ini). Perbarui nilai ini saat
// versi MVP berganti.
const APP_VERSION = "MVP 1.0";

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

  const main = document.createElement("main");

  const hero = document.createElement("div");
  hero.className = "about-hero";
  hero.innerHTML = `
    <div class="about-hero__icon" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l2 2.5h7A1.5 1.5 0 0 1 20 9v8.5A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-11Z"
          stroke="#fff" stroke-width="2" stroke-linejoin="round" />
      </svg>
    </div>
    <h3 class="about-hero__title">Teacher Attendance Companion</h3>
    <span class="about-hero__version">${APP_VERSION}</span>
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
