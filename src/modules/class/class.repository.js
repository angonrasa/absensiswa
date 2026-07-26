import { BaseRepository } from "../../database/base.repository.js";
import { STORE } from "../../database/db.js";
import { generateId } from "../../core/id.js";

export class ClassRepository extends BaseRepository {
  constructor() {
    super(STORE.CLASS);
  }

  async getByAcademicYear(academicYearId) {
    return this.getByIndex("academicYearId", academicYearId);
  }

  async create({ academicYearId, name, grade }) {
    const now = new Date().toISOString();
    const classRecord = {
      id: generateId("class"),
      academicYearId,
      name,
      grade,
      createdAt: now,
      updatedAt: now,
    };
    return this.add(classRecord);
  }

  async update(id, changes) {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Class ${id} tidak ditemukan`);
    const updated = { ...existing, ...changes, updatedAt: new Date().toISOString() };
    return this.put(updated);
  }
}
