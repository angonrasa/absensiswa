import { openDB } from "../../src/database/db.js";
import { AcademicYearRepository } from "../../src/modules/settings/academicYear.repository.js";
import { ClassRepository } from "../../src/modules/class/class.repository.js";
import { StudentRepository } from "../../src/modules/student/student.repository.js";
import { ScheduleRepository } from "../../src/modules/schedule/schedule.repository.js";
import { AttendanceRepository } from "../../src/modules/attendance/attendance.repository.js";
import { computeWarnings } from "../../src/modules/history/warning.service.js";
import { showLoading, showError } from "../../src/core/pageState.js";
import { escapeHtml } from "../../src/core/html.js";
import {
  AppBar,
  BottomNav,
  Button,
  Card,
  Input,
  Select,
  Modal,
  BottomSheet,
  Badge,
  FloatingButton,
  showToast,
} from "../../src/components/components.js";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const academicYearRepo = new AcademicYearRepository();
const classRepo = new ClassRepository();
const studentRepo = new StudentRepository();
const scheduleRepo = new ScheduleRepository();
const attendanceRepo = new AttendanceRepository();

const TABS = [
  { key: "academicYear", label: "Tahun Ajaran" },
  { key: "class", label: "Kelas" },
  { key: "student", label: "Siswa" },
  { key: "schedule", label: "Jadwal" },
];

// Dukung tautan langsung ke tab tertentu, cth. dari Beranda: "?tab=schedule"
// (dipakai supaya "Lihat jadwal seminggu →" langsung membuka tab Jadwal).
const requestedTab = new URLSearchParams(window.location.search).get("tab");
let activeTab = TABS.some((t) => t.key === requestedTab) ? requestedTab : "academicYear";
let studentSearchQuery = "";
let studentClassFilterId = "";

const app = document.getElementById("app");

function openSheet(content) {
  const sheet = BottomSheet({ content });
  document.body.appendChild(sheet);
  return sheet;
}

function confirmDelete(message, doDelete) {
  const modal = Modal({
    title: "Hapus Data",
    body: message,
    actions: [
      Button({ label: "Batal", variant: "secondary", onClick: () => modal.close() }),
      Button({
        label: "Hapus",
        variant: "danger",
        onClick: () => {
          modal.close();
          showToast({
            message: "Data dihapus.",
            undoLabel: "Urungkan",
            onCommit: async () => {
              await doDelete();
              renderTabContent();
            },
          });
        },
      }),
    ],
  });
  document.body.appendChild(modal);
}

function emptyState(text) {
  const el = document.createElement("div");
  el.className = "empty-state";
  el.textContent = text;
  return el;
}

function iconButton(icon, label, onClick) {
  const btn = document.createElement("button");
  btn.className = "icon-btn";
  btn.setAttribute("aria-label", label);
  btn.textContent = icon;
  btn.addEventListener("click", onClick);
  return btn;
}

/* ---------------- Academic Year Tab ---------------- */

async function renderAcademicYearTab(container) {
  const years = await academicYearRepo.getAll();

  const addBtn = Button({
    label: "+ Tambah Tahun Ajaran",
    variant: "secondary",
    block: true,
    onClick: () => openAcademicYearForm(),
  });
  addBtn.style.marginBottom = "var(--space-4)";
  container.appendChild(addBtn);

  if (years.length === 0) {
    container.appendChild(emptyState("Belum ada tahun ajaran."));
    return;
  }

  const list = document.createElement("div");
  list.className = "list";

  years.forEach((year) => {
    const row = document.createElement("div");
    row.className = "list-row";

    const main = document.createElement("div");
    main.className = "list-row__main";
    main.innerHTML = `<span class="list-row__title">${escapeHtml(year.name)}</span>`;
    row.appendChild(main);

    const actions = document.createElement("div");
    actions.className = "list-row__actions";
    actions.appendChild(Badge({ status: year.isActive ? "present" : null, label: year.isActive ? "Aktif" : "Nonaktif" }));
    if (!year.isActive) {
      actions.appendChild(
        iconButton("✓", "Aktifkan", async () => {
          await academicYearRepo.activate(year.id);
          renderTabContent();
        })
      );
    }
    actions.appendChild(iconButton("✎", "Edit", () => openAcademicYearForm(year)));
    actions.appendChild(
      iconButton("🗑", "Hapus", () =>
        confirmDelete(`Hapus tahun ajaran "${year.name}"?`, () => academicYearRepo.remove(year.id))
      )
    );
    row.appendChild(actions);

    list.appendChild(Card({ content: row }));
  });

  container.appendChild(list);
}

