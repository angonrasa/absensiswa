import { withStore, requestToPromise, STORE } from "../../database/db.js";
import { generateId } from "../../core/id.js";
import { toDateKey } from "../../core/date.js";

const STATUSES = ["present", "permission", "sick", "absent"];

export class AttendanceRepository {
  /** Cari session yang sudah ada untuk kelas+tanggal (mencegah duplikasi, Prinsip Algoritma #5). */
  async findSession(classId, date = toDateKey()) {
    const sessions = await withStore(STORE.ATTENDANCE_SESSION, "readonly", (store) =>
      requestToPromise(store.index("classId_date").get([classId, date]))
    );
    return sessions || null;
  }

  async getSessionById(id) {
    return withStore(STORE.ATTENDANCE_SESSION, "readonly", (store) =>
      requestToPromise(store.get(id))
    );
  }

  /** Semua session pada satu tanggal, lintas kelas — dipakai untuk ringkasan statistik harian. */
  async getSessionsByDate(date) {
    return withStore(STORE.ATTENDANCE_SESSION, "readonly", (store) =>
      requestToPromise(store.index("date").getAll(date))
    );
  }

  async getRecordsBySession(sessionId) {
    return withStore(STORE.ATTENDANCE_RECORD, "readonly", (store) =>
      requestToPromise(store.index("attendanceSessionId").getAll(sessionId))
    );
  }

  async getRecordsByStudent(studentId) {
    const records = await withStore(STORE.ATTENDANCE_RECORD, "readonly", (store) =>
      requestToPromise(store.index("studentId").getAll(studentId))
    );
    return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Simpan absensi satu kelas untuk satu tanggal.
   * statusByStudentId: { [studentId]: "present" | "permission" | "sick" | "absent" }
   * Mengikuti alur di 03-Algoritma-Pendamping.md: buat/ update session,
   * lalu buat/ update record untuk setiap siswa.
   */
  async saveAttendance({ classId, scheduleId, date = toDateKey(), statusByStudentId }) {
    let session = await this.findSession(classId, date);
    const now = new Date().toISOString();

    if (!session) {
      session = {
        id: generateId("sess"),
        scheduleId,
        classId,
        date,
        status: "completed",
        createdAt: now,
        updatedAt: now,
      };
      await withStore(STORE.ATTENDANCE_SESSION, "readwrite", (store) => store.add(session));
    } else {
      session = { ...session, status: "completed", updatedAt: now };
      await withStore(STORE.ATTENDANCE_SESSION, "readwrite", (store) => store.put(session));
    }

    const existingRecords = await this.getRecordsBySession(session.id);
    const existingByStudent = Object.fromEntries(existingRecords.map((r) => [r.studentId, r]));

    await withStore(STORE.ATTENDANCE_RECORD, "readwrite", (store) => {
      for (const [studentId, status] of Object.entries(statusByStudentId)) {
        const prior = existingByStudent[studentId];
        const record = prior
          ? { ...prior, status, updatedAt: now }
          : {
              id: generateId("rec"),
              attendanceSessionId: session.id,
              studentId,
              status,
              note: "",
              createdAt: now,
              updatedAt: now,
            };
        store.put(record);
      }
    });

    return this.buildSummary(await this.getRecordsBySession(session.id));
  }

  /** Ringkasan Hadir/Izin/Sakit/Alpha — dihitung, tidak disimpan (lihat Data Model: Statistik). */
  buildSummary(records) {
    const summary = { present: 0, permission: 0, sick: 0, absent: 0 };
    for (const r of records) {
      if (summary[r.status] !== undefined) summary[r.status] += 1;
    }
    return summary;
  }

  /** Statistik kehadiran satu siswa sepanjang riwayat. */
  async getStudentStats(studentId) {
    const records = await this.getRecordsByStudent(studentId);
    return this.buildSummary(records);
  }

  /** Hapus satu record riwayat (misal: salah input di satu hari untuk satu siswa). */
  async deleteRecord(recordId) {
    return withStore(STORE.ATTENDANCE_RECORD, "readwrite", (store) => {
      store.delete(recordId);
      return recordId;
    });
  }

  /** Hapus satu sesi absensi sekaligus seluruh record di dalamnya (misal: salah absen sekelas). */
  async deleteSession(sessionId) {
    const records = await this.getRecordsBySession(sessionId);
    await withStore(STORE.ATTENDANCE_RECORD, "readwrite", (store) => {
      for (const r of records) store.delete(r.id);
    });
    await withStore(STORE.ATTENDANCE_SESSION, "readwrite", (store) => {
      store.delete(sessionId);
    });
    return sessionId;
  }

  /** Timeline riwayat satu siswa, terurut tanggal. */
  async getStudentTimeline(studentId) {
    const records = await this.getRecordsByStudent(studentId);
    const sessionIds = [...new Set(records.map((r) => r.attendanceSessionId))];
    const sessions = await Promise.all(sessionIds.map((id) => this.getSessionById(id)));
    const sessionById = Object.fromEntries(sessions.map((s) => [s.id, s]));

    return records
      .map((r) => ({
        date: sessionById[r.attendanceSessionId]?.date,
        status: r.status,
        note: r.note,
        recordId: r.id,
        sessionId: r.attendanceSessionId,
      }))
      .filter((entry) => entry.date)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  static get STATUSES() {
    return STATUSES;
  }

  /** Siklus status satu-tap: present -> permission -> sick -> absent -> present. */
  static nextStatus(current) {
    const idx = STATUSES.indexOf(current);
    return STATUSES[(idx + 1) % STATUSES.length];
  }
}
