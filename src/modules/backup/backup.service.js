import { openDB, withStore, requestToPromise, clearAllStores, STORE } from "../../database/db.js";
import { SettingsRepository } from "../settings/settings.repository.js";

const BACKUP_VERSION = 1;
const settingsRepo = new SettingsRepository();

// 6 entitas inti sesuai 02-Data-Model-Pendamping.md — WAJIB ada di file backup.
const CORE_STORES = [
  STORE.ACADEMIC_YEAR,
  STORE.CLASS,
  STORE.STUDENT,
  STORE.SCHEDULE,
  STORE.ATTENDANCE_SESSION,
  STORE.ATTENDANCE_RECORD,
];

// Store non-inti (preferensi UI, bukan data absensi — lihat catatan R7.1 di
// db.js). OPSIONAL: file backup lama (sebelum store ini ada) harus tetap
// bisa diimpor tanpa ditolak hanya karena tidak punya kunci ini.
const OPTIONAL_STORES = [STORE.SETTINGS];

const ALL_STORES = [...CORE_STORES, ...OPTIONAL_STORES];

/**
 * Export seluruh data ke satu object JSON.
 * Alur: Ambil Semua Tabel -> Serialize ke JSON (03-Algoritma-Pendamping.md).
 */
export async function exportData() {
  const data = {};
  for (const storeName of ALL_STORES) {
    data[storeName] = await withStore(storeName, "readonly", (store) =>
      requestToPromise(store.getAll())
    );
  }

  return {
    meta: {
      app: "teacher-attendance-companion",
      backupVersion: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
    },
    data,
  };
}

/**
 * Trigger download file JSON di browser lewat <a download> bawaan — TIDAK
 * ADA library tambahan. Dipakai baik oleh Export manual maupun Auto Backup
 * (MVP2 M7); file selalu mendarat di folder unduhan bawaan browser (biasanya
 * folder Download perangkat), sesuai batasan yang disepakati untuk
 * Milestone 7 (tidak ada permission/dependency file-system baru).
 */