function openAcademicYearForm(existing = null) {
  const nameInput = Input({ label: "Nama Tahun Ajaran", value: existing?.name || "", placeholder: "cth. 2026/2027" });

  const form = document.createElement("div");
  form.className = "sheet-form";
  form.innerHTML = `<h3>${existing ? "Edit" : "Tambah"} Tahun Ajaran</h3>`;
  form.appendChild(nameInput);

  const saveBtn = Button({
    label: "Simpan",
    variant: "primary",
    block: true,
    onClick: async () => {
      const name = nameInput.inputEl.value.trim();
      if (!name) return;
      if (existing) await academicYearRepo.update(existing.id, { name });
      else await academicYearRepo.create({ name });
      sheet.close();
      renderTabContent();
    },
  });
  form.appendChild(saveBtn);

  const sheet = openSheet(form);
}

/* ---------------- Class Tab ---------------- */

async function renderClassTab(container) {
  const classes = await classRepo.getAll();

  const addBtn = Button({
    label: "+ Tambah Kelas",
    variant: "secondary",
    block: true,
    onClick: async () => openClassForm(null, await academicYearRepo.getAll()),
  });
  addBtn.style.marginBottom = "var(--space-4)";
  container.appendChild(addBtn);

  if (classes.length === 0) {
    container.appendChild(emptyState("Belum ada kelas."));
    return;
  }

  const list = document.createElement("div");
  list.className = "list";

  classes.forEach((cls) => {
    const row = document.createElement("div");
    row.className = "list-row";
    row.innerHTML = `<div class="list-row__main">
      <span class="list-row__title">${escapeHtml(cls.name)}</span>
      <span class="list-row__subtitle">Kelas ${escapeHtml(cls.grade)}</span>
    </div>`;

    const actions = document.createElement("div");
    actions.className = "list-row__actions";
    actions.appendChild(iconButton("✎", "Edit", async () => openClassForm(cls, await academicYearRepo.getAll())));
    actions.appendChild(
      iconButton("🗑", "Hapus", () =>
        confirmDelete(`Hapus kelas "${cls.name}"? Siswa di kelas ini tidak akan otomatis terhapus.`, () => classRepo.remove(cls.id))
      )
    );
    row.appendChild(actions);

    list.appendChild(Card({ content: row }));
  });

  container.appendChild(list);
}

function openClassForm(existing, years) {
  const nameInput = Input({ label: "Nama Kelas", value: existing?.name || "", placeholder: "cth. 7A" });
  const gradeInput = Input({ label: "Tingkat", type: "number", value: existing?.grade ?? "", placeholder: "cth. 7" });
  const yearSelect = Select({
    label: "Tahun Ajaran",
    value: existing?.academicYearId || years.find((y) => y.isActive)?.id || "",
    options: years.map((y) => ({ value: y.id, label: y.name })),
  });

  const form = document.createElement("div");
  form.className = "sheet-form";
  form.innerHTML = `<h3>${existing ? "Edit" : "Tambah"} Kelas</h3>`;
  form.appendChild(nameInput);
  form.appendChild(gradeInput);
  if (years.length > 0) form.appendChild(yearSelect);
  else form.appendChild(emptyState("Buat Tahun Ajaran terlebih dahulu."));

  const saveBtn = Button({
    label: "Simpan",
    variant: "primary",
    block: true,
    disabled: years.length === 0,
    onClick: async () => {
      const name = nameInput.inputEl.value.trim();
      const grade = Number(gradeInput.inputEl.value);
      const academicYearId = yearSelect.selectEl.value;
      if (!name || !academicYearId) return;
      if (existing) await classRepo.update(existing.id, { name, grade, academicYearId });
      else await classRepo.create({ name, grade, academicYearId });
      sheet.close();
      renderTabContent();
    },
  });
  form.appendChild(saveBtn);

  const sheet = openSheet(form);
}

/* ---------------- Student Tab ---------------- */

