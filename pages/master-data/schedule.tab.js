import { escapeHtml } from "../../src/core/html.js";
import { buildScheduleFields } from "../../src/core/schedule-fields.js";
import { Button, Card } from "../../src/components/components.js";
import {
  openSheet,
  confirmDelete,
  emptyState,
  iconButton,
  renderTabContent,
  classRepo,
  scheduleRepo,
  DAYS,
} from "./master-data.js";

/* ---------------- Schedule Tab ---------------- */

export async function renderScheduleTab(container) {
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

export function openScheduleForm(existing, classes, allSchedules = []) {
  const { subjectInput, classSelect, daySelect, startInput, endInput, getValue, validate } = buildScheduleFields(
    classes,
    allSchedules,
    { existing }
  );

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
      if (!validate()) return;
      const { subject, classId, day, startTime, endTime } = getValue();
      if (existing) await scheduleRepo.update(existing.id, { subject, classId, day, startTime, endTime });
      else await scheduleRepo.create({ subject, classId, day, startTime, endTime });
      sheet.close();
      renderTabContent();
    },
  });
  form.appendChild(saveBtn);

  const sheet = openSheet(form);
}
