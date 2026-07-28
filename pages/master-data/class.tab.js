import { escapeHtml } from "../../src/core/html.js";
import { buildClassFields } from "../../src/core/class-fields.js";
import { Button, Card } from "../../src/components/components.js";
import {
  openSheet,
  confirmDelete,
  emptyState,
  iconButton,
  renderTabContent,
  academicYearRepo,
  classRepo,
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
