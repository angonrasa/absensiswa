import { openDB } from "../../src/database/db.js";
import { StudentRepository } from "../../src/modules/student/student.repository.js";
import { ClassRepository } from "../../src/modules/class/class.repository.js";
import { AttendanceRepository } from "../../src/modules/attendance/attendance.repository.js";
import { formatDisplayDate } from "../../src/core/date.js";
import { computeWarnings } from "../../src/modules/history/warning.service.js";
import { filterTimeline, formatSessionRowSummary } from "../../src/modules/history/history.service.js";
import { AppBar, BottomNav, Button, Card, Input, Modal, Select, showToast } from "../../src/components/components.js";
import { showLoading, showError } from "../../src/components/pageState.js";
import { escapeHtml } from "../../src/core/html.js";

const studentRepo = new StudentRepository();
const classRepo = new ClassRepository();
const attendanceRepo = new AttendanceRepository();

const STATUS_LABEL = { present: "Hadir", permission: "Izin", sick: "Sakit", absent: "Alpha" };

const app = document.getElementById("app");
const params = new URLSearchParams(window.location.search);
const studentId = params.get("studentId");
// MVP 2 Milestone 4.3 — routing ketiga: buka satu sesi (read-only) dari
// tab "Per Kelas" (4.1), tanpa perlu tahu/pilih siswa dulu.
const sessionId = params.get("sessionId");

/* ---------------- Picker Root (tanpa studentId) ---------------- */
/* MVP 2 Milestone 4.1 — dua cara masuk: "Per Siswa" (yang sudah ada) dan
   "Per Kelas" (baru: pilih kelas → daftar sesi absensi, tanggal terbaru
   dulu). Tidak ada halaman baru, cukup tab di halaman Riwayat yang sudah
   ada. */

async function renderPicker() {
  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Riwayat Kehadiran" }));
  app.appendChild(BottomNav({ active: "riwayat" }));

  const main = document.createElement("main");

  const classes = await classRepo.getAll();
  const classById = Object.fromEntries(classes.map((c) => [c.id, c]));
  const allStudents = (await Promise.all(classes.map((c) => studentRepo.getByClass(c.id)))).flat();

  if (classes.length === 0) {
    main.innerHTML = `<p class="empty-state">Belum ada data kelas atau siswa.</p>`;
    app.appendChild(main);
    return;
  }

  const tabBar = document.createElement("div");
  tabBar.className = "history-mode-tabs";
  const studentTabBtn = Button({ label: "Per Siswa", variant: "secondary" });
  const classTabBtn = Button({ label: "Per Kelas", variant: "secondary" });
  tabBar.appendChild(studentTabBtn);
  tabBar.appendChild(classTabBtn);
  main.appendChild(tabBar);

  const contentContainer = document.createElement("div");
  main.appendChild(contentContainer);

  function setActiveTab(mode) {
    studentTabBtn.classList.toggle("history-mode-tabs__btn--active", mode === "student");
    classTabBtn.classList.toggle("history-mode-tabs__btn--active", mode === "class");
  }

  function switchMode(mode) {
    setActiveTab(mode);
    contentContainer.innerHTML = "";
    if (mode === "student") {
      renderStudentPicker(contentContainer, classes, classById, allStudents);
    } else {
      renderClassSessionPicker(contentContainer, classes);
    }
  }

  studentTabBtn.addEventListener("click", () => switchMode("student"));
  classTabBtn.addEventListener("click", () => switchMode("class"));

  switchMode("student");
  app.appendChild(main);
}

/* ---------------- Tab: Per Siswa ---------------- */

