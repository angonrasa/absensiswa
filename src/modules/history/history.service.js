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
