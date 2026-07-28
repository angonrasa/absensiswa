import { escapeHtml } from "../../src/core/html.js";
import { Button, Card, Input, Badge } from "../../src/components/components.js";
import {
  openSheet,
  confirmDelete,
  emptyState,
  iconButton,
  renderTabContent,
  academicYearRepo,
} from "./master-data.js";

/* ---------------- Academic Year Tab ---------------- */

export async function renderAcademicYearTab(container) {
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
