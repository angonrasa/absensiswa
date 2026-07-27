import { openDB, withStore, requestToPromise, clearAllStores, STORE } from "../../database/db.js";

const BACKUP_VERSION = 1;

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

/** Trigger download file JSON di browser. */
export async function exportToFile() {
  const backup = await exportData();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-absensi-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Validasi struktur file backup.
 * Mengikuti Algoritma Import: "Validasi Struktur" sebelum menulis ke database.
 *
 * CORE_STORES wajib berupa array. OPTIONAL_STORES (settings) boleh tidak
 * ada sama sekali di file lama — hanya divalidasi KALAU kuncinya ada tapi
 * bukan array (berarti memang rusak, bukan sekadar backup versi lama).
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
