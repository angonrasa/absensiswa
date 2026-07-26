import { openDB } from "../../src/database/db.js";
import { ScheduleRepository } from "../../src/modules/schedule/schedule.repository.js";
import { ClassRepository } from "../../src/modules/class/class.repository.js";
import { StudentRepository } from "../../src/modules/student/student.repository.js";
import { AttendanceRepository } from "../../src/modules/attendance/attendance.repository.js";
import { toDateKey } from "../../src/core/date.js";
import { AppBar, Card, Badge, FloatingButton } from "../../src/components/components.js";
import { runPage } from "../../src/core/pageState.js";
import { escapeHtml } from "../../src/core/html.js";

const scheduleRepo = new ScheduleRepository();
const classRepo = new ClassRepository();
const studentRepo = new StudentRepository();
const attendanceRepo = new AttendanceRepository();

const app = document.getElementById("app");

function formatFullDate(date = new Date()) {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Ringkasan sederhana (Milestone 8): total siswa, hadir hari ini, tidak hadir
 * hari ini, persentase kehadiran. Dihitung langsung dari data, tidak disimpan.
 *
 * `todaysScheduledClassIds` membatasi sesi yang dihitung hanya untuk kelas yang
 * memang berjadwal hari ini. Tanpa ini, sesi absensi lama tetap ikut terhitung
 * meski jadwalnya sudah dipindah ke hari lain (sesi bertanggal "hari ini" tidak
 * otomatis terhapus/dipindah kalau jadwalnya diedit — lihat 01-Arsitektur-Pendamping.md),
 * sehingga statistik bisa menampilkan angka padahal "Jadwal Hari Ini" kosong.
 */
async function computeTodayStats(dateKey, todaysScheduledClassIds) {
  const classes = await classRepo.getAll();
  const studentLists = await Promise.all(classes.map((c) => studentRepo.getByClass(c.id)));
  const totalStudents = studentLists.reduce((sum, list) => sum + list.length, 0);

  const sessions = (await attendanceRepo.getSessionsByDate(dateKey)).filter((s) =>
    todaysScheduledClassIds.has(s.classId)
  );
  const recordLists = await Promise.all(sessions.map((s) => attendanceRepo.getRecordsBySession(s.id)));
  const allRecordsToday = recordLists.flat();
  const summary = attendanceRepo.buildSummary(allRecordsToday);

  const hadirHariIni = summary.present;
  const tidakHadirHariIni = summary.permission + summary.sick + summary.absent;
  const totalTercatat = hadirHariIni + tidakHadirHariIni;
  const persentase = totalTercatat > 0 ? Math.round((hadirHariIni / totalTercatat) * 100) : null;

  return { totalStudents, hadirHariIni, tidakHadirHariIni, persentase };
}

function renderStatsStrip(stats) {
  const grid = document.createElement("div");
  grid.className = "home-stats-grid";

  const items = [
    { label: "Total Siswa", value: stats.totalStudents },
    { label: "Hadir Hari Ini", value: stats.hadirHariIni },
    { label: "Tidak Hadir", value: stats.tidakHadirHariIni },
    { label: "% Kehadiran", value: stats.persentase === null ? "-" : `${stats.persentase}%` },
  ];

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "home-stat-card";
    card.innerHTML = `<span class="home-stat-card__value">${item.value}</span><span class="home-stat-card__label">${item.label}</span>`;
    grid.appendChild(card);
  });

  return grid;
}

async function render() {
  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Beranda" }));

  const nav = document.createElement("div");
  nav.className = "home-nav";
  nav.innerHTML = `<a href="../master-data/index.html">Data Master →</a><a href="../history/index.html">Riwayat →</a><a href="../settings/index.html">Pengaturan →</a>`;
  app.appendChild(nav);

  const main = document.createElement("main");

  const dateEl = document.createElement("div");
  dateEl.className = "home-date";
  dateEl.textContent = formatFullDate();
  main.appendChild(dateEl);

  const today = new Date();
  const dateKey = toDateKey(today);

  const schedules = await scheduleRepo.getToday(today);
  const todaysScheduledClassIds = new Set(schedules.map((s) => s.classId));

  const stats = await computeTodayStats(dateKey, todaysScheduledClassIds);
  main.appendChild(renderStatsStrip(stats));

  const heading = document.createElement("h1");
  heading.className = "home-heading";
  heading.textContent = "Jadwal Hari Ini";
  main.appendChild(heading);

  if (schedules.length === 0) {
    const empty = document.createElement("div");
    empty.className = "home-empty";

    const message = document.createElement("p");
    message.className = "home-empty__message";
    message.textContent = "Tidak ada jadwal hari ini.";
    empty.appendChild(message);

    const weekLink = document.createElement("a");
    weekLink.className = "home-empty__link";
    weekLink.href = "../master-data/index.html?tab=schedule";
    weekLink.textContent = "Lihat jadwal seminggu →";
    empty.appendChild(weekLink);

    main.appendChild(empty);
    app.appendChild(main);
    return;
  }

  const classes = await classRepo.getAll();
  const classById = Object.fromEntries(classes.map((c) => [c.id, c]));

  const list = document.createElement("div");
  list.className = "schedule-list";

  let firstUnattended = null;

  for (const sch of schedules) {
    const cls = classById[sch.classId];
    const session = await attendanceRepo.findSession(sch.classId, dateKey);
    if (!session && !firstUnattended) firstUnattended = sch;

    const row = document.createElement("div");
    row.className = "schedule-row";
    row.innerHTML = `
      <div class="schedule-time">
        <span>${escapeHtml(sch.startTime)}</span>
        <span class="schedule-time__end">${escapeHtml(sch.endTime)}</span>
      </div>
      <div class="schedule-main">
        <span class="schedule-subject">${escapeHtml(sch.subject)}</span>
        <span class="schedule-class">${cls ? escapeHtml(cls.name) : "Kelas tidak ditemukan"}</span>
      </div>
    `;
    row.appendChild(
      Badge({
        status: session ? "present" : null,
        label: session ? "Sudah Diabsen" : "Belum Diabsen",
      })
    );

    const card = Card({
      content: row,
      pressable: true,
      onClick: () => {
        window.location.href = `../attendance/index.html?classId=${sch.classId}&scheduleId=${sch.id}`;
      },
    });
    list.appendChild(card);
  }

  main.appendChild(list);
  app.appendChild(main);

  // Shortcut: langsung ke kelas pertama yang belum diabsen hari ini.
  if (firstUnattended) {
    app.appendChild(
      FloatingButton({
        icon: "✓",
        onClick: () => {
          window.location.href = `../attendance/index.html?classId=${firstUnattended.classId}&scheduleId=${firstUnattended.id}`;
        },
      })
    );
  }
}

async function main() {
  await openDB();
  await runPage(app, render);
}

main();
