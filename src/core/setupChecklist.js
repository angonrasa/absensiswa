/*
  src/core/setupChecklist.js
  Milestone R4.3 (dan dipakai ulang di R8/R10 — lihat 05-Roadmap-Redesign-UIUX.md)

  Satu tanggung jawab: menghitung status "sudah/belum" setup awal (Kelas,
  Siswa, Jadwal) dari data asli. Tidak disimpan di database — selalu
  dihitung ulang, konsisten dengan prinsip di 02-Data-Model-Pendamping.md.

  "Tahun ajaran aktif" sengaja selalu `done: true` di sini: tahun ajaran
  dibuat otomatis oleh aplikasi (bukan langkah yang perlu dikerjakan guru),
  sesuai catatan di 00-Blueprint-Pendamping.md & mockup onboarding.
*/

/**
 * @param {Object} counts
 * @param {number} counts.classCount
 * @param {number} counts.studentCount
 * @param {number} counts.scheduleCount
 * @returns {Array<{key:string,label:string,sub:string,done:boolean}>}
 */
export function computeSetupChecklist({ classCount = 0, studentCount = 0, scheduleCount = 0 } = {}) {
  return [
    {
      key: "academicYear",
      label: "Tahun ajaran aktif",
      sub: "Dibuat otomatis oleh aplikasi",
      done: true,
    },
    {
      key: "class",
      label: "Tambah kelas",
      sub: "Contoh: 7A, 7B, 8A",
      done: classCount > 0,
    },
    {
      key: "student",
      label: "Tambah siswa",
      sub: "Satu-satu atau tempel daftar sekaligus",
      done: studentCount > 0,
    },
    {
      key: "schedule",
      label: "Buat jadwal",
      sub: "Jadwal hari ini akan tampil di Beranda",
      done: scheduleCount > 0,
    },
  ];
}

/**
 * @param {Object} counts
 * @returns {boolean} true kalau seluruh langkah setup (di luar tahun ajaran) sudah selesai
 */
export function isSetupComplete(counts) {
  return computeSetupChecklist(counts)
    .filter((step) => step.key !== "academicYear")
    .every((step) => step.done);
}
