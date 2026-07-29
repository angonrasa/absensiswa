import test from "node:test";
import assert from "node:assert/strict";
import { state, updateDirtyState } from "../pages/attendance/attendance.state.js";
import {
  autosaveDraft,
  initAutosave,
  scheduleAutosave,
  cancelScheduledAutosave,
} from "../pages/attendance/attendance.autosave.js";

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
 *
 * Penyempurnaan (audit 2026-07-29, P0 09-UX-Roadmap.md): tes untuk
 * `scheduleAutosave()`/`cancelScheduledAutosave()` ditambahkan di bagian
 * bawah file ini. Sengaja pakai `setTimeout` sungguhan (bukan fake timer)
 * supaya tidak menambah dependency baru — total waktu tes ini di bawah 2
 * detik, cukup singkat untuk `node --test`.
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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("scheduleAutosave: TIDAK memanggil repo seketika, baru setelah debounce (~600ms) berlalu", async () => {
  resetState();
  state.students = [{ id: "s1" }];
  state.statusByStudentId = { s1: "sick" };
  state.savedStatusByStudentId = { s1: "present" };
  updateDirtyState();

  const repo = createMockRepo();
  initAutosave({ repo, classId: "class-7a", scheduleId: "sch-1", dateKey: "2026-07-29" });

  scheduleAutosave();
  await wait(300);
  assert.equal(repo.calls.length, 0, "belum boleh tersimpan sebelum debounce selesai");

  await wait(450); // total ~750ms sejak scheduleAutosave(), lewat 600ms
  assert.equal(repo.calls.length, 1);
  assert.equal(repo.calls[0].sessionStatus, "draft");
});

test("scheduleAutosave: tap berturut-turut mereset timer, tidak menumpuk beberapa kali simpan", async () => {
  resetState();
  state.students = [{ id: "s1" }];
  state.statusByStudentId = { s1: "sick" };
  state.savedStatusByStudentId = { s1: "present" };
  updateDirtyState();

  const repo = createMockRepo();
  initAutosave({ repo, classId: "class-7a", scheduleId: "sch-1", dateKey: "2026-07-29" });

  scheduleAutosave();
  await wait(300);
  scheduleAutosave(); // guru tap lagi sebelum 600ms pertama habis -> timer reset
  await wait(300);
  assert.equal(repo.calls.length, 0, "timer harus reset, belum 600ms sejak tap kedua");

  await wait(400); // total ~700ms sejak tap KEDUA
  assert.equal(repo.calls.length, 1, "hanya satu kali simpan walau ada 2 tap");
});

test("cancelScheduledAutosave: mencegah autosaveDraft terpanggil (dipakai handleSave sebelum tombol Simpan)", async () => {
  resetState();
  state.students = [{ id: "s1" }];
  state.statusByStudentId = { s1: "sick" };
  state.savedStatusByStudentId = { s1: "present" };
  updateDirtyState();

  const repo = createMockRepo();
  initAutosave({ repo, classId: "class-7a", scheduleId: "sch-1", dateKey: "2026-07-29" });

  scheduleAutosave();
  cancelScheduledAutosave();
  await wait(700);

  assert.equal(repo.calls.length, 0, "autosave draft tidak boleh menyusul setelah dibatalkan");
});
