/**
 * Filter timeline kehadiran satu siswa berdasarkan rentang tanggal (inklusif).
 * Fungsi murni, tidak menyentuh DOM. Statistik Hadir/Izin/Sakit/Alpha dari hasil
 * filter ini dihitung lewat AttendanceRepository.buildSummary (sudah bebas DOM
 * sejak awal), tidak diduplikasi di sini.
 *
 * @param {Array<{date: string}>} timeline
 * @param {string} startDate - format YYYY-MM-DD, kosong berarti tidak dibatasi
 * @param {string} endDate - format YYYY-MM-DD, kosong berarti tidak dibatasi
 */
export function filterTimeline(timeline, startDate, endDate) {
  return timeline.filter((entry) => {
    if (startDate && entry.date < startDate) return false;
    if (endDate && entry.date > endDate) return false;
    return true;
  });
}

/**
 * Ringkasan singkat satu baris sesi untuk daftar "Per Kelas" (MVP 2
 * Milestone 4.4), contoh: "Hadir 28, Alpha 2 · Materi: Hukum II Newton".
 * Hadir selalu ditampilkan; Izin/Sakit/Alpha hanya kalau > 0 supaya baris
 * tetap ringkas untuk sesi yang semua siswanya hadir. Materi dipotong
 * pendek — ini cuma sekilas pindai, detail lengkap ada di rekap sesi (4.3).
 *
 * Fungsi murni, tidak menyentuh DOM (dipindah dari pages/history/history.js
 * saat QA Milestone 6, supaya bisa diuji langsung tanpa mock DOM/IndexedDB
 * - mengikuti pola yang sama dengan filterTimeline di file ini).
 *
 * materialTopic opsional - sesi tanpa materi (materi kosong maupun sesi
 * lama dari sebelum field ini ada / undefined) tidak menambah teks apa pun.
 */
export function formatSessionRowSummary(summary, materialTopic) {
  const parts = [`Hadir ${summary.present}`];
  if (summary.permission > 0) parts.push(`Izin ${summary.permission}`);
  if (summary.sick > 0) parts.push(`Sakit ${summary.sick}`);
  if (summary.absent > 0) parts.push(`Alpha ${summary.absent}`);

  let text = parts.join(", ");
  if (materialTopic) {
    const MAX_LEN = 40;
    const snippet =
      materialTopic.length > MAX_LEN ? `${materialTopic.slice(0, MAX_LEN).trim()}…` : materialTopic;
    text += ` · Materi: ${snippet}`;
  }
  return text;
}
