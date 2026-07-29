import test from "node:test";
import assert from "node:assert/strict";
import { state, computeDirty, updateDirtyState, markAsSaved } from "../pages/attendance/attendance.state.js";

/** Kembalikan `state` ke kondisi bersih sebelum tiap test (state adalah singleton). */
function resetState() {
  state.statusByStudentId = {};
  state.students = [];
  state.currentClass = null;
  state.currentSchedule = null;
  state.materialTopic = "";
  state.materialNote = "";
  state.noteExpanded = false;
  state.savedStatusByStudentId = {};
  state.savedMaterialTopic = "";
  state.savedMaterialNote = "";
  state.isDirty = false;
}

test("computeDirty: false kalau status, materi, dan catatan sama persis dengan snapshot tersimpan", () => {
  resetState();
  state.statusByStudentId = { s1: "present", s2: "sick" };
  state.savedStatusByStudentId = { s1: "present", s2: "sick" };
  state.materialTopic = "Hukum II Newton";
  state.savedMaterialTopic = "Hukum II Newton";

  assert.equal(computeDirty(), false);
});

test("computeDirty: true kalau ada satu status siswa yang berubah", () => {
  resetState();
  state.statusByStudentId = { s1: "present", s2: "absent" };
  state.savedStatusByStudentId = { s1: "present", s2: "sick" };

  assert.equal(computeDirty(), true);
});

test("computeDirty: true kalau materialTopic berubah", () => {
  resetState();
  state.materialTopic = "Hukum II Newton";
  state.savedMaterialTopic = "";

  assert.equal(computeDirty(), true);
});

test("computeDirty: true kalau materialNote berubah", () => {
  resetState();
  state.materialNote = "Lanjut ke bab pegas minggu depan";
  state.savedMaterialNote = "";

  assert.equal(computeDirty(), true);
});

test("updateDirtyState menyetel state.isDirty mengikuti computeDirty (regresi 8.2)", () => {
  resetState();
  state.statusByStudentId = { s1: "present" };
  state.savedStatusByStudentId = { s1: "present" };

  updateDirtyState();
  assert.equal(state.isDirty, false, "belum ada perubahan -> isDirty harus false");

  state.statusByStudentId.s1 = "absent"; // simulasi satu tap status
  updateDirtyState();
  assert.equal(state.isDirty, true, "setelah tap status -> isDirty harus true");
});

test("markAsSaved menjadikan state sekarang sebagai baseline baru dan mereset isDirty", () => {
  resetState();
  state.statusByStudentId = { s1: "absent" };
  state.savedStatusByStudentId = { s1: "present" };
  state.materialTopic = "Hukum II Newton";
  state.savedMaterialTopic = "";
  state.isDirty = true;

  markAsSaved();

  assert.deepEqual(state.savedStatusByStudentId, { s1: "absent" });
  assert.equal(state.savedMaterialTopic, "Hukum II Newton");
  assert.equal(state.isDirty, false);
});

test("markAsSaved menyalin statusByStudentId (bukan referensi) — perubahan berikutnya tidak ikut mengubah snapshot", () => {
  resetState();
  state.statusByStudentId = { s1: "present" };
  markAsSaved();

  state.statusByStudentId.s1 = "sick"; // tap berikutnya, belum di-markAsSaved lagi

  assert.equal(state.savedStatusByStudentId.s1, "present", "snapshot lama tidak boleh ikut berubah");
  assert.equal(computeDirty(), true);
});
