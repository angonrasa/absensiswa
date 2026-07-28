import { openDB } from "../../src/database/db.js";
import { StudentRepository } from "../../src/modules/student/student.repository.js";
import { ClassRepository } from "../../src/modules/class/class.repository.js";
import { ScheduleRepository } from "../../src/modules/schedule/schedule.repository.js";
import { AttendanceRepository } from "../../src/modules/attendance/attendance.repository.js";
import { runAutoBackupIfDue } from "../../src/modules/backup/backup.service.js";
import { toDateKey, formatDisplayDate } from "../../src/core/date.js";
import { AppBar, Button } from "../../src/components/components.js";
import { showLoading, showError } from "../../src/components/pageState.js";
import { escapeHtml } from "../../src/core/html.js";

const studentRepo = new StudentRepository();
const classRepo = new ClassRepository();
const scheduleRepo = new ScheduleRepository();
const attendanceRepo = new AttendanceRepository();

const STATUS_LABEL = { present: "Hadir", permission: "Izin", sick: "Sakit", absent: "Alpha" };

const app = document.getElementById("app");

const params = new URLSearchParams(window.location.search);
const classId = params.get("classId");
const scheduleId = params.get("scheduleId");
const dateKey = toDateKey();

// state: { [studentId]: 'present' | 'permission' | 'sick' | 'absent' }
let statusByStudentId = {};
let students = [];
let currentClass = null;
let currentSchedule = null;

// MVP 2 Milestone 2 — materi hari ini (opsional, tidak boleh mengganggu absensi < 30 detik).
let materialTopic = "";
let materialNote = "";
let noteExpanded = false;

function renderMissingParam() {
  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Absensi" }));
  const main = document.createElement("main");
  main.innerHTML = `<p>Kelas tidak ditemukan. Silakan buka absensi lewat jadwal di Beranda.</p>`;
  const backBtn = Button({ label: "← Ke Beranda", variant: "secondary", onClick: () => (window.location.href = "../home/index.html") });
  backBtn.style.marginTop = "var(--space-4)";
  main.appendChild(backBtn);
  app.appendChild(main);
}

function statusChip(studentId) {
  const status = statusByStudentId[studentId];
  const chip = document.createElement("button");
  chip.className = `status-chip status-chip--${status}`;
  chip.innerHTML = `<span class="status-chip__dot"></span><span>${STATUS_LABEL[status]}</span>`;
  chip.addEventListener("click", () => {
    statusByStudentId[studentId] = AttendanceRepository.nextStatus(status);
    renderList();
    renderSummaryBar();
  });
  return chip;
}

function renderSummaryBar() {
  const bar = document.getElementById("summary-bar");
  if (!bar) return;
  const summary = attendanceRepo.buildSummary(
    Object.values(statusByStudentId).map((status) => ({ status }))
  );
  bar.innerHTML = "";
  const order = ["present", "permission", "sick", "absent"];
  order.forEach((key) => {
    const pill = document.createElement("span");
    pill.className = "summary-pill";
    pill.textContent = `${STATUS_LABEL[key]}: ${summary[key]}`;
    bar.appendChild(pill);
  });
}

function renderList() {
  const list = document.getElementById("student-list");
  if (!list) return;
  list.innerHTML = "";

  students.forEach((student) => {
    const row = document.createElement("div");
    row.className = "student-row";
    const name = document.createElement("span");
    name.className = "student-row__name";
    name.textContent = student.name;
    row.appendChild(name);
    row.appendChild(statusChip(student.id));
    list.appendChild(row);
  });
}

function renderMaterialSection() {
  const section = document.createElement("div");
  section.className = "material-section";

  const label = document.createElement("label");
  label.className = "material-section__label";
  label.setAttribute("for", "material-topic-input");
  label.textContent = "Materi hari ini (opsional)";
  section.appendChild(label);

  const topicInput = document.createElement("input");
  topicInput.type = "text";
  topicInput.id = "material-topic-input";
  topicInput.className = "material-section__input";
  topicInput.placeholder = "Contoh: Hukum II Newton";
  topicInput.value = materialTopic;
  topicInput.addEventListener("input", (e) => {
    materialTopic = e.target.value;
  });
  section.appendChild(topicInput);

  const noteWrap = document.createElement("div");
  noteWrap.className = "material-section__note-wrap";
  noteWrap.hidden = !noteExpanded;

  const noteInput = document.createElement("textarea");
  noteInput.id = "material-note-input";
  noteInput.className = "material-section__textarea";
  noteInput.rows = 2;
  noteInput.placeholder = "Catatan tambahan (opsional)";
  noteInput.value = materialNote;
  noteInput.addEventListener("input", (e) => {
    materialNote = e.target.value;
  });
  noteWrap.appendChild(noteInput);

  const toggleLink = document.createElement("button");
  toggleLink.type = "button";
  toggleLink.className = "material-section__toggle";
  toggleLink.textContent = noteExpanded ? "− Sembunyikan catatan" : "+ Tambah catatan";
  toggleLink.addEventListener("click", () => {
    noteExpanded = !noteExpanded;
    noteWrap.hidden = !noteExpanded;
    toggleLink.textContent = noteExpanded ? "− Sembunyikan catatan" : "+ Tambah catatan";
    if (noteExpanded) noteInput.focus();
  });
  section.appendChild(toggleLink);
  section.appendChild(noteWrap);

  return section;
}

