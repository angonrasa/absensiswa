const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Format Date -> "YYYY-MM-DD" (dipakai sebagai key tanggal di database). */
export function toDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Nama hari dalam Bahasa Indonesia, cocok dengan field `day` pada Schedule. */
export function todayName(date = new Date()) {
  return DAY_NAMES[date.getDay()];
}

/** Format tampilan ringkas, mis. "25 Jul 2026". */
export function formatDisplayDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
