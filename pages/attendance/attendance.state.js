/**
 * State Module — Halaman Absensi
 *
 * Tanggung jawab tunggal: menyimpan state di memori (status kehadiran per
 * siswa, materi, dan dirty-tracking untuk autosave) beserta logika MURNI untuk
 * mendeteksi perubahan. TIDAK mengakses DOM dan TIDAK mengakses
 * database/repository — itu tanggung jawab attendance.js (UI) dan
 * attendance.autosave.js (service). Sesuai Agents-rules: "Pisahkan antara
 * core, service dan ui, jangan dicampur dalam satu file."
 */

export const state = {
  // state: { [studentId]: 'present' | 'permission' | 'sick' | 'absent' }
  statusByStudentId: {},
  students: [],
  currentClass: null,
  currentSchedule: null,

  // MVP 2 Milestone 2 — materi hari ini (opsional, tidak boleh mengganggu
  // absensi < 30 detik).
  materialTopic: "",
  materialNote: "",
  noteExpanded: false,

  // MVP 2 Milestone 8.2 — snapshot status/materi terakhir yang tersimpan (dari
  // sesi yang sudah ada saat halaman dibuka, atau dari default kalau belum ada
  // sesi sama sekali). Dipakai sebagai pembanding untuk mendeteksi ada
  // tidaknya perubahan (dirty state).
  savedStatusByStudentId: {},
  savedMaterialTopic: "",
  savedMaterialNote: "",
  isDirty: false,
};

/** Bandingkan state sekarang dengan snapshot terakhir tersimpan. Fungsi murni. */
export function computeDirty() {
  if (state.materialTopic !== state.savedMaterialTopic) return true;
  if (state.materialNote !== state.savedMaterialNote) return true;
  return Object.keys(state.statusByStudentId).some(
    (studentId) => state.statusByStudentId[studentId] !== state.savedStatusByStudentId[studentId]
  );
}

/** Panggil setiap kali ada tap status atau input materi (Milestone 8.2). */
export function updateDirtyState() {
  state.isDirty = computeDirty();
}

/**
 * Tandai state sekarang sebagai "tersimpan" (baseline baru untuk perbandingan
 * dirty). Dipanggil setelah load awal (main), setelah simpan sukses
 * (handleSave), dan setelah autosave sukses (attendance.autosave.js).
 */
export function markAsSaved() {
  state.savedStatusByStudentId = { ...state.statusByStudentId };
  state.savedMaterialTopic = state.materialTopic;
  state.savedMaterialNote = state.materialNote;
  state.isDirty = false;
}
