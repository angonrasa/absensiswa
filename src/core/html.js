/**
 * Escape karakter HTML spesial (&, <, >, ", ') supaya teks yang diketik guru
 * (nama siswa, nama kelas, mata pelajaran, dst) aman ditempel lewat innerHTML
 * template string — tidak merusak tampilan kalau kebetulan mengandung "<", "&", dst.
 */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);
}
