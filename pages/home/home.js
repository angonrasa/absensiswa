import { openDB } from "../../src/database/db.js";
import { ScheduleRepository } from "../../src/modules/schedule/schedule.repository.js";
import { ClassRepository } from "../../src/modules/class/class.repository.js";
import { StudentRepository } from "../../src/modules/student/student.repository.js";
import { AttendanceRepository } from "../../src/modules/attendance/attendance.repository.js";
import { SettingsRepository } from "../../src/modules/settings/settings.repository.js";
import { toDateKey } from "../../src/core/date.js";
import { AppBar, BottomNav, Card, Badge, Button, FloatingButton, Modal, showToast } from "../../src/components/components.js";
import { StatCardGroup } from "../../src/components/statRing.js";
import { computeSetupChecklist, isSetupComplete } from "../../src/core/setupChecklist.js";
import { runPage } from "../../src/core/pageState.js";
import { escapeHtml } from "../../src/core/html.js";
import { deleteScheduleAndRelated } from "../../src/core/orphanCleanup.js";

const scheduleRepo = new ScheduleRepository();
const classRepo = new ClassRepository();
const studentRepo = new StudentRepository();
const attendanceRepo = new AttendanceRepository();
const settingsRepo = new SettingsRepository();

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

/**
 * R10.2 — tombol OPSIONAL yang membuka kembali Wizard (R9) dari step
 * pertama yang belum selesai. Wizard sendiri yang menghitung step awal
 * (lihat resolveStartingStep di wizard.js) dari data asli lewat
 * computeSetupChecklist yang sama (R10.1) — di sini cukup arahkan ke
 * halamannya, tidak ada logika "step mana" yang diduplikasi.
 *
 * PENTING (perbaikan bug): tombol ini TIDAK BOLEH jadi satu-satunya aksi
 * di empty state. Guru yang menekan "Lewati"/"Nanti saja" memilih untuk
 * TIDAK memakai wizard dulu — kalau satu-satunya tombol yang tersedia
 * setelah itu justru membuka wizard lagi (dan karena data masih 0/0/0,
 * wizard itu mulai dari Step 1), rasanya seperti "Lewati" tidak berefek /
 * selalu kembali ke wizard dari awal. Karena itu selalu ditampilkan
 * berdampingan dengan jalur langsung ke Data Master (lihat pemanggilnya).
 */

function ContinueSetupButton(variant = "primary") {
  return Button({
    label: "Lanjutkan pakai Wizard →",
    variant,
    onClick: () => {
      window.location.href = "../onboarding-wizard/index.html";
    },
  });
}

/**
 * Milestone R4.3 — empty state penuh (belum ada kelas sama sekali), menampilkan
 * stepper 4 langkah, dihitung dari data asli. Karena Student/Schedule berelasi
 * FK ke Class (lihat 02-Data-Model-Pendamping.md), kalau classCount === 0 maka
 * studentCount dan scheduleCount pasti juga 0 — tidak perlu query tambahan.
 *
 * R10.2 — menambahkan opsi "Lanjutkan pakai Wizard →" di SAMPING (bukan
 * menggantikan) CTA langsung ke Data Master. Guru yang sampai di sini
 * sudah pasti pernah pilih "Nanti saja" (kalau belum, main() sudah
 * mengarahkan ke Welcome duluan) — CTA langsung tetap harus ada supaya
 * pilihan "Nanti saja" itu benar-benar berarti "boleh isi manual, tanpa
 * wizard", bukan dipaksa balik ke wizard.
 */