function triggerDownload(filename, backup) {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Export manual (Blueprint MVP 1 / tombol "Export Data" di Pengaturan). */
export async function exportToFile() {
  const backup = await exportData();
  triggerDownload(`backup-absensi-${new Date().toISOString().slice(0, 10)}.json`, backup);
  // MVP2 M7.7 — backup manual juga update lastBackupAt, supaya
  // checkBackupReminder() di bawah akurat tidak peduli backup dipicu
  // otomatis atau manual.
  await settingsRepo.setLastBackupAt(new Date().toISOString());
}

/**
 * MVP2 Milestone 7.3 — Auto Backup.
 * Dipanggil oleh pemanggil saveAttendance() (pages/attendance/attendance.js)
 * SETELAH absensi berhasil tersimpan — lihat INTEGRASI-attendance.md untuk
 * cuplikan kode yang perlu ditempel di sana (file itu tidak ikut disediakan
 * untuk perubahan ini). Sengaja TIDAK di-await oleh pemanggil (fire-and-
 * forget) supaya tidak menunda tampilnya ringkasan absensi (Blueprint:
 * absensi harus tetap selesai < 30 detik).
 *
 * Aturan:
 * - Tidak jalan kalau autoBackupEnabled === false.
 * - Maksimal 1x per hari (dibandingkan dari tanggal lastBackupAt).
 * - Gagal (mis. browser memblokir download) TIDAK melempar error ke
 *   pemanggil — absensi yang sudah tersimpan tidak boleh terlihat gagal
 *   hanya karena auto-backup gagal.
 */
export async function runAutoBackupIfDue() {
  try {
    const config = await settingsRepo.getConfig();
    if (!config.autoBackupEnabled) return false;

    const today = new Date().toISOString().slice(0, 10);
    const lastBackupDate = config.lastBackupAt ? config.lastBackupAt.slice(0, 10) : null;
    if (lastBackupDate === today) return false; // sudah backup hari ini

    const backup = await exportData();
    // "Download/absensiswa/backup-YYYY-MM-DD.json" sesuai roadmap — path
    // bersarang di atribut `download` didukung browser Chromium (otomatis
    // membuat subfolder di dalam folder Download default). Browser lain
    // akan tetap menyimpan ke folder Download default dengan nama file
    // yang disanitasi. Kedua kasus tetap "folder yang diarahkan sistem",
    // tanpa folder custom / permission tambahan yang diminta ke pengguna.
    triggerDownload(`absensiswa/backup-${today}.json`, backup);
    await settingsRepo.setLastBackupAt(new Date().toISOString());
    return true;
  } catch (err) {
    console.error("Auto backup gagal:", err);
    return false;
  }
}

/**
 * MVP2 Milestone 7.5 — logika murni (pure function, tanpa IndexedDB) supaya
 * bisa di-unit-test langsung, mengikuti pola statis lain di project
 * (mis. AttendanceRepository.pickRecentTopics).
 *
 * autoBackupEnabled === true -> selalu false (pengingat memang hanya untuk
 * kondisi auto backup mati, sesuai roadmap).
 * Kalau mati: hitung hari unik (berdasar `date` sesi, bukan jam) dari
 * AttendanceSession yang baru/berubah (`updatedAt`) sejak lastBackupAt.
 * lastBackupAt kosong -> hitung dari sesi paling awal (semua sesi).
 * >= 3 hari unik -> true.
 */
export function computeBackupReminder({ autoBackupEnabled, lastBackupAt, sessions = [] }) {
  if (autoBackupEnabled) return false;

  const relevant = lastBackupAt
    ? sessions.filter((s) => (s.updatedAt || s.createdAt) > lastBackupAt)
    : sessions;

  const uniqueDates = new Set(relevant.map((s) => s.date));
  return uniqueDates.size >= 3;
}

/** Wrapper yang membaca config + AttendanceSession asli, dipanggil dari UI (Beranda). */
export async function checkBackupReminder() {
  const config = await settingsRepo.getConfig();
  const sessions = await withStore(STORE.ATTENDANCE_SESSION, "readonly", (store) =>
    requestToPromise(store.getAll())
  );
  return computeBackupReminder({
    autoBackupEnabled: config.autoBackupEnabled,
    lastBackupAt: config.lastBackupAt,
    sessions,
  });
}

/**
 * Validasi struktur file backup.
 * Mengikuti Algoritma Import: "Validasi Struktur" sebelum menulis ke database.
 *
 * CORE_STORES wajib berupa array. OPTIONAL_STORES (settings) boleh tidak
 * ada sama sekali di file lama — hanya divalidasi KALAU kuncinya ada tapi
 * bukan array (berarti memang rusak, bukan sekadar backup versi lama).
 *
 * MVP2 M7 — TIDAK ADA perubahan logika di fungsi ini. File backup lama
 * (dari sebelum autoBackupEnabled/lastBackupAt ada) tetap valid apa adanya:
 * baris `settings` di dalamnya (kalau ada) tetap array biasa, cuma berisi
 * objek config yang belum punya 2 field baru — itu ditangani otomatis oleh
 * SettingsRepository.getConfig() (merge dengan default) setelah diimpor,
 * bukan di sini.
 */
export function validateBackup(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    errors.push("File bukan JSON objek yang valid.");
    return { valid: false, errors };
  }

  if (!payload.data || typeof payload.data !== "object") {
    errors.push("Struktur backup tidak memiliki field 'data'.");
    return { valid: false, errors };
  }

  for (const storeName of CORE_STORES) {
    if (!Array.isArray(payload.data[storeName])) {
      errors.push(`Data '${storeName}' tidak ditemukan atau bukan array.`);
    }
  }

  for (const storeName of OPTIONAL_STORES) {
    const present = Object.prototype.hasOwnProperty.call(payload.data, storeName);
    if (present && !Array.isArray(payload.data[storeName])) {
      errors.push(`Data '${storeName}' ada tapi bukan array.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Import data dari objek backup. Memanggil clearAllStores() terlebih dahulu (overwrite),
 * pemanggil (UI) WAJIB meminta konfirmasi guru sebelum memanggil fungsi ini.
 */
export async function importData(payload) {
  const { valid, errors } = validateBackup(payload);
  if (!valid) {
    throw new Error(`Import gagal: ${errors.join(" ")}`);
  }

  await clearAllStores();
  await openDB();

  for (const storeName of ALL_STORES) {
    // Backup lama mungkin tidak punya store opsional sama sekali (mis.
    // 'settings' sebelum R7.1) — anggap kosong, bukan error, biar
    // migrateIfNeeded (home.js) yang menentukan ulang saat Beranda dibuka.
    const records = payload.data[storeName] || [];
    await withStore(storeName, "readwrite", (store) => {
      for (const record of records) store.put(record);
    });
  }

  return true;
}

/** Baca file dari <input type="file"> lalu parse jadi objek JSON. */
export function readFileAsJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (err) {
        reject(new Error("File tidak dapat dibaca sebagai JSON."));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsText(file);
  });
}
