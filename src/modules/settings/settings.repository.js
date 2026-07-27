import { withStore, requestToPromise, STORE } from "../../database/db.js";

const CONFIG_ID = "app";

function defaultConfig() {
  return { id: CONFIG_ID, hasSeenOnboarding: false };
}

export class SettingsRepository {
  /** Ambil config. Kalau belum pernah disimpan, kembalikan default (tidak menulis apa pun). */
  async getConfig() {
    const config = await withStore(STORE.SETTINGS, "readonly", (store) =>
      requestToPromise(store.get(CONFIG_ID))
    );
    return config || defaultConfig();
  }

  async setHasSeenOnboarding(value) {
    const current = await this.getConfig();
    const updated = { ...current, hasSeenOnboarding: Boolean(value) };
    await withStore(STORE.SETTINGS, "readwrite", (store) => store.put(updated));
    return updated;
  }

  /**
   * R7.2 — Migrasi pengguna lama.
   * Hanya jalan SEKALI: kalau baris config di store SETTINGS belum pernah ada
   * sama sekali (bukan sekadar hasSeenOnboarding === false). Begitu ada baris
   * config (apa pun isinya), migrasi tidak menimpanya lagi.
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
