import { openDB } from "../../src/database/db.js";
import { ClassRepository } from "../../src/modules/class/class.repository.js";
import { StudentRepository } from "../../src/modules/student/student.repository.js";
import { ScheduleRepository } from "../../src/modules/schedule/schedule.repository.js";
import { SettingsRepository } from "../../src/modules/settings/settings.repository.js";
import { computeSetupChecklist } from "../../src/core/setupChecklist.js";
import { runPage } from "../../src/core/pageState.js";

const classRepo = new ClassRepository();
const studentRepo = new StudentRepository();
const scheduleRepo = new ScheduleRepository();
const settingsRepo = new SettingsRepository();

const app = document.getElementById("app");

function goHome() {
  window.location.href = "../home/index.html";
}

async function skipOnboarding() {
  await settingsRepo.setHasSeenOnboarding(true);
  goHome();
}

async function render() {
  app.innerHTML = "";

  const screen = document.createElement("div");
  screen.className = "welcome";

  // --- Skip di pojok atas ---
  const skipTop = document.createElement("button");
  skipTop.type = "button";
  skipTop.className = "welcome__skip";
  skipTop.textContent = "Nanti saja";
  skipTop.addEventListener("click", skipOnboarding);
  screen.appendChild(skipTop);

  // --- R8.1 — hero ilustrasi, dibangun dari kosakata visual aplikasi sendiri
  // (kartu absensi + centang), bukan clip-art generik. Sesuai mockup-onboarding-1.html. ---
  const hero = document.createElement("div");
  hero.className = "welcome__hero";
  hero.setAttribute("aria-hidden", "true");
  hero.innerHTML = `
    <div class="welcome__blob"></div>
    <div class="welcome__clock">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8.5" stroke="#0B3D3A" stroke-width="1.8" />
        <path d="M12 7.5v4.5l3 2" stroke="#0B3D3A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <div class="welcome__card">
      <div class="welcome__card-top">
        <div class="welcome__avatar"></div>
        <div class="welcome__line" style="width:70%"></div>
      </div>
      <div class="welcome__row">
        <div class="welcome__tick">✓</div>
        <div class="welcome__bar" style="width:80%"></div>
      </div>
      <div class="welcome__row">
        <div class="welcome__tick">✓</div>
        <div class="welcome__bar" style="width:60%"></div>
      </div>
      <div class="welcome__row welcome__row--pending">
        <div class="welcome__tick welcome__tick--pending"></div>
        <div class="welcome__bar" style="width:70%"></div>
      </div>
    </div>
    <div class="welcome__check">✓</div>
  `;
  screen.appendChild(hero);

  const headline = document.createElement("div");
  headline.className = "welcome__headline";
  headline.innerHTML = `
    <h2>Selamat datang 👋</h2>
    <p>Absensi selesai kurang dari <strong>30 detik</strong>,<br />riwayat siswa tersimpan otomatis.</p>
  `;
  screen.appendChild(headline);

  const prepLabel = document.createElement("div");
  prepLabel.className = "welcome__prep-label";
  prepLabel.textContent = "Sebelum mulai, siapkan data berikut:";
  screen.appendChild(prepLabel);

  // --- R8.2 — checklist dari data asli, fungsi hitung SAMA PERSIS dengan
  // yang dipakai empty state Beranda (R4.3), bukan logika baru. ---
  const [classCount, studentCount, scheduleCount] = await Promise.all([
    classRepo.getAll().then((list) => list.length),
    studentRepo.getAll().then((list) => list.length),
    scheduleRepo.getAll().then((list) => list.length),
  ]);
  const checklist = computeSetupChecklist({ classCount, studentCount, scheduleCount });

  const checklistEl = document.createElement("div");
  checklistEl.className = "welcome__checklist";
  checklist.forEach((step) => {
    const row = document.createElement("div");
    row.className = `welcome__check-row ${step.done ? "is-done" : "is-todo"}`;

    const dot = document.createElement("div");
    dot.className = "welcome__dot";
    dot.textContent = step.done ? "✓" : "";
    row.appendChild(dot);

    const label = document.createElement("div");
    label.className = "welcome__check-label";
    label.textContent = step.label;
    row.appendChild(label);

    checklistEl.appendChild(row);
  });
  screen.appendChild(checklistEl);

  // --- R8.3 — aksi utama ---
  const actions = document.createElement("div");
  actions.className = "welcome__actions";

  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "welcome__cta-primary";
  startBtn.textContent = "Mulai Setup";
  startBtn.addEventListener("click", () => {
    // Wizard 3 langkah dibangun di R9 — link ini akan aktif setelah itu.
    window.location.href = "../onboarding-wizard/index.html";
  });
  actions.appendChild(startBtn);

  const skipBottom = document.createElement("button");
  skipBottom.type = "button";
  skipBottom.className = "welcome__cta-ghost";
  skipBottom.textContent = "Nanti saja";
  skipBottom.addEventListener("click", skipOnboarding);
  actions.appendChild(skipBottom);

  screen.appendChild(actions);
  app.appendChild(screen);
}

async function main() {
  await openDB();
  await runPage(app, render);
}

main();