async function renderStudentTab(container) {
  const classes = await classRepo.getAll();
  const classById = Object.fromEntries(classes.map((c) => [c.id, c]));
  const allStudents = (await Promise.all(classes.map((c) => studentRepo.getByClass(c.id)))).flat();

  const addBtn = Button({
    label: "+ Tambah Siswa",
    variant: "secondary",
    block: true,
    disabled: classes.length === 0,
    onClick: () => openStudentForm(null, classes),
  });
  addBtn.style.marginBottom = "var(--space-3)";
  container.appendChild(addBtn);

  const bulkAddBtn = Button({
    label: "+ Tambah Banyak Siswa",
    variant: "secondary",
    block: true,
    disabled: classes.length === 0,
    onClick: () => openBulkStudentForm(classes),
  });
  bulkAddBtn.style.marginBottom = "var(--space-4)";
  container.appendChild(bulkAddBtn);

  if (classes.length === 0) {
    container.appendChild(emptyState("Buat Kelas terlebih dahulu."));
    return;
  }

  if (allStudents.length === 0) {
    container.appendChild(emptyState("Belum ada data siswa."));
    return;
  }

  const filterBar = document.createElement("div");
  filterBar.className = "search-bar";
  const searchInput = Input({
    label: "Cari Nama / NIS",
    placeholder: "Ketik nama atau NIS...",
    value: studentSearchQuery,
  });
  const classFilter = Select({
    label: "Filter Kelas",
    value: studentClassFilterId,
    options: [{ value: "", label: "Semua Kelas" }, ...classes.map((c) => ({ value: c.id, label: c.name }))],
  });
  filterBar.appendChild(searchInput);
  filterBar.appendChild(classFilter);
  container.appendChild(filterBar);

  const listContainer = document.createElement("div");
  container.appendChild(listContainer);

  function renderStudentList() {
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
      listContainer.appendChild(emptyState("Siswa tidak ditemukan."));
      return;
    }

    const list = document.createElement("div");
    list.className = "list";

    filtered.forEach((student) => {
      const row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML = `<div class="list-row__main">
        <span class="list-row__title">${escapeHtml(student.name)} <span class="student-warning-flag" data-student="${student.id}"></span></span>
        <span class="list-row__subtitle">NIS ${escapeHtml(student.nis)} · ${escapeHtml(classById[student.classId]?.name || "-")}</span>
      </div>`;

      const actions = document.createElement("div");
      actions.className = "list-row__actions";
      actions.appendChild(
        iconButton("📋", "Riwayat", () => {
          window.location.href = `../history/index.html?studentId=${student.id}`;
        })
      );
      actions.appendChild(iconButton("✎", "Edit", () => openStudentForm(student, classes)));
      actions.appendChild(
        iconButton("🗑", "Hapus", () =>
          confirmDelete(`Hapus siswa "${student.name}"? Riwayat kehadiran tetap tersimpan.`, () => studentRepo.remove(student.id))
        )
      );
      row.appendChild(actions);

      list.appendChild(Card({ content: row }));
    });

    listContainer.appendChild(list);

    // Peringatan dihitung async per siswa agar daftar tetap cepat tampil.
    filtered.forEach(async (student) => {
      const timeline = await attendanceRepo.getStudentTimeline(student.id);
      const warnings = computeWarnings(timeline);
      if (warnings.length === 0) return;
      const flag = list.querySelector(`.student-warning-flag[data-student="${student.id}"]`);
      if (flag) {
        flag.textContent = "⚠";
        flag.title = warnings.map((w) => w.message).join(" · ");
      }
    });
  }

  searchInput.inputEl.addEventListener("input", () => {
    studentSearchQuery = searchInput.inputEl.value;
    renderStudentList();
  });
  classFilter.selectEl.addEventListener("change", () => {
    studentClassFilterId = classFilter.selectEl.value;
    renderStudentList();
  });

  renderStudentList();
}

function openStudentForm(existing, classes) {
  const nameInput = Input({ label: "Nama Siswa", value: existing?.name || "" });
  const nisInput = Input({ label: "NIS", value: existing?.nis || "" });
  const genderSelect = Select({
    label: "Jenis Kelamin",
    value: existing?.gender || "L",
    options: [
      { value: "L", label: "Laki-laki" },
      { value: "P", label: "Perempuan" },
    ],
  });
  const classSelect = Select({
    label: "Kelas",
    value: existing?.classId || classes[0]?.id || "",
    options: classes.map((c) => ({ value: c.id, label: c.name })),
  });

  const form = document.createElement("div");
  form.className = "sheet-form";
  form.innerHTML = `<h3>${existing ? "Edit" : "Tambah"} Siswa</h3>`;
  form.appendChild(nameInput);
  form.appendChild(nisInput);
  form.appendChild(genderSelect);
  form.appendChild(classSelect);

  const saveBtn = Button({
    label: "Simpan",
    variant: "primary",
    block: true,
    onClick: async () => {
      const name = nameInput.inputEl.value.trim();
      const nis = nisInput.inputEl.value.trim();
      const gender = genderSelect.selectEl.value;
      const classId = classSelect.selectEl.value;
      if (!name || !classId) return;
      if (existing) await studentRepo.update(existing.id, { name, nis, gender, classId });
      else await studentRepo.create({ name, nis, gender, classId });
      sheet.close();
      renderTabContent();
    },
  });
  form.appendChild(saveBtn);

  const sheet = openSheet(form);
}

