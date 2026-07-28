import { Input, Select } from "../components/components.js";

/**
 * Bangun field Nama Kelas, Tingkat, dan Tahun Ajaran — dipakai baik oleh
 * form modal Data Master (edit satu kelas) maupun step inline Wizard
 * (tambah kelas berkali-kali tanpa keluar-masuk modal).
 *
 * Bagian ini (field + validasi) terverifikasi identik di kedua tempat.
 * Orkestrasi UI yang sengaja beda (modal vs inline-tambah-berkali-kali,
 * daftar chip "sudah ditambahkan", dsb) tetap tinggal di masing-masing
 * pemanggil, tidak ikut diekstrak ke sini.
 *
 * @param {Array} years - daftar AcademicYear
 * @param {Object|null} existing - Class yang sedang diedit. `null` untuk mode
 *   tambah (dipakai Wizard, yang tidak punya mode edit).
 * @returns {{ nameInput, gradeInput, yearSelect, getValue: () => {name, grade, academicYearId}, validate: () => boolean }}
 */
export function buildClassFields(years, existing = null) {
  const nameInput = Input({ label: "Nama Kelas", value: existing?.name || "", placeholder: "cth. 7A" });
  const gradeInput = Input({ label: "Tingkat", type: "number", value: existing?.grade ?? "", placeholder: "cth. 7" });
  const yearSelect = Select({
    label: "Tahun Ajaran",
    // existing?.academicYearId (mode edit) → tahun aktif → tahun pertama.
    // Rantai fallback ini superset dari perilaku lama di kedua file (masing-masing
    // hanya memakai sebagian rantainya), tidak mengubah hasil untuk kasus normal.
    value: existing?.academicYearId || years.find((y) => y.isActive)?.id || years[0]?.id || "",
    options: years.map((y) => ({ value: y.id, label: y.name })),
  });

  function getValue() {
    return {
      name: nameInput.inputEl.value.trim(),
      grade: Number(gradeInput.inputEl.value),
      academicYearId: yearSelect.selectEl.value,
    };
  }

  function validate() {
    const { name, academicYearId } = getValue();
    return Boolean(name && academicYearId);
  }

  return { nameInput, gradeInput, yearSelect, getValue, validate };
}
