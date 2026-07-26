/**
 * Helper tampilan loading & error yang seragam di semua halaman.
 * KISS: teks sederhana, bukan skeleton animasi kompleks.
 */

export function showLoading(container, label = "Memuat...") {
  container.innerHTML = `
    <div class="page-loading">
      <div class="page-loading__spinner"></div>
      <span>${label}</span>
    </div>
  `;
}

export function showError(container, message = "Terjadi kesalahan. Coba muat ulang halaman.") {
  container.innerHTML = `
    <div class="page-error">
      <span>⚠</span>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Bungkus fungsi async utama halaman: tampilkan loading, lalu render,
 * dan tangkap error supaya tidak ada layar putih kosong.
 */
export async function runPage(appEl, renderFn) {
  showLoading(appEl);
  try {
    await renderFn();
  } catch (err) {
    console.error(err);
    showError(appEl, "Gagal memuat halaman. Coba muat ulang.");
  }
}