/** Naikkan NIS numerik satu angka, pertahankan jumlah digit (leading zero). Non-numerik -> "" (tidak di-auto). */
function nextNis(current) {
  if (!/^\d+$/.test(current)) return "";
  const next = (BigInt(current) + 1n).toString();
  return next.padStart(current.length, "0");
}

/** "L"/"P" (case-insensitive) -> kode gender baku, selain itu -> null (bukan token gender). */
function parseGenderToken(token) {
  const t = (token || "").trim().toUpperCase();
  return t === "L" || t === "P" ? t : null;
}

/**
 * Tambah Banyak Siswa (bulk).
 * Guru menempel daftar nama, satu siswa per baris, format bebas:
 *   Nama
 *   Nama, NIS
 *   Nama, L/P
 *   Nama, NIS, L/P
 * Token terakhir "L" atau "P" (huruf besar/kecil) di baris dibaca sebagai jenis kelamin
 * khusus baris itu; kalau tidak ada, dipakai "Jenis Kelamin Default" di atas.
 * Kalau "NIS Awal" diisi, baris tanpa NIS otomatis dapat nomor urut berikutnya —
 * guru tidak perlu ketik atau edit NIS maupun jenis kelamin satu-satu lagi.
 * Semua siswa masuk ke satu Kelas yang dipilih.
 */
function openBulkStudentForm(classes) {
  const classSelect = Select({
    label: "Kelas Tujuan",
    value: classes[0]?.id || "",
    options: classes.map((c) => ({ value: c.id, label: c.name })),
  });

  const genderDefaultSelect = Select({
    label: "Jenis Kelamin Default",
    value: "L",
    options: [
      { value: "L", label: "Laki-laki" },
      { value: "P", label: "Perempuan" },
    ],
  });

  const nisStartInput = Input({
    label: "NIS Awal (opsional)",
    placeholder: "contoh: 2026001",
  });

  const nisHint = document.createElement("p");
  nisHint.style.color = "var(--color-ink-muted)";
  nisHint.style.fontSize = "var(--text-xs)";
  nisHint.style.margin = "calc(-1 * var(--space-2)) 0 var(--space-3)";
  nisHint.textContent =
    "Kalau diisi, tiap nama tanpa NIS di bawah otomatis dapat nomor urut berikutnya. Baris yang sudah punya NIS sendiri tidak diubah.";

  const textareaWrap = document.createElement("div");
  textareaWrap.className = "field";
  const textareaLabel = document.createElement("label");
  textareaLabel.className = "field__label";
  textareaLabel.textContent = "Daftar Siswa (satu nama per baris)";
  const textarea = document.createElement("textarea");
  textarea.className = "field__input";
  textarea.rows = 8;
  textarea.placeholder = "Andi\nBudi, P\nCitra, 2026099, P";
  textareaWrap.appendChild(textareaLabel);
  textareaWrap.appendChild(textarea);

  const hint = document.createElement("p");
  hint.style.color = "var(--color-ink-muted)";
  hint.style.fontSize = "var(--text-xs)";
  hint.style.marginTop = "var(--space-1)";
  hint.textContent =
    "Format: Nama saja, atau tambahkan koma untuk NIS dan/atau L/P custom per baris (Nama, NIS, L/P). Baris tanpa L/P memakai Jenis Kelamin Default di atas.";
  textareaWrap.appendChild(hint);

  const form = document.createElement("div");
  form.className = "sheet-form";
  form.innerHTML = `<h3>Tambah Banyak Siswa</h3>`;
  form.appendChild(classSelect);
  form.appendChild(genderDefaultSelect);
  form.appendChild(nisStartInput);
  form.appendChild(nisHint);
  form.appendChild(textareaWrap);

  const errorEl = document.createElement("p");
  errorEl.style.color = "var(--color-danger)";
  errorEl.style.fontSize = "var(--text-sm)";
  errorEl.style.display = "none";
  form.appendChild(errorEl);

  const saveBtn = Button({
    label: "Tambah Semua",
    variant: "primary",
    block: true,
    onClick: async () => {
      const classId = classSelect.selectEl.value;
      const lines = textarea.value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (!classId || lines.length === 0) {
        errorEl.textContent = "Pilih kelas dan isi minimal satu nama siswa.";
        errorEl.style.display = "block";
        return;
      }

      let autoNis = nisStartInput.inputEl.value.trim();
      const defaultGender = genderDefaultSelect.selectEl.value;

      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim());
        const name = parts[0] || "";
        if (!name) continue;

        // Token L/P di posisi terakhir (kalau ada) dibaca sebagai gender khusus baris ini.
        let rest = parts.slice(1);
        let gender = defaultGender;
        if (rest.length > 0) {
          const lastToken = parseGenderToken(rest[rest.length - 1]);
          if (lastToken) {
            gender = lastToken;
            rest = rest.slice(0, -1);
          }
        }
        let nis = rest[0] || "";

        if (!nis && autoNis) {
          nis = autoNis;
          autoNis = nextNis(autoNis);
        }

        await studentRepo.create({ classId, nis, name, gender });
      }

      sheet.close();
      showToast({ message: `${lines.length} siswa berhasil ditambahkan.` });
      renderTabContent();
    },
  });
  form.appendChild(saveBtn);

  const sheet = openSheet(form);
}

