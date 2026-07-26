import { openDB, withStore, requestToPromise, clearAllStores, STORE } from "../../database/db.js";

const BACKUP_VERSION = 1;
const REQUIRED_STORES = Object.values(STORE);

/**
 * Export seluruh data ke satu object JSON.
 * Alur: Ambil Semua Tabel -> Serialize ke JSON (03-Algoritma-Pendamping.md).
 */
export async function exportData() {
  const data = {};
  for (const storeName of REQUIRED_STORES) {
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

  for (const storeName of REQUIRED_STORES) {
    if (!Array.isArray(payload.data[storeName])) {
      errors.push(`Data '${storeName}' tidak ditemukan atau bukan array.`);
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

  for (const storeName of REQUIRED_STORES) {
    const records = payload.data[storeName];
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
