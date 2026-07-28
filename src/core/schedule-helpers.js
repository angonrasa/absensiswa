/**
 * Cari mapel yang paling sering dipakai dari jadwal yang sudah ada.
 * Kebanyakan guru hanya mengajar satu mapel untuk banyak kelas — dengan ini,
 * field Mapel pada "Tambah Jadwal" otomatis terisi setelah jadwal pertama dibuat,
 * jadi guru satu-mapel tidak perlu mengetik ulang tiap kali tambah jadwal.
 */
export function mostCommonSubject(schedules) {
  if (!schedules || schedules.length === 0) return "";
  const counts = {};
  schedules.forEach((s) => {
    counts[s.subject] = (counts[s.subject] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