function renderStudentPicker(container, classes, classById, allStudents) {
  if (allStudents.length === 0) {
    container.innerHTML = `<p class="empty-state">Belum ada data siswa.</p>`;
    return;
  }

  const hint = document.createElement("p");
  hint.style.color = "var(--color-ink-muted)";
  hint.style.marginBottom = "var(--space-4)";
  hint.textContent = "Pilih siswa untuk melihat riwayat kehadirannya.";
  container.appendChild(hint);

  const filterBar = document.createElement("div");
  filterBar.className = "filter-row";
  const searchInput = Input({ label: "Cari Nama / NIS", placeholder: "Ketik nama atau NIS..." });
  const classFilter = Select({
    label: "Filter Kelas",
    value: "",
    options: [{ value: "", label: "Semua Kelas" }, ...classes.map((c) => ({ value: c.id, label: c.name }))],
  });
  filterBar.appendChild(searchInput);
  filterBar.appendChild(classFilter);
  container.appendChild(filterBar);

  const listContainer = document.createElement("div");
  container.appendChild(listContainer);

  function renderPickerList() {
    const query = searchInput.inputEl.value.trim().toLowerCase();
    const classId = classFilter.selectEl.value;

    const filtered = allStudents.filter((student) => {
      const matchesQuery =
        !query ||
        student.name.toLowerCase().includes(query) ||
        (student.nis || "").toLowerCase().includes(query);
      const matchesClass = !classId || student.classId === classId;
      return matchesQuery && matchesClass;
    });

    listContainer.innerHTML = "";

    if (filtered.length === 0) {
      listContainer.innerHTML = `<p class="empty-state">Siswa tidak ditemukan.</p>`;
      return;
    }

    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "var(--space-3)";

    filtered.forEach((student) => {
      const row = document.createElement("div");
      row.innerHTML = `<strong>${escapeHtml(student.name)}</strong><div style="font-size:var(--text-sm);color:var(--color-ink-muted)">${escapeHtml(classById[student.classId]?.name || "-")}</div>`;
      const card = Card({
        content: row,
        pressable: true,
        onClick: () => (window.location.href = `./index.html?studentId=${student.id}`),
      });
      list.appendChild(card);
    });

    listContainer.appendChild(list);
  }

  searchInput.inputEl.addEventListener("input", renderPickerList);
  classFilter.selectEl.addEventListener("change", renderPickerList);

  renderPickerList();
}

/* ---------------- Tab: Per Kelas (MVP 2 Milestone 4.1) ---------------- */

function renderClassSessionPicker(container, classes) {
  const hint = document.createElement("p");
  hint.style.color = "var(--color-ink-muted)";
  hint.style.marginBottom = "var(--space-4)";
  hint.textContent = "Pilih kelas untuk melihat daftar sesi absensi, tanpa perlu tahu nama siswa dulu.";
  container.appendChild(hint);

  const filterBar = document.createElement("div");
  filterBar.className = "filter-row";
  const classSelect = Select({
    label: "Kelas",
    value: "",
    options: [{ value: "", label: "Pilih Kelas" }, ...classes.map((c) => ({ value: c.id, label: c.name }))],
  });
  filterBar.appendChild(classSelect);
  container.appendChild(filterBar);

  const sessionListContainer = document.createElement("div");
  container.appendChild(sessionListContainer);

  async function renderSessionList() {
    const classId = classSelect.selectEl.value;
    sessionListContainer.innerHTML = "";

    if (!classId) {
      sessionListContainer.innerHTML = `<p class="empty-state">Pilih kelas untuk melihat daftar sesi.</p>`;
      return;
    }

    sessionListContainer.innerHTML = `<p class="empty-state">Memuat sesi...</p>`;
    const sessions = await attendanceRepo.getSessionsByClass(classId);

    // MVP 2 Milestone 4.4 — ringkasan kecil per baris ("Hadir 28, Alpha 2" +
    // potongan materi kalau ada), supaya guru bisa pindai cepat tanpa harus
    // klik satu-satu. Ambil semua record sesi sekaligus (bukan query baru,
    // getRecordsBySession() sudah ada sejak Milestone 4.3).
    const recordsBySession = await Promise.all(
      sessions.map((session) => attendanceRepo.getRecordsBySession(session.id))
    );

    sessionListContainer.innerHTML = "";

    if (sessions.length === 0) {
      sessionListContainer.innerHTML = `<p class="empty-state">Belum ada sesi absensi untuk kelas ini.</p>`;
      return;
    }

    const list = document.createElement("div");
    list.className = "class-session-list";

    // Sesi sudah terurut tanggal terbaru dulu dari getSessionsByClass().
    // MVP 2 Milestone 4.3 — tiap baris tanggal jadi tautan ke halaman rekap
    // sesi (read-only), bukan cuma daftar tanpa aksi.
    sessions.forEach((session, idx) => {
      const summary = attendanceRepo.buildSummary(recordsBySession[idx]);
      const summaryText = formatSessionRowSummary(summary, session.materialTopic);

      // MVP2 Milestone 8 ("Keputusan yang Diambil", 07-Roadmap-MVP2.md):
      // sesi berstatus draft (autosave, belum ditekan Simpan) dihitung SAMA
      // seperti completed di statistik/riwayat — badge ini murni informasi
      // tambahan, tidak mengubah summaryText/summary di atas sama sekali.
      const draftBadge = session.status === "draft"
        ? `<span class="badge badge--draft" title="Sesi ini belum ditekan Simpan — status masih tersimpan otomatis (draft)">Belum Dikonfirmasi</span>`
        : "";

      const row = document.createElement("div");
      row.className = "class-session-row class-session-row--pressable";
      row.innerHTML = `
        <span class="class-session-row__main">
          <span class="class-session-row__date">${formatDisplayDate(session.date)}</span>
          ${draftBadge}
          <span class="class-session-row__summary">${escapeHtml(summaryText)}</span>
        </span>
        <span class="class-session-row__chevron" aria-hidden="true">›</span>
      `;
      row.addEventListener("click", () => {
        window.location.href = `./index.html?sessionId=${session.id}`;
      });
      list.appendChild(row);
    });

    sessionListContainer.appendChild(list);
  }

  classSelect.selectEl.addEventListener("change", renderSessionList);

  renderSessionList();
}