function renderSetupEmptyState() {
  const checklist = computeSetupChecklist({ classCount: 0, studentCount: 0, scheduleCount: 0 });

  const wrap = document.createElement("div");
  wrap.className = "setup-empty";

  const icon = document.createElement("div");
  icon.className = "setup-empty__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6h1.5A1.5 1.5 0 0 1 19 7.5v13A1.5 1.5 0 0 1 17.5 22h-11A1.5 1.5 0 0 1 5 20.5v-13A1.5 1.5 0 0 1 6.5 6H8V4.5a1 1 0 0 1 1-1Z"
        stroke="#fff" stroke-width="1.6" stroke-linejoin="round" />
      <circle cx="12" cy="4.5" r="1" fill="#fff" />
      <path d="M8.2 10.5h5.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
      <path d="M8.2 13.2h4" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
      <path d="M8.5 17.3l2.3 2.3 4.7-4.9" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
  wrap.appendChild(icon);

  const title = document.createElement("h3");
  title.className = "setup-empty__title";
  title.textContent = "Belum ada kelas untuk diabsen";
  wrap.appendChild(title);

  const desc = document.createElement("p");
  desc.className = "setup-empty__desc";
  desc.textContent =
    "Tambahkan tahun ajaran, kelas, dan siswa dulu di Data Master. Jadwal hari ini akan muncul otomatis setelah itu.";
  wrap.appendChild(desc);

  const actions = document.createElement("div");
  actions.className = "setup-empty__actions";
  actions.appendChild(
    Button({
      label: "Mulai isi Data Master →",
      variant: "primary",
      onClick: () => {
        window.location.href = "../master-data/index.html";
      },
    })
  );
  actions.appendChild(ContinueSetupButton("ghost"));
  wrap.appendChild(actions);

  const stepper = document.createElement("div");
  stepper.className = "stepper";

  checklist.forEach((step, index) => {
    const row = document.createElement("div");
    row.className = `step-row${step.done ? " step-row--done" : ""}`;

    const chip = document.createElement("div");
    chip.className = "step-chip";
    chip.textContent = step.done ? "✓" : String(index + 1);
    row.appendChild(chip);

    const text = document.createElement("div");
    text.className = "step-text";

    const t = document.createElement("div");
    t.className = "step-text__title";
    t.textContent = step.label;
    text.appendChild(t);

    const s = document.createElement("div");
    s.className = "step-text__sub";
    s.textContent = step.sub;
    text.appendChild(s);

    row.appendChild(text);
    stepper.appendChild(row);
  });

  wrap.appendChild(stepper);
  return wrap;
}

