import { Input, Select } from "../components/components.js";

/**
 * Bangun field Kelas Tujuan, Jenis Kelamin Default, NIS Awal, dan textarea
 * daftar siswa — dipakai baik oleh form "Tambah Banyak Siswa" di Data Master
 * (sekali kirim, lalu modal ditutup) maupun Step 2 Wizard (kirim berkali-kali
 * tanpa keluar-masuk modal, textarea dikosongkan lagi setelah tiap kirim).
 *
 * Field & parsing (lewat parseBulkStudentLines, sudah diekstrak di 0.1) yang
 * identik dikumpulkan di sini. Hint teks, error inline, dan tombol "Tambah"
 * tetap dibangun masing-masing pemanggil karena copy-nya sengaja beda
 * (lihat catatan Milestone 0.3 di 06-Refactor-Pra-MVP2.md).
 *
 * @param {Array} classes - daftar Class
 * @param {{ defaultClassId?: string, classLabel?: string, rows?: number }} options
 * @returns {{ classSelect, genderDefaultSelect, nisStartInput, textareaWrap, textarea,
 *   getLines: () => string[], validate: () => boolean }}
 */
export function buildStudentBulkFields(classes, { defaultClassId, classLabel = "Kelas", rows = 6 } = {}) {
  const classSelect = Select({
    label: classLabel,
    value: defaultClassId && classes.some((c) => c.id === defaultClassId) ? defaultClassId : classes[0]?.id || "",
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

  const nisStartInput = Input({ label: "NIS Awal (opsional)", placeholder: "contoh: 2026001" });

  const textareaWrap = document.createElement("div");
  textareaWrap.className = "field";
  const textareaLabel = document.createElement("label");
  textareaLabel.className = "field__label";
  textareaLabel.textContent = "Daftar Siswa (satu nama per baris)";
  const textarea = document.createElement("textarea");
  textarea.className = "field__input";
  textarea.rows = rows;
  textarea.placeholder = "Andi\nBudi, P\nCitra, 2026099, P";
  textareaWrap.appendChild(textareaLabel);
  textareaWrap.appendChild(textarea);

  function getLines() {
    return textarea.value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  function validate() {
    return Boolean(classSelect.selectEl.value) && getLines().length > 0;
  }

  return { classSelect, genderDefaultSelect, nisStartInput, textareaWrap, textarea, getLines, validate };
}
