import { BaseRepository } from "../../database/base.repository.js";
import { STORE } from "../../database/db.js";
import { generateId } from "../../core/id.js";

export class AcademicYearRepository extends BaseRepository {
  constructor() {
    super(STORE.ACADEMIC_YEAR);
  }

  async getActive() {
    const all = await this.getAll();
    return all.find((y) => y.isActive) || null;
  }

  async create({ name }) {
    const now = new Date().toISOString();
    const year = {
      id: generateId("ay"),
      name,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    };
    return this.add(year);
  }

  async update(id, changes) {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`AcademicYear ${id} tidak ditemukan`);
    const updated = { ...existing, ...changes, updatedAt: new Date().toISOString() };
    return this.put(updated);
  }

  /** Aktifkan satu tahun ajaran; nonaktifkan yang lain (hanya boleh satu yang aktif). */
  async activate(id) {
    const all = await this.getAll();
    const now = new Date().toISOString();
    for (const year of all) {
      const shouldBeActive = year.id === id;
      if (year.isActive !== shouldBeActive) {
        await this.put({ ...year, isActive: shouldBeActive, updatedAt: now });
      }
    }
    return this.getById(id);
  }
}