/* ---------------- Rekap Satu Sesi, Read-Only (MVP 2 Milestone 4.3) ---------------- */
/* Dibuka dari baris tanggal di tab "Per Kelas" (4.1/4.2). Menampilkan semua
   siswa di kelas itu beserta status hari itu (getRecordsBySession(), sudah
   ada) + materi hari itu (materialTopic/materialNote, Milestone 1). Tidak
   ada tombol ubah status — perubahan status tetap lewat halaman Absensi
   asli, supaya tidak ada dua tempat yang bisa mengubah data yang sama. */

async function renderSessionRecap(id) {
  const session = await attendanceRepo.getSessionById(id);

  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Rekap Sesi" }));
  app.appendChild(BottomNav({ active: "riwayat" }));

  if (!session) {
    const main = document.createElement("main");
    main.innerHTML = `<p class="empty-state">Sesi tidak ditemukan.</p>`;
    app.appendChild(main);
    return;
  }

  const cls = await classRepo.getById(session.classId);
  const [students, records] = await Promise.all([
    studentRepo.getByClass(session.classId),
    attendanceRepo.getRecordsBySession(session.id),
  ]);

  const recordByStudent = Object.fromEntries(records.map((r) => [r.studentId, r]));
  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name));

  // MVP2 Milestone 8 ("Keputusan yang Diambil") — lihat catatan yang sama
  // di renderClassSessionPicker() di atas: badge murni informasi, sesi
  // draft tetap dihitung sama seperti completed di statGrid di bawah.
  const draftBadge = session.status === "draft"
    ? `<span class="badge badge--draft" title="Sesi ini belum ditekan Simpan — status masih tersimpan otomatis (draft)">Belum Dikonfirmasi</span>`
    : "";

  const header = document.createElement("div");
  header.className = "history-header";
  header.innerHTML = `
    <a href="javascript:void(0)" class="session-recap__back">← Kembali</a>
    <h2>${cls ? escapeHtml(cls.name) : "-"}</h2>
    <div class="history-header__subtitle">${formatDisplayDate(session.date)}</div>
    ${draftBadge}
  `;
  header.querySelector(".session-recap__back").addEventListener("click", () => window.history.back());
  app.appendChild(header);

  const main = document.createElement("main");

  // Materi hari itu (Milestone 1-3), kalau diisi. Materi tetap opsional —
  // tidak ditampilkan sama sekali kalau kosong.
  if (session.materialTopic || session.materialNote) {
    const materialBox = document.createElement("div");
    materialBox.className = "session-recap-material";
    materialBox.innerHTML = `
      ${session.materialTopic ? `<div class="session-recap-material__topic">📘 ${escapeHtml(session.materialTopic)}</div>` : ""}
      ${session.materialNote ? `<div class="session-recap-material__note">${escapeHtml(session.materialNote)}</div>` : ""}
    `;
    main.appendChild(materialBox);
  }

  const statGrid = document.createElement("div");
  statGrid.className = "stat-grid";
  main.appendChild(statGrid);
  renderStats(statGrid, records);

  const listHeading = document.createElement("h3");
  listHeading.textContent = "Daftar Siswa";
  main.appendChild(listHeading);

  if (sortedStudents.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Belum ada data siswa di kelas ini.";
    main.appendChild(empty);
  } else {
    const list = document.createElement("div");
    list.className = "session-recap-list";

    sortedStudents.forEach((student) => {
      const record = recordByStudent[student.id];
      const status = record?.status;
      const row = document.createElement("div");
      row.className = `session-recap-row${status ? ` session-recap-row--${status}` : ""}`;
      row.innerHTML = `
        <span class="session-recap-row__name">${escapeHtml(student.name)}</span>
        <span class="session-recap-row__status">${status ? STATUS_LABEL[status] : "-"}</span>
      `;
      row.addEventListener("click", () => (window.location.href = `./index.html?studentId=${student.id}`));
      list.appendChild(row);
    });

    main.appendChild(list);
  }

  app.appendChild(main);
}

