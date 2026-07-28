import { parseBulkStudentLines } from "../../src/core/student-bulk-parser.js";
import { Button, Input, Select, showToast } from "../../src/components/components.js";
import { openSheet, renderTabContent, studentRepo } from "./master-data.js";

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
export function openBulkStudentForm(classes) {
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
      const parsed = parseBulkStudentLines(textarea.value, { defaultGender, nisStart: autoNis });

      for (const student of parsed) {
        await studentRepo.create({ classId, ...student });
      }

      sheet.close();
      showToast({ message: `${lines.length} siswa berhasil ditambahkan.` });
      renderTabContent();
    },
  });
  form.appendChild(saveBtn);

  const sheet = openSheet(form);
}
