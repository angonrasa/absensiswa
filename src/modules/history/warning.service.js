/*
  Warning Engine — Milestone 6
  Tidak menyimpan apapun; selalu dihitung ulang dari timeline (AttendanceRecord),
  konsisten dengan prinsip "Tidak menyimpan data yang dapat dihitung ulang."
*/

export const WARNING_THRESHOLD = {
  ALPHA_CONSECUTIVE: 3, // Alpha 3 kali berturut-turut (03-Algoritma-Pendamping.md)
  ALPHA_MONTHLY: 4, // Alpha 4 kali dalam 1 bulan (03-Algoritma-Pendamping.md)
  SICK_MONTHLY: 3, // Sakit berulang — nilai default, dapat diubah
};

function countConsecutiveFromEnd(timeline, status) {
  let count = 0;
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (timeline[i].status === status) count++;
    else break;
  }
  return count;
}

function countInMonth(timeline, status, referenceDate) {
  const targetMonth = referenceDate.toISOString().slice(0, 7);
  return timeline.filter((entry) => entry.status === status && entry.date.slice(0, 7) === targetMonth).length;
}

// Hotfix 1.0.1 — Isu 2: urutan prioritas saat 1 tanggal punya lebih dari 1
// entri (kasus 2 sesi dalam 1 hari, mis. 1 JP sebelum istirahat + 2 JP
// sesudahnya). Paling genting duluan — kalau salah satu sesi hari itu
// alpha, hari itu dihitung alpha untuk keperluan peringatan dini.
const DAILY_STATUS_PRIORITY = ["absent", "sick", "permission", "present"];

/**
 * Kelompokkan timeline per-tanggal supaya 1 hari dengan lebih dari 1 sesi
 * (kelas yang jadwalnya dipecah sebelum/sesudah istirahat) tetap dihitung
 * sebagai 1 hari saat menghitung streak/bulanan — bukan 2. Tanggal dengan
 * 1 entri (mayoritas kasus) tidak berubah sama sekali.
 */
function collapseByDate(timeline) {
  const byDate = new Map();
  for (const entry of timeline) {
    const existing = byDate.get(entry.date);
    if (!existing || DAILY_STATUS_PRIORITY.indexOf(entry.status) < DAILY_STATUS_PRIORITY.indexOf(existing.status)) {
      byDate.set(entry.date, entry);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Hitung peringatan dini dari timeline satu siswa (terurut tanggal, ascending).
 * Mengembalikan array warning; kosong berarti tidak ada peringatan.
 */
export function computeWarnings(timeline, referenceDate = new Date()) {
  const warnings = [];
  const dailyTimeline = collapseByDate(timeline);

  const consecutiveAlpha = countConsecutiveFromEnd(dailyTimeline, "absent");
  if (consecutiveAlpha >= WARNING_THRESHOLD.ALPHA_CONSECUTIVE) {
    warnings.push({
      type: "alpha_consecutive",
      message: `Tidak hadir ${consecutiveAlpha} kali berturut-turut.`,
    });
  }

  const monthlyAlpha = countInMonth(dailyTimeline, "absent", referenceDate);
  if (monthlyAlpha >= WARNING_THRESHOLD.ALPHA_MONTHLY) {
    warnings.push({
      type: "alpha_monthly",
      message: `Alpha ${monthlyAlpha} kali bulan ini.`,
    });
  }

  const monthlySick = countInMonth(dailyTimeline, "sick", referenceDate);
  if (monthlySick >= WARNING_THRESHOLD.SICK_MONTHLY) {
    warnings.push({
      type: "sick_monthly",
      message: `Sakit ${monthlySick} kali bulan ini.`,
    });
  }

  return warnings;
}