/* ---------------- Detail Siswa ---------------- */

function renderStats(container, entries) {
  container.innerHTML = "";
  const summary = attendanceRepo.buildSummary(entries);
  const order = ["present", "permission", "sick", "absent"];
  order.forEach((key) => {
    const card = document.createElement("div");
    card.className = `stat-card stat-card--${key}`;
    card.innerHTML = `<span class="stat-card__value">${summary[key]}</span><span class="stat-card__label">${STATUS_LABEL[key]}</span>`;
    container.appendChild(card);
  });
}

function renderTimelineList(container, entries, { selectionMode, selectedIds, onToggle }) {
  container.innerHTML = "";

  if (entries.length === 0) {
    container.innerHTML = `<p class="empty-state">Tidak ada riwayat pada rentang tanggal ini.</p>`;
    return;
  }

  // Timeline ditampilkan dari yang terbaru.
  [...entries].reverse().forEach((entry) => {
    const item = document.createElement("div");
    item.className = `timeline-item timeline-item--${entry.status}`;
    if (selectionMode) item.classList.add("timeline-item--selectable");

    if (selectionMode) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "timeline-item__checkbox";
      checkbox.checked = selectedIds.has(entry.recordId);
      checkbox.addEventListener("change", () => onToggle(entry));
      item.appendChild(checkbox);
      item.addEventListener("click", (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          onToggle(entry);
        }
      });
    }

    const info = document.createElement("span");
    info.className = "timeline-item__info";

    // MVP 2 Milestone 3.2 — untuk status tidak hadir (izin/sakit/alpha) dengan
    // materialTopic terisi, tampilkan baris kecil "Materi: {topic}" di bawah
    // tanggal, sesuai Blueprint ("guru langsung mengetahui materi yang
    // tertinggal"). Status "present" tidak perlu ditonjolkan.
    const showMaterial = entry.status !== "present" && entry.materialTopic;
    const materialLine = showMaterial
      ? `<span class="timeline-item__material">Materi: ${escapeHtml(entry.materialTopic)}</span>`
      : "";

    info.innerHTML = `
      <span class="timeline-item__row">
        <span class="timeline-item__date">${formatDisplayDate(entry.date)}</span>
        <span>${STATUS_LABEL[entry.status]}</span>
      </span>
      ${materialLine}
    `;
    item.appendChild(info);

    container.appendChild(item);
  });
}