/* ---------------- Schedule Tab ---------------- */

async function renderScheduleTab(container) {
  const classes = await classRepo.getAll();
  const classById = Object.fromEntries(classes.map((c) => [c.id, c]));
  const allSchedules = (await Promise.all(classes.map((c) => scheduleRepo.getByClass(c.id))))
    .flat()
    .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.startTime.localeCompare(b.startTime));

  const addBtn = Button({
    label: "+ Tambah Jadwal",
    variant: "secondary",
    block: true,
    disabled: classes.length === 0,
    onClick: () => openScheduleForm(null, classes, allSchedules),
  });
  addBtn.style.marginBottom = "var(--space-4)";
  container.appendChild(addBtn);

  if (classes.length === 0) {
    container.appendChild(emptyState("Buat Kelas terlebih dahulu."));
    return;
  }

  if (allSchedules.length === 0) {
    container.appendChild(emptyState("Belum ada jadwal."));
    return;
  }

  // Dikelompokkan per hari (Senin → Minggu) supaya guru bisa cepat cek
  // "hari X jadwalnya apa, hari Y ada jadwal atau tidak" untuk satu minggu penuh,
  // bukan cuma hari ini seperti di Beranda.
  const schedulesByDay = Object.fromEntries(DAYS.map((d) => [d, []]));
  allSchedules.forEach((sch) => schedulesByDay[sch.day]?.push(sch));

  DAYS.forEach((day) => {
    const daySchedules = schedulesByDay[day];

    const dayHeading = document.createElement("h3");
    dayHeading.className = "schedule-day-heading";
    dayHeading.textContent = day;
    container.appendChild(dayHeading);

    if (daySchedules.length === 0) {
      const empty = document.createElement("p");
      empty.className = "schedule-day-empty";
      empty.textContent = "Tidak ada jadwal.";
      container.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "list";

    daySchedules.forEach((sch) => {
      const row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML = `<div class="list-row__main">
        <span class="list-row__title">${escapeHtml(sch.subject)} · ${escapeHtml(classById[sch.classId]?.name || "-")}</span>
        <span class="list-row__subtitle">${escapeHtml(sch.startTime)}–${escapeHtml(sch.endTime)}</span>
      </div>`;

      const actions = document.createElement("div");
      actions.className = "list-row__actions";
      actions.appendChild(iconButton("✎", "Edit", () => openScheduleForm(sch, classes, allSchedules)));
      actions.appendChild(
        iconButton("🗑", "Hapus", () =>
          confirmDelete(`Hapus jadwal "${sch.subject}" (${sch.day})?`, () => scheduleRepo.remove(sch.id))
        )
      );
      row.appendChild(actions);

      list.appendChild(Card({ content: row }));
    });

    container.appendChild(list);
  });
}