async function handleSave() {
  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Menyimpan...";

  const trimmedTopic = materialTopic.trim();
  const trimmedNote = materialNote.trim();

  const summary = await attendanceRepo.saveAttendance({
    classId,
    scheduleId,
    date: dateKey,
    statusByStudentId,
    materialTopic: trimmedTopic,
    materialNote: trimmedNote,
  });

  // MVP2 Milestone 7.3 — fire-and-forget, TIDAK di-await. Auto backup
  // (kalau aktif & sudah waktunya) berjalan di belakang layar, tidak boleh
  // menunda tampilnya ringkasan absensi (Blueprint: harus tetap < 30 detik).
  // Gagal pun tidak akan melempar error ke sini — sudah ditangani di dalam
  // runAutoBackupIfDue() (backup.service.js).
  runAutoBackupIfDue();

  renderResult(summary, trimmedTopic);
}

function renderResult(summary, materialTopic = "") {
  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Absensi Tersimpan" }));

  const main = document.createElement("main");

  const heading = document.createElement("h2");
  heading.textContent = `${currentClass?.name || ""} — Selesai`;
  heading.style.marginBottom = "var(--space-4)";
  main.appendChild(heading);

  if (materialTopic) {
    const materialLine = document.createElement("p");
    materialLine.className = "result-material";
    materialLine.textContent = `Materi: ${materialTopic}`;
    main.appendChild(materialLine);
  }

  const grid = document.createElement("div");
  grid.className = "result-summary";
  const order = ["present", "permission", "sick", "absent"];
  order.forEach((key) => {
    const item = document.createElement("div");
    item.className = "result-summary__item";
    item.innerHTML = `<span class="result-summary__value">${summary[key]}</span><span class="result-summary__label">${STATUS_LABEL[key]}</span>`;
    grid.appendChild(item);
  });
  main.appendChild(grid);

  const doneBtn = Button({
    label: "Selesai",
    variant: "primary",
    block: true,
    onClick: () => (window.location.href = "../home/index.html"),
  });
  doneBtn.style.marginTop = "var(--space-4)";
  main.appendChild(doneBtn);

  app.appendChild(main);
}

async function render() {
  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Absensi" }));

  const header = document.createElement("div");
  header.className = "attendance-header";
  header.innerHTML = `
    <h2>${escapeHtml(currentClass.name)}</h2>
    <div class="attendance-header__subject">${currentSchedule ? escapeHtml(currentSchedule.subject) + " · " : ""}${formatDisplayDate(dateKey)}</div>
  `;
  app.appendChild(header);

  const summaryBar = document.createElement("div");
  summaryBar.id = "summary-bar";
  summaryBar.className = "attendance-summary-bar";
  app.appendChild(summaryBar);

  const main = document.createElement("main");

  if (students.length === 0) {
    main.innerHTML = `<p class="empty-state">Belum ada data siswa.</p>`;
    app.appendChild(main);
    return;
  }

  main.appendChild(renderMaterialSection());

  const list = document.createElement("div");
  list.id = "student-list";
  list.className = "student-list";
  main.appendChild(list);
  app.appendChild(main);

  renderList();
  renderSummaryBar();

  const footer = document.createElement("div");
  footer.className = "attendance-footer";
  const saveBtn = Button({ label: "Simpan", variant: "primary", block: true, onClick: handleSave });
  saveBtn.id = "save-btn";
  footer.appendChild(saveBtn);
  app.appendChild(footer);
}

async function main() {
  showLoading(app, "Memuat data siswa...");

  try {
    await openDB();

    if (!classId) {
      renderMissingParam();
      return;
    }

    currentClass = await classRepo.getById(classId);
    if (scheduleId) currentSchedule = await scheduleRepo.getById(scheduleId);
    students = await studentRepo.getByClass(classId);

    // Default = Hadir untuk semua siswa (Prinsip Desain #1).
    statusByStudentId = Object.fromEntries(students.map((s) => [s.id, "present"]));

    // Jika sesi hari ini sudah ada, muat status yang sudah tersimpan (bukan default lagi).
    const existingSession = await attendanceRepo.findSession(classId, dateKey);
    if (existingSession) {
      const records = await attendanceRepo.getRecordsBySession(existingSession.id);
      records.forEach((r) => {
        if (statusByStudentId[r.studentId] !== undefined) {
          statusByStudentId[r.studentId] = r.status;
        }
      });
      // Materi hari ini sudah pernah diisi untuk sesi ini — muat kembali, jangan reset.
      materialTopic = existingSession.materialTopic || "";
      materialNote = existingSession.materialNote || "";
    } else {
      // Default = materi terakhir untuk kelas ini (Prinsip Desain "Default = Hadir"
      // diterapkan juga di sini: guru cuma perlu ubah kalau memang beda).
      const recentTopics = await attendanceRepo.getRecentMaterialTopics(classId, 1);
      materialTopic = recentTopics[0] || "";
    }
    // Kalau catatan sudah terisi (dari sesi tersimpan), tampilkan langsung, jangan
    // disembunyikan di balik toggle — supaya guru tidak kehilangan isi yang sudah ada.
    noteExpanded = Boolean(materialNote);

    await render();
  } catch (err) {
    console.error(err);
    showError(app, "Gagal memuat halaman absensi. Coba muat ulang.");
  }
}

main();
