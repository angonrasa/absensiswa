/**
 * Render Module — Halaman Absensi
 *
 * Tanggung jawab tunggal: membangun/memperbarui DOM untuk halaman Absensi.
 * Tidak menyimpan state sendiri (baca dari attendance.state.js), tidak
 * memanggil AttendanceRepository untuk menyimpan apa pun (itu tanggung jawab
 * attendance.js/handleSave dan attendance.autosave.js). Satu-satunya
 * pengecualian: `buildSummary()` dipakai untuk hitung ringkasan tampilan —
 * murni kalkulasi, tidak menyentuh database. Sesuai Agents-rules: "Satu file
 * satu tanggung jawab dan satu tugas", "Tidak ada penulisan langsung
 * (hardcode) html dan css di js" (di sini hanya struktur DOM + kelas CSS yang
 * sudah didefinisikan di stylesheet, bukan style inline baru).
 */

import { AppBar, Button } from "../../src/components/components.js";
import { escapeHtml } from "../../src/core/html.js";
import { formatDisplayDate } from "../../src/core/date.js";
import { AttendanceRepository } from "../../src/modules/attendance/attendance.repository.js";
import { state, updateDirtyState } from "./attendance.state.js";

const attendanceRepo = new AttendanceRepository();
const STATUS_LABEL = { present: "Hadir", permission: "Izin", sick: "Sakit", absent: "Alpha" };
const STATUS_ORDER = ["present", "permission", "sick", "absent"];

// MVP2 Milestone 8 (hotfix) — dipanggil setiap ada perubahan (tap status /
// input materi), supaya attendance.js bisa menjadwalkan autosave beberapa
// saat setelah tap terakhir — BUKAN cuma saat halaman ditinggalkan. Di-set
// lewat render(), sama seperti pola injeksi `onSave` yang sudah ada — modul
// ini sendiri tetap tidak tahu apa-apa soal autosave/repository.
let onStateChange = null;

// MVP2 Milestone 8.6 — indikator kecil "Tersimpan otomatis", silent (tanpa
// modal/notifikasi yang menyela, sesuai prinsip "Fokus Mengajar" Blueprint).
// Timer di-scope ke modul ini saja (bukan state.js) karena murni detail
// tampilan, tidak memengaruhi logika dirty/save.
let autosaveIndicatorTimer = null;

export function showAutosaveIndicator() {
  const el = document.getElementById("autosave-indicator");
  if (!el) return; // halaman sudah berpindah / elemen belum sempat ter-render

  el.classList.add("is-visible");
  clearTimeout(autosaveIndicatorTimer);
  autosaveIndicatorTimer = setTimeout(() => {
    el.classList.remove("is-visible");
  }, 2000);
}

export function renderMissingParam(app) {
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
  const status = state.statusByStudentId[studentId];
  const chip = document.createElement("button");
  chip.className = `status-chip status-chip--${status}`;
  chip.innerHTML = `<span class="status-chip__dot"></span><span>${STATUS_LABEL[status]}</span>`;
  chip.addEventListener("click", () => {
    state.statusByStudentId[studentId] = AttendanceRepository.nextStatus(status);
    updateDirtyState(); // MVP2 Milestone 8.2
    if (onStateChange) onStateChange(); // MVP2 Milestone 8 (hotfix) — jadwalkan autosave
    renderList();
    renderSummaryBar();
  });
  return chip;
}

export function renderSummaryBar() {
  const bar = document.getElementById("summary-bar");
  if (!bar) return;
  const summary = attendanceRepo.buildSummary(
    Object.values(state.statusByStudentId).map((status) => ({ status }))
  );
  bar.innerHTML = "";
  STATUS_ORDER.forEach((key) => {
    const pill = document.createElement("span");
    pill.className = "summary-pill";
    pill.textContent = `${STATUS_LABEL[key]}: ${summary[key]}`;
    bar.appendChild(pill);
  });
}

