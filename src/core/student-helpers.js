/** Naikkan NIS numerik satu angka, pertahankan jumlah digit (leading zero). Non-numerik -> "" (tidak di-auto). */
export function nextNis(current) {
  if (!/^\d+$/.test(current)) return "";
  const next = (BigInt(current) + 1n).toString();
  return next.padStart(current.length, "0");
}

/** "L"/"P" (case-insensitive) -> kode gender baku, selain itu -> null (bukan token gender). */
export function parseGenderToken(token) {
  const t = (token || "").trim().toUpperCase();
  return t === "L" || t === "P" ? t : null;
}
