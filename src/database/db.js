/*
  Local Database — IndexedDB
  Mengikuti 02-Data-Model-Pendamping.md: 6 entitas, tanpa duplikasi data,
  statistik & riwayat selalu dihitung dari AttendanceRecord (tidak disimpan).
*/

const DB_NAME = "teacher-attendance-db";
const DB_VERSION = 2; // R7.1 — v2: tambah store SETTINGS (hasSeenOnboarding), tidak ubah store lama

export const STORE = {
  ACADEMIC_YEAR: "academicYear",
  CLASS: "class",
  STUDENT: "student",
  SCHEDULE: "schedule",
  ATTENDANCE_SESSION: "attendanceSession",
  ATTENDANCE_RECORD: "attendanceRecord",
  SETTINGS: "settings",
};

let dbPromise = null;

/** Buka (dan bila perlu buat) database. Singleton — dipanggil oleh semua repository. */
export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE.ACADEMIC_YEAR)) {
        db.createObjectStore(STORE.ACADEMIC_YEAR, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE.CLASS)) {
        const store = db.createObjectStore(STORE.CLASS, { keyPath: "id" });
        store.createIndex("academicYearId", "academicYearId");
      }

      if (!db.objectStoreNames.contains(STORE.STUDENT)) {
        const store = db.createObjectStore(STORE.STUDENT, { keyPath: "id" });
        store.createIndex("classId", "classId");
      }

      if (!db.objectStoreNames.contains(STORE.SCHEDULE)) {
        const store = db.createObjectStore(STORE.SCHEDULE, { keyPath: "id" });
        store.createIndex("day", "day");
        store.createIndex("startTime", "startTime");
        store.createIndex("classId", "classId");
      }

      if (!db.objectStoreNames.contains(STORE.ATTENDANCE_SESSION)) {
        const store = db.createObjectStore(STORE.ATTENDANCE_SESSION, { keyPath: "id" });
        store.createIndex("date", "date");
        store.createIndex("classId", "classId");
        store.createIndex("scheduleId", "scheduleId");
        // Kombinasi classId+date harus unik (lihat Prinsip Algoritma #5).
        store.createIndex("classId_date", ["classId", "date"], { unique: true });
      }

      if (!db.objectStoreNames.contains(STORE.ATTENDANCE_RECORD)) {
        const store = db.createObjectStore(STORE.ATTENDANCE_RECORD, { keyPath: "id" });
        store.createIndex("attendanceSessionId", "attendanceSessionId");
        store.createIndex("studentId", "studentId");
        store.createIndex("status", "status");
      }

      // R7.1 — Settings: satu baris config (bukan entitas berelasi), dipakai
      // untuk preferensi tampilan seperti hasSeenOnboarding. Bukan bagian dari
      // 6 entitas inti di 02-Data-Model-Pendamping.md, jadi sengaja dipisah
      // ke store-nya sendiri agar tidak mencampur data absensi dengan preferensi UI.
      if (!db.objectStoreNames.contains(STORE.SETTINGS)) {
        db.createObjectStore(STORE.SETTINGS, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });

  return dbPromise;
}

/** Helper generik: jalankan satu transaksi pada satu object store. */
export async function withStore(storeName, mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = callback(store);

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Wrap sebuah IDBRequest jadi Promise. */
export function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Hapus seluruh isi database (dipakai saat Import/Restore melakukan overwrite). */
export async function clearAllStores() {
  const db = await openDB();
  const names = Object.values(STORE);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, "readwrite");
    names.forEach((name) => tx.objectStore(name).clear());
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