export function renderList() {
  const list = document.getElementById("student-list");
  if (!list) return;
  list.innerHTML = "";

  state.students.forEach((student) => {
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

export function renderMaterialSection() {
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
  topicInput.value = state.materialTopic;
  topicInput.addEventListener("input", (e) => {
    state.materialTopic = e.target.value;
    updateDirtyState(); // MVP2 Milestone 8.2
    if (onStateChange) onStateChange(); // MVP2 Milestone 8 (hotfix)
  });
  section.appendChild(topicInput);

  const noteWrap = document.createElement("div");
  noteWrap.className = "material-section__note-wrap";
  noteWrap.hidden = !state.noteExpanded;

  const noteInput = document.createElement("textarea");
  noteInput.id = "material-note-input";
  noteInput.className = "material-section__textarea";
  noteInput.rows = 2;
  noteInput.placeholder = "Catatan tambahan (opsional)";
  noteInput.value = state.materialNote;
  noteInput.addEventListener("input", (e) => {
    state.materialNote = e.target.value;
    updateDirtyState(); // MVP2 Milestone 8.2
    if (onStateChange) onStateChange(); // MVP2 Milestone 8 (hotfix)
  });
  noteWrap.appendChild(noteInput);

  const toggleLink = document.createElement("button");
  toggleLink.type = "button";
  toggleLink.className = "material-section__toggle";
  toggleLink.textContent = state.noteExpanded ? "− Sembunyikan catatan" : "+ Tambah catatan";
  toggleLink.addEventListener("click", () => {
    state.noteExpanded = !state.noteExpanded;
    noteWrap.hidden = !state.noteExpanded;
    toggleLink.textContent = state.noteExpanded ? "− Sembunyikan catatan" : "+ Tambah catatan";
    if (state.noteExpanded) noteInput.focus();
  });
  section.appendChild(toggleLink);
  section.appendChild(noteWrap);

  return section;
}

export function renderResult(app, summary, materialTopic = "") {
  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Absensi Tersimpan" }));

  const main = document.createElement("main");

  const heading = document.createElement("h2");
  heading.textContent = `${state.currentClass?.name || ""} — Selesai`;
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
  STATUS_ORDER.forEach((key) => {
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

/**
 * Render halaman Absensi utama. `onSave` di-inject dari attendance.js
 * (handleSave) supaya modul ini tidak perlu tahu soal repository/penyimpanan.
 * `onChange` (MVP2 Milestone 8 hotfix) dipanggil setiap ada tap status/input
 * materi, dipakai attendance.js untuk menjadwalkan autosave debounced —
 * lihat catatan onStateChange di atas.
 */
export function render(app, dateKey, onSave, onChange) {
  app.innerHTML = "";
  onStateChange = onChange || null;
  app.appendChild(AppBar({ title: "Absensi" }));

  const header = document.createElement("div");
  header.className = "attendance-header";
  header.innerHTML = `
    <h2>${escapeHtml(state.currentClass.name)}</h2>
    <div class="attendance-header__subject">${state.currentSchedule ? escapeHtml(state.currentSchedule.subject) + " · " : ""}${formatDisplayDate(dateKey)}</div>
  `;
  app.appendChild(header);

  const summaryBar = document.createElement("div");
  summaryBar.id = "summary-bar";
  summaryBar.className = "attendance-summary-bar";
  app.appendChild(summaryBar);

  const main = document.createElement("main");

  if (state.students.length === 0) {
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
  const saveBtn = Button({ label: "Simpan", variant: "primary", block: true, onClick: onSave });
  saveBtn.id = "save-btn";
  footer.appendChild(saveBtn);
  app.appendChild(footer);

  // MVP2 Milestone 8.6 — elemen indikator autosave, hidden by default (CSS).
  // Dipasang sekali per render halaman Absensi; ditampilkan lewat
  // showAutosaveIndicator() yang dipanggil dari attendance.js.
  const indicator = document.createElement("div");
  indicator.id = "autosave-indicator";
  indicator.className = "autosave-indicator";
  indicator.setAttribute("aria-live", "polite");
  indicator.innerHTML = `<span class="autosave-indicator__dot"></span><span>Tersimpan otomatis</span>`;
  app.appendChild(indicator);
}
