import { openDB } from "../../src/database/db.js";
import { StudentRepository } from "../../src/modules/student/student.repository.js";
import { ClassRepository } from "../../src/modules/class/class.repository.js";
import { AttendanceRepository } from "../../src/modules/attendance/attendance.repository.js";
import { formatDisplayDate } from "../../src/core/date.js";
import { computeWarnings } from "../../src/modules/history/warning.service.js";
import { filterTimeline } from "../../src/modules/history/history.service.js";
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

/* ---------------- Student Picker (tanpa studentId) ---------------- */

async function renderPicker() {
  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Riwayat Kehadiran" }));
  app.appendChild(BottomNav({ active: "riwayat" }));

  const main = document.createElement("main");

  const classes = await classRepo.getAll();
  const classById = Object.fromEntries(classes.map((c) => [c.id, c]));
  const allStudents = (await Promise.all(classes.map((c) => studentRepo.getByClass(c.id)))).flat();

  if (allStudents.length === 0) {
    main.innerHTML = `<p class="empty-state">Belum ada data siswa.</p>`;
    app.appendChild(main);
    return;
  }

  const hint = document.createElement("p");
  hint.style.color = "var(--color-ink-muted)";
  hint.style.marginBottom = "var(--space-4)";
  hint.textContent = "Pilih siswa untuk melihat riwayat kehadirannya.";
  main.appendChild(hint);

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
  main.appendChild(filterBar);

  const listContainer = document.createElement("div");
  main.appendChild(listContainer);

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
    info.innerHTML = `
      <span class="timeline-item__date">${formatDisplayDate(entry.date)}</span>
      <span>${STATUS_LABEL[entry.status]}</span>
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
    else await renderPicker();
  } catch (err) {
    console.error(err);
    showError(app, "Gagal memuat riwayat. Coba muat ulang.");
  }
}

main();
