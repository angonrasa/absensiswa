import { escapeHtml } from "../../src/core/html.js";
import { buildClassFields } from "../../src/core/class-fields.js";
import { Button, Card } from "../../src/components/components.js";
import {
  openSheet,
  confirmDelete,
  confirmBulkDelete,
  emptyState,
  iconButton,
  renderTabContent,
  academicYearRepo,
  classRepo,
  selectableRow,
  selectToggleButton,
} from "./master-data.js";

/* ---------------- Class Tab ---------------- */

export async function renderClassTab(container) {
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

  // MVP 2 Milestone 5.1/5.2 — mode pilih + hapus massal: tombol "Pilih"
  // menampilkan checkbox di tiap baris, "Hapus Terpilih" muncul setelah
  // minimal 1 item dicentang dan menghapus lewat classRepo.remove() yang
  // sudah ada (dipanggil per-id dalam satu aksi).
  let selectionMode = false;
  const selectedIds = new Set();

  const toolbar = document.createElement("div");
  toolbar.className = "selection-toolbar";

  const selectToggleBtn = selectToggleButton(() => {
    selectionMode = !selectionMode;
    selectedIds.clear();
    updateToolbar();
    renderList();
  });
  toolbar.appendChild(selectToggleBtn);

  const bulkDeleteBtn = Button({
    label: "Hapus Terpilih",
    variant: "danger",
    onClick: () => {
      if (selectedIds.size === 0) return;
      confirmBulkDelete(selectedIds.size, async () => {
        await Promise.all([...selectedIds].map((id) => classRepo.remove(id)));
      });
    },
  });
  bulkDeleteBtn.style.display = "none";
  toolbar.appendChild(bulkDeleteBtn);

  container.appendChild(toolbar);

  function updateToolbar() {
    selectToggleBtn.textContent = selectionMode ? "Batal Pilih" : "Pilih";
    bulkDeleteBtn.style.display = selectionMode ? "inline-flex" : "none";
    bulkDeleteBtn.textContent = `Hapus Terpilih (${selectedIds.size})`;
    bulkDeleteBtn.disabled = selectedIds.size === 0;
  }

  const listContainer = document.createElement("div");
  container.appendChild(listContainer);

  function renderList() {
    listContainer.innerHTML = "";

    const list = document.createElement("div");
    list.className = "list";

    classes.forEach((cls) => {
      const mainHtml = `<div class="list-row__main">
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

      const row = selectableRow(mainHtml, {
        selectionMode,
        selected: selectedIds.has(cls.id),
        onToggle: () => {
          if (selectedIds.has(cls.id)) selectedIds.delete(cls.id);
          else selectedIds.add(cls.id);
          updateToolbar();
        },
        actionsEl: actions,
      });

      list.appendChild(Card({ content: row }));
    });

    listContainer.appendChild(list);
  }

  updateToolbar();
  renderList();
}

export function openClassForm(existing, years) {
  const { nameInput, gradeInput, yearSelect, getValue, validate } = buildClassFields(years, existing);

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
      if (!validate()) return;
      const { name, grade, academicYearId } = getValue();
      if (existing) await classRepo.update(existing.id, { name, grade, academicYearId });
      else await classRepo.create({ name, grade, academicYearId });
      sheet.close();
      renderTabContent();
    },
  });
  form.appendChild(saveBtn);

  const sheet = openSheet(form);
}
