import { withStore, requestToPromise, STORE } from "../../database/db.js";

const CONFIG_ID = "app";

/**
 * Default lengkap untuk SEMUA field Settings yang pernah ada.
 * MVP2 Milestone 7.1 — tambah autoBackupEnabled & lastBackupAt, mengikuti
 * pola field hasSeenOnboarding (R7.1): field baru pada baris config yang
 * sudah ada, BUKAN store/tabel baru, BUKAN bump DB_VERSION di db.js (store
 * SETTINGS sudah generik/schemaless sejak awal, jadi tidak perlu upgrade
 * IndexedDB apa pun untuk ini).
 *
 * Diekspor (bukan hanya dipakai internal) supaya bisa di-unit-test langsung
 * tanpa IndexedDB — lihat tests/backup-reminder.test.mjs.
 */
export function defaultConfig() {
  return {
    id: CONFIG_ID,
    hasSeenOnboarding: false,
    autoBackupEnabled: true, // MVP2 M7.1 — default aktif untuk pengguna baru
    lastBackupAt: null, // MVP2 M7.1 — null = belum pernah backup sama sekali
  };
}

export class SettingsRepository {
  /**
   * Ambil config. Kalau belum pernah disimpan sama sekali, kembalikan default
   * (tidak menulis apa pun).
   *
   * MVP2 M7.1 — PENTING untuk keamanan data lama: baris config yang SUDAH
   * ADA di database (baik dari pengguna lama sebelum M7, maupun hasil
   * import file backup lama yang tidak punya autoBackupEnabled/lastBackupAt
   * sama sekali) di-*merge* dengan defaultConfig() di sini, bukan ditimpa.
   * Jadi field baru otomatis dapat nilai default yang aman tanpa perlu
   * migrasi/tulis-ulang baris yang sudah ada, dan field lama
   * (hasSeenOnboarding, dll.) tetap persis seperti yang tersimpan.
   */
  async getConfig() {
    const config = await withStore(STORE.SETTINGS, "readonly", (store) =>
      requestToPromise(store.get(CONFIG_ID))
    );
    return config ? { ...defaultConfig(), ...config } : defaultConfig();
  }

  async setHasSeenOnboarding(value) {
    const current = await this.getConfig();
    const updated = { ...current, hasSeenOnboarding: Boolean(value) };
    // FIX: getConfig() membungkus store.get() dengan requestToPromise, tapi
    // di sini store.put() TIDAK dibungkus — jadi await di atasnya cuma
    // menunggu callback selesai dieksekusi, bukan menunggu transaksi tulis
    // benar-benar commit. Ini race condition: kalau pemanggil (wizard.js
    // skipAll()/doneBtn) langsung window.location.href = "..." setelah
    // await ini, navigasi bisa terjadi sebelum tulisan IndexedDB commit,
    // jadi hasSeenOnboarding gagal tersimpan dan app balik ke wizard lagi.
    await withStore(STORE.SETTINGS, "readwrite", (store) =>
      requestToPromise(store.put(updated))
    );
    return updated;
  }

  /**
   * MVP2 M7.4 — toggle di Pengaturan. Pola sama persis dengan
   * setHasSeenOnboarding (bukan aksi merusak data, tidak perlu konfirmasi).
   */
  async setAutoBackupEnabled(value) {
    const current = await this.getConfig();
    const updated = { ...current, autoBackupEnabled: Boolean(value) };
    await withStore(STORE.SETTINGS, "readwrite", (store) =>
      requestToPromise(store.put(updated))
    );
    return updated;
  }

  /**
   * MVP2 M7.3/7.7 — dipanggil setelah backup (otomatis maupun manual)
   * sukses, supaya checkBackupReminder() (backup.service.js) selalu akurat
   * tidak peduli backup dipicu dari mana.
   */
  async setLastBackupAt(isoString) {
    const current = await this.getConfig();
    const updated = { ...current, lastBackupAt: isoString };
    await withStore(STORE.SETTINGS, "readwrite", (store) =>
      requestToPromise(store.put(updated))
    );
    return updated;
  }

  /**
   * R7.2 — Migrasi pengguna lama.
   * Hanya jalan SEKALI: kalau baris config di store SETTINGS belum pernah ada
   * sama sekali (bukan sekadar hasSeenOnboarding === false). Begitu ada baris
   * config (apa pun isinya), migrasi tidak menimpanya lagi.
   *
   * MVP2 M7.1 — TIDAK ADA migrasi tambahan di sini untuk autoBackupEnabled/
   * lastBackupAt. Sengaja: pengguna yang baris config-nya sudah ada dari
   * sebelum M7 dibiarkan apa adanya di database; nilai default untuk 2
   * field baru cukup ditangani oleh getConfig() (merge saat baca) di atas.
   * Ini memenuhi syarat "jangan menambah rumit" — tidak perlu menulis ulang
   * baris lama hanya supaya field baru "resmi" tercatat di IndexedDB.
   */
  async migrateIfNeeded({ classCount, studentCount, scheduleCount }) {
    const existing = await withStore(STORE.SETTINGS, "readonly", (store) =>
      requestToPromise(store.get(CONFIG_ID))
    );
    if (existing) return existing;

    const hasSeenOnboarding = SettingsRepository.computeHasSeenOnboarding({
      classCount,
      studentCount,
      scheduleCount,
    });
    return this.setHasSeenOnboarding(hasSeenOnboarding);
  }

  /**
   * Pure function, sengaja dipisah dari IndexedDB supaya bisa di-unit-test
   * langsung tanpa perlu database (lihat pola AttendanceRepository.nextStatus).
   * Aturan R7.2: kalau Kelas/Siswa/Jadwal ATAU salah satu sudah terisi,
   * anggap pengguna lama — wizard tidak boleh muncul.
   */
  static computeHasSeenOnboarding({ classCount = 0, studentCount = 0, scheduleCount = 0 } = {}) {
    return classCount > 0 || studentCount > 0 || scheduleCount > 0;
  }
}
