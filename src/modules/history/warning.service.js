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

/**
 * Hitung peringatan dini dari timeline satu siswa (terurut tanggal, ascending).
 * Mengembalikan array warning; kosong berarti tidak ada peringatan.
 */
export function computeWarnings(timeline, referenceDate = new Date()) {
  const warnings = [];

  const consecutiveAlpha = countConsecutiveFromEnd(timeline, "absent");
  if (consecutiveAlpha >= WARNING_THRESHOLD.ALPHA_CONSECUTIVE) {
    warnings.push({
      type: "alpha_consecutive",
      message: `Tidak hadir ${consecutiveAlpha} kali berturut-turut.`,
    });
  }

  const monthlyAlpha = countInMonth(timeline, "absent", referenceDate);
  if (monthlyAlpha >= WARNING_THRESHOLD.ALPHA_MONTHLY) {
    warnings.push({
      type: "alpha_monthly",
      message: `Alpha ${monthlyAlpha} kali bulan ini.`,
    });
  }

  const monthlySick = countInMonth(timeline, "sick", referenceDate);
  if (monthlySick >= WARNING_THRESHOLD.SICK_MONTHLY) {
    warnings.push({
      type: "sick_monthly",
      message: `Sakit ${monthlySick} kali bulan ini.`,
    });
  }

  return warnings;
}
