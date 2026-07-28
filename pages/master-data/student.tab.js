import { escapeHtml } from "../../src/core/html.js";
import { computeWarnings } from "../../src/modules/history/warning.service.js";
import { Button, Card, Input, Select } from "../../src/components/components.js";
import {
  openSheet,
  confirmDelete,
  confirmBulkDelete,
  emptyState,
  iconButton,
  renderTabContent,
  classRepo,
  studentRepo,
  attendanceRepo,
  selectableRow,
  selectToggleButton,
} from "./master-data.js";
import { openBulkStudentForm } from "./student-bulk.tab.js";

// Bug lama (diperbaiki 2026-07-26): pencarian & filter kelas harus tetap
// tersimpan di level modul, dipulihkan saat tab dirender ulang — bukan ikut
// hilang setiap renderTabContent() memanggil ulang renderStudentTab().
let studentSearchQuery = "";
let studentClassFilterId = "";

/* ---------------- Student Tab ---------------- */

export async function renderStudentTab(container) {
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

  // MVP 2 Milestone 5.1/5.2 — mode pilih + hapus massal: tombol "Pilih"
  // menampilkan checkbox di tiap baris, "Hapus Terpilih" muncul setelah
  // minimal 1 siswa dicentang dan menghapus lewat studentRepo.remove() yang
  // sudah ada (dipanggil per-id dalam satu aksi).
  let selectionMode = false;
  const selectedIds = new Set();

  const toolbar = document.createElement("div");
  toolbar.className = "selection-toolbar";

  const selectToggleBtn = selectToggleButton(() => {
    selectionMode = !selectionMode;
    selectedIds.clear();
    updateToolbar();
    renderStudentList();
  });
  toolbar.appendChild(selectToggleBtn);

  // MVP 2 Milestone 5.3 — "Pilih Semua" hanya berlaku untuk siswa yang
  // sedang terlihat (setelah filter pencarian/kelas), bukan seluruh siswa
  // di semua kelas — sesuai apa yang guru lihat di layar saat itu.
  // `visibleStudents` di-update tiap kali renderStudentList() jalan.
  let visibleStudents = [];

  const selectAllBtn = Button({
    label: "Pilih Semua",
    variant: "secondary",
    onClick: () => {
      const allSelected = visibleStudents.length > 0 && visibleStudents.every((s) => selectedIds.has(s.id));
      if (allSelected) visibleStudents.forEach((s) => selectedIds.delete(s.id));
      else visibleStudents.forEach((s) => selectedIds.add(s.id));
      updateToolbar();
      renderStudentList();
    },
  });
  selectAllBtn.style.display = "none";
  toolbar.appendChild(selectAllBtn);

  const bulkDeleteBtn = Button({
    label: "Hapus Terpilih",
    variant: "danger",
    onClick: () => {
      if (selectedIds.size === 0) return;
      confirmBulkDelete(selectedIds.size, async () => {
        await Promise.all([...selectedIds].map((id) => studentRepo.remove(id)));
      });
    },
  });
  bulkDeleteBtn.style.display = "none";
  toolbar.appendChild(bulkDeleteBtn);

  container.appendChild(toolbar);

  function updateToolbar() {
    selectToggleBtn.textContent = selectionMode ? "Batal Pilih" : "Pilih";
    selectAllBtn.style.display = selectionMode ? "inline-flex" : "none";
    const allSelected = visibleStudents.length > 0 && visibleStudents.every((s) => selectedIds.has(s.id));
    selectAllBtn.textContent = allSelected ? "Batal Semua" : "Pilih Semua";
    bulkDeleteBtn.style.display = selectionMode ? "inline-flex" : "none";
    bulkDeleteBtn.textContent = `Hapus Terpilih (${selectedIds.size})`;
    bulkDeleteBtn.disabled = selectedIds.size === 0;
  }

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

    visibleStudents = filtered;
    // Guru bisa saja mengubah filter sambil mode pilih aktif — item yang
    // sempat tercentang tapi jadi tidak terlihat lagi (di luar filter baru)
    // tetap ada di selectedIds (tidak hilang diam-diam), tapi label "Pilih
    // Semua" mengacu ke daftar yang terlihat saat ini. Refresh toolbar tiap
    // render supaya statusnya tetap akurat.
    updateToolbar();

    listContainer.innerHTML = "";

    if (filtered.length === 0) {
      listContainer.appendChild(emptyState("Siswa tidak ditemukan."));
      return;
    }

    const list = document.createElement("div");
    list.className = "list";

    filtered.forEach((student) => {
      const mainHtml = `<div class="list-row__main">
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

      const row = selectableRow(mainHtml, {
        selectionMode,
        selected: selectedIds.has(student.id),
        onToggle: () => {
          if (selectedIds.has(student.id)) selectedIds.delete(student.id);
          else selectedIds.add(student.id);
          updateToolbar();
        },
        actionsEl: actions,
      });

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

  updateToolbar();
  renderStudentList();
}

export function openStudentForm(existing, classes) {
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


