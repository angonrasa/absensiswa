import { nextNis, parseGenderToken } from "./student-helpers.js";

/**
 * Parse isi textarea "Tambah Banyak Siswa" jadi daftar siswa siap disimpan.
 *
 * Catatan hasil perbandingan (0.3.4): field UI "Tambah Banyak Siswa" di Data
 * Master (`Select` "Kelas Tujuan", textarea 8 baris) dan di Step 2 Wizard
 * (`Select` "Kelas" dengan default `lastAddedClassId`, textarea 6 baris)
 * TIDAK identik — label beda, jumlah baris textarea beda, dan logika pemilihan
 * kelas default beda (wizard sengaja mengingat kelas yang baru dibuat di Step 1).
 * Karena itu tidak dibuat `student-fields.js` untuk UI-nya.
 *
 * Yang identik karakter-per-karakter di kedua tempat adalah logika PARSE baris
 * teks → { name, nis, gender } (termasuk NIS auto-urut & token L/P per baris).
 * Hanya bagian itu yang diekstrak ke sini, sebagai fungsi murni tanpa DOM.
 *
 * Format per baris: "Nama" | "Nama, NIS" | "Nama, L/P" | "Nama, NIS, L/P"
 *
 * @param {string} text - isi textarea, satu siswa per baris
 * @param {{ defaultGender: string, nisStart?: string }} options
 * @returns {{ name: string, nis: string, gender: string }[]}
 */
export function parseBulkStudentLines(text, { defaultGender, nisStart = "" }) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let autoNis = nisStart;
  const result = [];

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    const name = parts[0] || "";
    if (!name) continue;

    // Token L/P di posisi terakhir (kalau ada) dibaca sebagai gender khusus baris ini.
    let rest = parts.slice(1);
    let gender = defaultGender;
    if (rest.length > 0) {
      const lastToken = parseGenderToken(rest[rest.length - 1]);
      if (lastToken) {
        gender = lastToken;
        rest = rest.slice(0, -1);
      }
    }
    let nis = rest[0] || "";

    if (!nis && autoNis) {
      nis = autoNis;
      autoNis = nextNis(autoNis);
    }

    result.push({ name, nis, gender });
  }

  return result;
}