/**
 * Cari mapel yang paling sering dipakai dari jadwal yang sudah ada.
 * Kebanyakan guru hanya mengajar satu mapel untuk banyak kelas — dengan ini,
 * field Mapel pada "Tambah Jadwal" otomatis terisi setelah jadwal pertama dibuat,
 * jadi guru satu-mapel tidak perlu mengetik ulang tiap kali tambah jadwal.
 */
function mostCommonSubject(schedules) {
  if (!schedules || schedules.length === 0) return "";
  const counts = {};
  schedules.forEach((s) => {
    counts[s.subject] = (counts[s.subject] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function openScheduleForm(existing, classes, allSchedules = []) {
  const subjectInput = Input({
    label: "Mata Pelajaran",
    value: existing?.subject || mostCommonSubject(allSchedules),
  });
  // Saran mapel yang pernah dipakai — berguna untuk sebagian kecil guru yang
  // mengajar 2-3 mapel berbeda, tanpa memaksa semua orang pakai dropdown.
  const subjectOptions = [...new Set(allSchedules.map((s) => s.subject).filter(Boolean))];
  if (subjectOptions.length > 0) {
    const datalist = document.createElement("datalist");
    datalist.id = "subject-suggestions";
    subjectOptions.forEach((subj) => {
      const option = document.createElement("option");
      option.value = subj;
      datalist.appendChild(option);
    });
    subjectInput.appendChild(datalist);
    subjectInput.inputEl.setAttribute("list", "subject-suggestions");
  }
  const classSelect = Select({
    label: "Kelas",
    value: existing?.classId || classes[0]?.id || "",
    options: classes.map((c) => ({ value: c.id, label: c.name })),
  });
  const daySelect = Select({
    label: "Hari",
    value: existing?.day || DAYS[0],
    options: DAYS.map((d) => ({ value: d, label: d })),
  });
  const startInput = Input({ label: "Jam Mulai", type: "time", value: existing?.startTime || "07:00" });
  const endInput = Input({ label: "Jam Selesai", type: "time", value: existing?.endTime || "08:00" });

  const form = document.createElement("div");
  form.className = "sheet-form";
  form.innerHTML = `<h3>${existing ? "Edit" : "Tambah"} Jadwal</h3>`;
  form.appendChild(subjectInput);
  form.appendChild(classSelect);
  form.appendChild(daySelect);
  form.appendChild(startInput);
  form.appendChild(endInput);

  const saveBtn = Button({
    label: "Simpan",
    variant: "primary",
    block: true,
    onClick: async () => {
      const subject = subjectInput.inputEl.value.trim();
      const classId = classSelect.selectEl.value;
      const day = daySelect.selectEl.value;
      const startTime = startInput.inputEl.value;
      const endTime = endInput.inputEl.value;
      if (!subject || !classId || !startTime || !endTime) return;
      if (existing) await scheduleRepo.update(existing.id, { subject, classId, day, startTime, endTime });
      else await scheduleRepo.create({ subject, classId, day, startTime, endTime });
      sheet.close();
      renderTabContent();
    },
  });
  form.appendChild(saveBtn);

  const sheet = openSheet(form);
}

/* ---------------- Shell ---------------- */

const RENDERERS = {
  academicYear: renderAcademicYearTab,
  class: renderClassTab,
  student: renderStudentTab,
  schedule: renderScheduleTab,
};

async function renderTabContent() {
  const container = document.getElementById("tab-content");
  showLoading(container, "Memuat data...");
  try {
    const built = document.createElement("div");
    await RENDERERS[activeTab](built);
    container.innerHTML = "";
    container.append(...built.childNodes);
  } catch (err) {
    console.error(err);
    showError(container, "Gagal memuat data. Coba pilih tab lain lalu kembali.");
  }
}

function renderShell() {
  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Data Master" }));
  app.appendChild(BottomNav({ active: "data" }));

  const tabs = document.createElement("div");
  tabs.className = "tabs";
  TABS.forEach((tab) => {
    const btn = document.createElement("button");
    btn.className = `tab${tab.key === activeTab ? " tab--active" : ""}`;
    btn.textContent = tab.label;
    btn.addEventListener("click", () => {
      activeTab = tab.key;
      renderShell();
    });
    tabs.appendChild(btn);
  });
  app.appendChild(tabs);

  const main = document.createElement("main");
  main.id = "tab-content";
  app.appendChild(main);

  renderTabContent();
}

async function main() {
  try {
    await openDB();
    renderShell();
  } catch (err) {
    console.error(err);
    showError(app, "Gagal memuat aplikasi. Coba muat ulang halaman.");
  }
}

main();
