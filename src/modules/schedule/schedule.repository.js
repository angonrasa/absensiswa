import { BaseRepository } from "../../database/base.repository.js";
import { STORE } from "../../database/db.js";
import { generateId } from "../../core/id.js";
import { todayName } from "../../core/date.js";

export class ScheduleRepository extends BaseRepository {
  constructor() {
    super(STORE.SCHEDULE);
  }

  /** Jadwal hari ini, terurut jam mulai (sesuai Algoritma: "Jadwal Hari Ini"). */
  async getToday(date = new Date()) {
    const day = todayName(date);
    const items = await this.getByIndex("day", day);
    return items.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async getByClass(classId) {
    return this.getByIndex("classId", classId);
  }

  async create({ classId, subject, day, startTime, endTime }) {
    const now = new Date().toISOString();
    const schedule = {
      id: generateId("sch"),
      classId,
      subject,
      day,
      startTime,
      endTime,
      createdAt: now,
      updatedAt: now,
    };
    return this.add(schedule);
  }

  async update(id, changes) {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Schedule ${id} tidak ditemukan`);
    const updated = { ...existing, ...changes, updatedAt: new Date().toISOString() };
    return this.put(updated);
  }
}