async function renderDetail() {
  const student = await studentRepo.getById(studentId);
  if (!student) {
    app.innerHTML = "";
    app.appendChild(AppBar({ title: "Riwayat Kehadiran" }));
    app.appendChild(BottomNav({ active: "riwayat" }));
    const main = document.createElement("main");
    main.innerHTML = `<p>Siswa tidak ditemukan.</p>`;
    app.appendChild(main);
    return;
  }

  const cls = await classRepo.getById(student.classId);
  const fullTimeline = await attendanceRepo.getStudentTimeline(studentId);

  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Riwayat Kehadiran" }));
  app.appendChild(BottomNav({ active: "riwayat" }));

  const header = document.createElement("div");
  header.className = "history-header";
  header.innerHTML = `<h2>${escapeHtml(student.name)}</h2><div class="history-header__subtitle">${cls ? escapeHtml(cls.name) : "-"} · NIS ${escapeHtml(student.nis)}</div>`;
  app.appendChild(header);

  const main = document.createElement("main");

  const warnings = computeWarnings(fullTimeline);
  if (warnings.length > 0) {
    const warningBox = document.createElement("div");
    warningBox.className = "warning-box";
    warnings.forEach((w) => {
      const item = document.createElement("div");
      item.className = "warning-item";
      item.innerHTML = `<span>⚠</span><span>${w.message}</span>`;
      warningBox.appendChild(item);
    });
    main.appendChild(warningBox);
  }

  const statGrid = document.createElement("div");
  statGrid.className = "stat-grid";
  main.appendChild(statGrid);

  const filterRow = document.createElement("div");
  filterRow.className = "filter-row";
  const startInput = Input({ label: "Dari Tanggal", type: "date" });
  const endInput = Input({ label: "Sampai Tanggal", type: "date" });
  filterRow.appendChild(startInput);
  filterRow.appendChild(endInput);
  main.appendChild(filterRow);

  const timelineHeadingRow = document.createElement("div");
  timelineHeadingRow.className = "timeline-heading-row";

  const timelineHeading = document.createElement("h3");
  timelineHeading.textContent = "Timeline";
  timelineHeadingRow.appendChild(timelineHeading);

  const selectToggleBtn = Button({
    label: "Pilih untuk Hapus",
    variant: "secondary",
    onClick: () => {
      selectionMode = !selectionMode;
      selectedIds.clear();
      renderToolbar();
      applyFilter();
    },
  });
  timelineHeadingRow.appendChild(selectToggleBtn);
  main.appendChild(timelineHeadingRow);

  const bulkDeleteBtn = Button({
    label: "Hapus (0)",
    variant: "danger",
    onClick: () => confirmBulkDelete(),
  });
  bulkDeleteBtn.classList.add("timeline-bulk-delete");
  bulkDeleteBtn.style.display = "none";
  main.appendChild(bulkDeleteBtn);

  const timelineEl = document.createElement("div");
  timelineEl.className = "timeline";
  main.appendChild(timelineEl);

  app.appendChild(main);

  let selectionMode = false;
  const selectedIds = new Set();

  function renderToolbar() {
    selectToggleBtn.textContent = selectionMode ? "Batal Pilih" : "Pilih untuk Hapus";
    bulkDeleteBtn.style.display = selectionMode ? "block" : "none";
    bulkDeleteBtn.textContent = `Hapus (${selectedIds.size})`;
    bulkDeleteBtn.disabled = selectedIds.size === 0;
  }

  function handleToggle(entry) {
    if (selectedIds.has(entry.recordId)) selectedIds.delete(entry.recordId);
    else selectedIds.add(entry.recordId);
    renderToolbar();
  }

  function confirmBulkDelete() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;

    const modal = Modal({
      title: "Hapus Riwayat?",
      body: `${count} riwayat kehadiran terpilih akan dihapus. Tindakan ini tidak bisa dibatalkan. Lanjutkan?`,
      actions: [
        Button({ label: "Batal", variant: "secondary", onClick: () => modal.close() }),
        Button({
          label: "Ya, Hapus",
          variant: "danger",
          onClick: async () => {
            await Promise.all([...selectedIds].map((id) => attendanceRepo.deleteRecord(id)));
            for (let i = fullTimeline.length - 1; i >= 0; i--) {
              if (selectedIds.has(fullTimeline[i].recordId)) fullTimeline.splice(i, 1);
            }
            selectedIds.clear();
            selectionMode = false;
            modal.close();
            renderToolbar();
            applyFilter();
            showToast({ message: `${count} riwayat dihapus.` });
          },
        }),
      ],
    });
    document.body.appendChild(modal);
  }

  function applyFilter() {
    const filtered = filterTimeline(fullTimeline, startInput.inputEl.value, endInput.inputEl.value);
    renderStats(statGrid, filtered);
    renderTimelineList(timelineEl, filtered, { selectionMode, selectedIds, onToggle: handleToggle });
  }

  startInput.inputEl.addEventListener("change", applyFilter);
  endInput.inputEl.addEventListener("change", applyFilter);

  renderToolbar();
  applyFilter();
}

async function main() {
  showLoading(app, "Memuat riwayat...");
  try {
    await openDB();
    if (studentId) await renderDetail();
    else if (sessionId) await renderSessionRecap(sessionId);
    else await renderPicker();
  } catch (err) {
    console.error(err);
    showError(app, "Gagal memuat riwayat. Coba muat ulang.");
  }
}

main();
