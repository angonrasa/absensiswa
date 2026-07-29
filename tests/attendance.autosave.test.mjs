import test from "node:test";
import assert from "node:assert/strict";
import { state, updateDirtyState } from "../pages/attendance/attendance.state.js";
import { autosaveDraft, initAutosave } from "../pages/attendance/attendance.autosave.js";

/**
 * Ini menguji `autosaveDraft()` sebagai unit murni: `AttendanceRepository`
 * asli (IndexedDB) di-mock lewat parameter `repo` di initAutosave(), sama
 * seperti pola dependency-injection yang sudah dipakai attendance.js/
 * attendance.autosave.js sendiri. Tidak menambah dependency baru
 * (fake-indexeddb/jsdom) — sesuai Agents-rules & pola test yang sudah ada
 * di attendance.repository.test.mjs (murni fungsi, tanpa DB).
 *
 * Skenario yang butuh IndexedDB + navigasi/DOM sungguhan (memuat ulang
 * halaman Absensi dan melihat status draft ikut termuat, atau menekan
 * tombol Simpan sungguhan) TIDAK diuji di sini — lihat
 * docs/manual-test-milestone8.md untuk checklist manualnya.
 */

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

function createMockRepo({ shouldFail = false } = {}) {
  const calls = [];
  return {
    calls,
    async saveAttendance(payload) {
      calls.push(payload);
      if (shouldFail) throw new Error("simulasi gagal simpan");
      return { present: 0, permission: 0, sick: 0, absent: 0 };
    },
  };
}

test("autosaveDraft: TIDAK memanggil repo kalau tidak ada perubahan (regresi 8.7 — no unnecessary empty session)", async () => {
  resetState();
  state.students = [{ id: "s1" }];
  state.statusByStudentId = { s1: "present" };
  state.savedStatusByStudentId = { s1: "present" };
  updateDirtyState(); // isDirty tetap false, tidak ada yang diubah

  const repo = createMockRepo();
  initAutosave({ repo, classId: "class-7a", scheduleId: "sch-1", dateKey: "2026-07-29" });

  await autosaveDraft();

  assert.equal(repo.calls.length, 0);
});

test("autosaveDraft: TIDAK memanggil repo kalau daftar siswa belum dimuat, walau isDirty true", async () => {
  resetState();
  state.students = []; // halaman belum selesai load
  state.isDirty = true;

  const repo = createMockRepo();
  initAutosave({ repo, classId: "class-7a", scheduleId: "sch-1", dateKey: "2026-07-29" });

  await autosaveDraft();

  assert.equal(repo.calls.length, 0);
});

test("autosaveDraft: TIDAK memanggil repo kalau classId belum tersedia (halaman belum siap)", async () => {
  resetState();
  state.students = [{ id: "s1" }];
  state.statusByStudentId = { s1: "sick" };
  state.savedStatusByStudentId = { s1: "present" };
  updateDirtyState();

  const repo = createMockRepo();
  initAutosave({ repo, classId: undefined, scheduleId: "sch-1", dateKey: "2026-07-29" });

  await autosaveDraft();

  assert.equal(repo.calls.length, 0);
});

test("autosaveDraft: menyimpan sebagai draft (bukan completed) ketika ada perubahan", async () => {
  resetState();
  state.students = [{ id: "s1" }, { id: "s2" }];
  state.statusByStudentId = { s1: "sick", s2: "present" };
  state.savedStatusByStudentId = { s1: "present", s2: "present" };
  updateDirtyState();
  assert.equal(state.isDirty, true, "sanity check setup");

  const repo = createMockRepo();
  initAutosave({ repo, classId: "class-7a", scheduleId: "sch-1", dateKey: "2026-07-29" });

  await autosaveDraft();

  assert.equal(repo.calls.length, 1);
  assert.equal(repo.calls[0].sessionStatus, "draft");
  assert.equal(repo.calls[0].classId, "class-7a");
  assert.equal(repo.calls[0].date, "2026-07-29");
  assert.deepEqual(repo.calls[0].statusByStudentId, { s1: "sick", s2: "present" });
});

test("autosaveDraft: setelah sukses, menandai state tersimpan (markAsSaved) dan memanggil onAutosaved (Milestone 8.6)", async () => {
  resetState();
  state.students = [{ id: "s1" }];
  state.statusByStudentId = { s1: "absent" };
  state.savedStatusByStudentId = { s1: "present" };
  updateDirtyState();

  let onAutosavedCalls = 0;
  const repo = createMockRepo();
  initAutosave({
    repo,
    classId: "class-7a",
    scheduleId: null,
    dateKey: "2026-07-29",
    onAutosaved: () => onAutosavedCalls++,
  });

  await autosaveDraft();

  assert.equal(state.isDirty, false);
  assert.deepEqual(state.savedStatusByStudentId, { s1: "absent" });
  assert.equal(onAutosavedCalls, 1);
});

test("autosaveDraft: kalau repo gagal, tidak melempar error, state TETAP dirty, onAutosaved TIDAK dipanggil", async () => {
  resetState();
  state.students = [{ id: "s1" }];
  state.statusByStudentId = { s1: "sick" };
  state.savedStatusByStudentId = { s1: "present" };
  updateDirtyState();

  let onAutosavedCalls = 0;
  const repo = createMockRepo({ shouldFail: true });
  initAutosave({
    repo,
    classId: "class-7a",
    scheduleId: null,
    dateKey: "2026-07-29",
    onAutosaved: () => onAutosavedCalls++,
  });

  await assert.doesNotReject(() => autosaveDraft());

  assert.equal(state.isDirty, true, "tap status guru tidak boleh dianggap tersimpan kalau gagal");
  assert.equal(onAutosavedCalls, 0);
});
