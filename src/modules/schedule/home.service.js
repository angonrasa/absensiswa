import { ClassRepository } from "../class/class.repository.js";
import { StudentRepository } from "../student/student.repository.js";
import { AttendanceRepository } from "../attendance/attendance.repository.js";

const classRepo = new ClassRepository();
const studentRepo = new StudentRepository();
const attendanceRepo = new AttendanceRepository();

/**
 * Ringkasan sederhana (Milestone 8): total siswa, hadir hari ini, tidak hadir
 * hari ini, persentase kehadiran. Dihitung langsung dari data, tidak disimpan.
 *
 * `todaysScheduledClassIds` membatasi sesi yang dihitung hanya untuk kelas yang
 * memang berjadwal hari ini. Tanpa ini, sesi absensi lama tetap ikut terhitung
 * meski jadwalnya sudah dipindah ke hari lain (sesi bertanggal "hari ini" tidak
 * otomatis terhapus/dipindah kalau jadwalnya diedit — lihat 01-Arsitektur-Pendamping.md),
 * sehingga statistik bisa menampilkan angka padahal "Jadwal Hari Ini" kosong.
 */
export async function computeTodayStats(dateKey, todaysScheduledClassIds) {
  const classes = await classRepo.getAll();
  const studentLists = await Promise.all(classes.map((c) => studentRepo.getByClass(c.id)));
  const totalStudents = studentLists.reduce((sum, list) => sum + list.length, 0);

  const sessions = (await attendanceRepo.getSessionsByDate(dateKey)).filter((s) =>
    todaysScheduledClassIds.has(s.classId)
  );
  const recordLists = await Promise.all(sessions.map((s) => attendanceRepo.getRecordsBySession(s.id)));
  const allRecordsToday = recordLists.flat();
  const summary = attendanceRepo.buildSummary(allRecordsToday);

  const hadirHariIni = summary.present;
  const tidakHadirHariIni = summary.permission + summary.sick + summary.absent;
  const totalTercatat = hadirHariIni + tidakHadirHariIni;
  const persentase = totalTercatat > 0 ? Math.round((hadirHariIni / totalTercatat) * 100) : null;

  return { totalStudents, hadirHariIni, tidakHadirHariIni, persentase };
}
