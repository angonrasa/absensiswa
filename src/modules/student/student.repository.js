import { BaseRepository } from "../../database/base.repository.js";
import { STORE } from "../../database/db.js";
import { generateId } from "../../core/id.js";

export class StudentRepository extends BaseRepository {
  constructor() {
    super(STORE.STUDENT);
  }

  /** Ambil siswa berdasarkan kelas, terurut nama (sesuai Algoritma: "Urutkan Nama"). */
  async getByClass(classId) {
    const students = await this.getByIndex("classId", classId);
    return students
      .filter((s) => s.isActive !== false)
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }

  async create({ classId, nis, name, gender }) {
    const now = new Date().toISOString();
    const student = {
      id: generateId("stu"),
      classId,
      nis,
      name,
      gender,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    return this.add(student);
  }

  async update(id, changes) {
    const existing = await this.getById(id);
    if (!existing) throw new Error(`Student ${id} tidak ditemukan`);
    const updated = { ...existing, ...changes, updatedAt: new Date().toISOString() };
    return this.put(updated);
  }

  /** Pindah kelas — hanya mengubah classId, tidak membuat data baru. */
  async moveClass(id, newClassId) {
    return this.update(id, { classId: newClassId });
  }

  async deactivate(id) {
    return this.update(id, { isActive: false });
  }
}
