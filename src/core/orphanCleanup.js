/*
  Deteksi & Pembersihan Data Yatim (Orphan Data) — Milestone R12
  Lihat 05-Roadmap-Redesign-UIUX.md.

  "Yatim" = baris yang classId/scheduleId/studentId/attendanceSessionId-nya
  menunjuk ke baris yang sudah tidak ada lagi di tabel induk. Ini muncul
  karena hapus data di Data Master sengaja TIDAK cascade (lihat
  01-Arsitektur-Pendamping.md & log 2026-07-26 di 04-Roadmap-Pendamping.md).

  Modul ini murni baca (findOrphanData) dan hapus terarah (deleteOrphanData /
  deleteScheduleAndRelated) — tidak mengubah struktur store apa pun, dan
  tidak pernah menyentuh Class/Student/AcademicYear yang masih valid.
*/

import { STORE, withStore, requestToPromise, openDB } from "../database/db.js";

function getAllFromStore(storeName) {
  return withStore(storeName, "readonly", (store) => requestToPromise(store.getAll()));
}

/**
 * R12.1 — Scan seluruh database untuk baris yatim. Read-only, O(n) terhadap
 * jumlah baris per store (pola sama dengan computeTodayStats di home.js).
 *
 * Urutan definisi (lihat juga catatan roadmap R12):
 *  - Schedule yatim   : classId tidak ada di Class
 *  - Session yatim    : classId tidak ada di Class ATAU scheduleId tidak ada di Schedule
 *  - Record yatim     : studentId tidak ada di Student ATAU attendanceSessionId tidak ada di Session
 */
export async function findOrphanData() {
  const [classes, students, schedules, sessions, records] = await Promise.all([
    getAllFromStore(STORE.CLASS),
    getAllFromStore(STORE.STUDENT),
    getAllFromStore(STORE.SCHEDULE),
    getAllFromStore(STORE.ATTENDANCE_SESSION),
    getAllFromStore(STORE.ATTENDANCE_RECORD),
  ]);

  const classIds = new Set(classes.map((c) => c.id));
  const studentIds = new Set(students.map((s) => s.id));
  const scheduleIds = new Set(schedules.map((s) => s.id));

  const orphanSchedules = schedules.filter((s) => !classIds.has(s.classId));

  const orphanSessions = sessions.filter(
    (sess) => !classIds.has(sess.classId) || !scheduleIds.has(sess.scheduleId)
  );

  const sessionIds = new Set(sessions.map((s) => s.id));

  const orphanRecords = records.filter(
    (r) => !studentIds.has(r.studentId) || !sessionIds.has(r.attendanceSessionId)
  );

  return { orphanSchedules, orphanSessions, orphanRecords };
}

/** Ringkas hasil findOrphanData jadi angka, untuk ditampilkan di UI. */
export function summarizeOrphans({ orphanSchedules, orphanSessions, orphanRecords }) {
  return {
    scheduleCount: orphanSchedules.length,
    sessionCount: orphanSessions.length,
    recordCount: orphanRecords.length,
    total: orphanSchedules.length + orphanSessions.length + orphanRecords.length,
  };
}

/**
 * R12.3 — Hapus seluruh data yatim, dalam satu transaksi readwrite.
 * Urutan: Record -> Session -> Schedule (anak dulu baru induk) supaya tidak
 * ada penghapusan yang membuat baris lain jadi yatim baru di tengah proses.
 *
 * `orphans` opsional — kalau tidak diberikan, akan scan ulang dulu lewat
 * findOrphanData(). Hanya menghapus id yang eksplisit ada di `orphans`;
 * Class/Student/AcademicYear tidak pernah disentuh oleh fungsi ini.
 */
export async function deleteOrphanData(orphans) {
  const data = orphans ?? (await findOrphanData());
  const db = await openDB();

  const storeNames = [STORE.ATTENDANCE_RECORD, STORE.ATTENDANCE_SESSION, STORE.SCHEDULE];

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, "readwrite");

    data.orphanRecords.forEach((r) => tx.objectStore(STORE.ATTENDANCE_RECORD).delete(r.id));
    data.orphanSessions.forEach((s) => tx.objectStore(STORE.ATTENDANCE_SESSION).delete(s.id));
    data.orphanSchedules.forEach((s) => tx.objectStore(STORE.SCHEDULE).delete(s.id));

    tx.oncomplete = () => resolve(summarizeOrphans(data));
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * R12.4 — Hapus satu Schedule yatim beserta AttendanceSession & AttendanceRecord
 * yang mengikutinya. Dipicu dari tombol "Hapus" di kartu jadwal Home, untuk
 * kasus satuan (guru tidak perlu buka Pengaturan).
 *
 * Sengaja scan ulang & verifikasi scheduleId itu benar-benar orphan sebelum
 * menghapus apa pun — mencegah penghapusan tidak sengaja kalau dipanggil
 * dengan id yang ternyata masih valid.
 */
export async function deleteScheduleAndRelated(scheduleId) {
  const { orphanSchedules, orphanSessions, orphanRecords } = await findOrphanData();

  const schedule = orphanSchedules.find((s) => s.id === scheduleId);
  if (!schedule) {
    return { deleted: false };
  }

  const relatedSessions = orphanSessions.filter((s) => s.scheduleId === scheduleId);
  const relatedSessionIds = new Set(relatedSessions.map((s) => s.id));
  const relatedRecords = orphanRecords.filter((r) => relatedSessionIds.has(r.attendanceSessionId));

  await deleteOrphanData({
    orphanSchedules: [schedule],
    orphanSessions: relatedSessions,
    orphanRecords: relatedRecords,
  });

  return { deleted: true };
}
