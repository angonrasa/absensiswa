import { Input, Select } from "../components/components.js";
import { mostCommonSubject } from "./schedule-helpers.js";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

/**
 * Bangun field Mata Pelajaran (dengan saran/datalist), Kelas, Hari, Jam Mulai,
 * dan Jam Selesai — dipakai baik oleh form modal Data Master (edit satu jadwal)
 * maupun step inline Wizard (tambah jadwal berkali-kali).
 *
 * Field & validasi terverifikasi identik di kedua tempat, KECUALI nilai default
 * Kelas: Data Master memilih kelas milik jadwal yang diedit, Wizard memilih
 * kelas yang baru saja ditambahkan di Step 1 (`lastAddedClassId`). Perbedaan
 * ini diparameterkan lewat `defaultClassId`, bukan disembunyikan — pemanggil
 * tetap yang menentukan nilainya.
 *
 * @param {Array} classes - daftar Class
 * @param {Array} allSchedules - seluruh jadwal yang sudah ada (untuk saran mapel)
 * @param {{ existing?: Object|null, defaultClassId?: string }} options
 * @returns {{ subjectInput, classSelect, daySelect, startInput, endInput,
 *   getValue: () => {subject, classId, day, startTime, endTime}, validate: () => boolean }}
 */
export function buildScheduleFields(classes, allSchedules = [], { existing = null, defaultClassId } = {}) {
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
    value: existing?.classId || defaultClassId || classes[0]?.id || "",
    options: classes.map((c) => ({ value: c.id, label: c.name })),
  });
  const daySelect = Select({
    label: "Hari",
    value: existing?.day || DAYS[0],
    options: DAYS.map((d) => ({ value: d, label: d })),
  });
  const startInput = Input({ label: "Jam Mulai", type: "time", value: existing?.startTime || "07:00" });
  const endInput = Input({ label: "Jam Selesai", type: "time", value: existing?.endTime || "08:00" });

  function getValue() {
    return {
      subject: subjectInput.inputEl.value.trim(),
      classId: classSelect.selectEl.value,
      day: daySelect.selectEl.value,
      startTime: startInput.inputEl.value,
      endTime: endInput.inputEl.value,
    };
  }

  function validate() {
    const { subject, classId, startTime, endTime } = getValue();
    return Boolean(subject && classId && startTime && endTime);
  }

  return { subjectInput, classSelect, daySelect, startInput, endInput, getValue, validate };
}