async function render() {
  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Beranda" }));
  app.appendChild(BottomNav({ active: "beranda" }));

  const main = document.createElement("main");

  const dateEl = document.createElement("div");
  dateEl.className = "home-date";
  dateEl.textContent = formatFullDate();
  main.appendChild(dateEl);

  const today = new Date();
  const dateKey = toDateKey(today);

  // R4.3: belum ada kelas sama sekali -> empty state + stepper (bukan
  // "Tidak ada jadwal hari ini" biasa, itu untuk kasus data sudah ada tapi
  // memang tidak ada jadwal hari ini, misal weekend).
  const classes = await classRepo.getAll();
  if (classes.length === 0) {
    main.appendChild(renderSetupEmptyState());
    app.appendChild(main);
    return;
  }

  const schedules = await scheduleRepo.getToday(today);
  const todaysScheduledClassIds = new Set(schedules.map((s) => s.classId));

  const stats = await computeTodayStats(dateKey, todaysScheduledClassIds);
  main.appendChild(
    StatCardGroup({
      percent: stats.persentase,
      hadirHariIni: stats.hadirHariIni,
      tidakHadir: stats.tidakHadirHariIni,
      totalSiswa: stats.totalStudents,
    })
  );

  const heading = document.createElement("h1");
  heading.className = "home-heading";
  heading.textContent = "Jadwal Hari Ini";
  main.appendChild(heading);

  if (schedules.length === 0) {
    const empty = document.createElement("div");
    empty.className = "home-empty";

    // R10.2 — "Tidak ada jadwal hari ini" bisa berarti dua hal: memang tidak
    // ada jadwal hari ini (mis. weekend, setup sudah lengkap) atau setup
    // belum lengkap sama sekali (kelas sudah ada tapi belum ada siswa/jadwal
    // sama sekali di kelas manapun). Dibedakan lewat checklist yang sama
    // dengan Welcome/empty-state-penuh (R10.1), bukan aturan baru.
    const [studentCount, scheduleCount] = await Promise.all([
      studentRepo.getAll().then((list) => list.length),
      scheduleRepo.getAll().then((list) => list.length),
    ]);
    const checklist = computeSetupChecklist({ classCount: classes.length, studentCount, scheduleCount });

    if (!isSetupComplete({ classCount: classes.length, studentCount, scheduleCount })) {
      const message = document.createElement("p");
      message.className = "home-empty__message";
      message.textContent = "Setup awal belum lengkap, jadi belum ada jadwal yang bisa ditampilkan.";
      empty.appendChild(message);

      const actions = document.createElement("div");
      actions.className = "home-empty__actions";

      // Bug fix: sediakan jalur langsung ke Data Master juga, bukan cuma
      // tombol wizard — supaya guru yang memang tidak mau pakai wizard
      // tidak merasa terjebak (lihat catatan di ContinueSetupButton).
      const directLink = document.createElement("a");
      directLink.className = "home-empty__link";
      directLink.href = "../master-data/index.html";
      directLink.textContent = "Isi manual di Data Master →";
      actions.appendChild(directLink);

      actions.appendChild(ContinueSetupButton("secondary"));
      empty.appendChild(actions);
    } else {
      const message = document.createElement("p");
      message.className = "home-empty__message";
      message.textContent = "Tidak ada jadwal hari ini.";
      empty.appendChild(message);

      const weekLink = document.createElement("a");
      weekLink.className = "home-empty__link";
      weekLink.href = "../master-data/index.html?tab=schedule";
      weekLink.textContent = "Lihat jadwal seminggu →";
      empty.appendChild(weekLink);
    }

    main.appendChild(empty);
    app.appendChild(main);
    return;
  }

  const classById = Object.fromEntries(classes.map((c) => [c.id, c]));

  const list = document.createElement("div");
  list.className = "schedule-list";

  let firstUnattended = null;

  for (const sch of schedules) {
    const cls = classById[sch.classId];
    // R12.4 — jadwal yatim: classId sudah tidak ada di Class (mis. kelas
    // dihapus dari Data Master tapi Schedule sengaja tidak ikut cascade,
    // lihat 01-Arsitektur-Pendamping.md). Sebelumnya kartu ini tetap bisa
    // diklik dan berujung "gagal memuat halaman absensi" karena Absensi
    // butuh data Class yang valid. Sekarang kartu tidak dibuat pressable,
    // dan tombol Hapus disediakan langsung di sini (R12.4).
    const isOrphan = !cls;
    const session = isOrphan ? null : await attendanceRepo.findSession(sch.classId, dateKey);
    if (!isOrphan && !session && !firstUnattended) firstUnattended = sch;

    const row = document.createElement("div");
    row.className = "schedule-row";

    const timeEl = document.createElement("div");
    timeEl.className = "schedule-time";
    timeEl.innerHTML = `<span>${escapeHtml(sch.startTime)}</span><span class="schedule-time__end">${escapeHtml(
      sch.endTime
    )}</span>`;
    row.appendChild(timeEl);

    const bar = document.createElement("div");
    bar.className = "schedule-bar";
    row.appendChild(bar);

    const info = document.createElement("div");
    info.className = "schedule-main";
    info.innerHTML = `<span class="schedule-subject">${escapeHtml(sch.subject)}</span><span class="schedule-class">${
      isOrphan ? "Kelas tidak ditemukan" : escapeHtml(cls.name)
    }</span>`;
    row.appendChild(info);

    if (isOrphan) {
      const deleteBtn = Button({
        label: "Hapus",
        variant: "danger",
        onClick: (event) => {
          // Cegah klik ini diteruskan ke Card (yang untuk jadwal orphan
          // memang tidak pressable, tapi stopPropagation tetap aman kalau
          // struktur Card berubah nanti).
          event.stopPropagation();

          const modal = Modal({
            title: "Hapus Jadwal Yatim?",
            body: "Kelas jadwal ini sudah tidak ada di Data Master, jadi tidak bisa dipakai untuk absensi. Sesi & record absensi terkait (jika ada) akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.",
            actions: [
              Button({ label: "Batal", variant: "secondary", onClick: () => modal.close() }),
              Button({
                label: "Ya, Hapus",
                variant: "danger",
                onClick: async () => {
                  await deleteScheduleAndRelated(sch.id);
                  modal.close();
                  showToast({ message: "Jadwal yatim berhasil dihapus." });
                  render();
                },
              }),
            ],
          });
          document.body.appendChild(modal);
        },
      });
      row.appendChild(deleteBtn);
    } else {
      row.appendChild(
        Badge({
          status: session ? "present" : null,
          label: session ? "Sudah Diabsen" : "Belum Diabsen",
        })
      );
    }

    const card = Card({
      content: row,
      pressable: !isOrphan,
      onClick: isOrphan
        ? undefined
        : () => {
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

  // R7.2 / R8.4 — migrasi pengguna lama & routing awal app. Dihitung dari
  // data asli (bukan disimpan terpisah), sama seperti checklist di R4.3/R8.2.
  const [classCount, studentCount, scheduleCount] = await Promise.all([
    classRepo.getAll().then((list) => list.length),
    studentRepo.getAll().then((list) => list.length),
    scheduleRepo.getAll().then((list) => list.length),
  ]);
  await settingsRepo.migrateIfNeeded({ classCount, studentCount, scheduleCount });

  const config = await settingsRepo.getConfig();
  
 
  
  if (!config.hasSeenOnboarding) {
    window.location.href = "../welcome/index.html";
    return;
  }

  await runPage(app, render);
}

main();

