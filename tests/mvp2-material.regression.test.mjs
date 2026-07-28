import test from "node:test";
import assert from "node:assert/strict";
import { AttendanceRepository } from "../src/modules/attendance/attendance.repository.js";
import { formatSessionRowSummary } from "../src/modules/history/history.service.js";

/*
  MVP 2 - Milestone 6.1: Regresi absensi tanpa materi
  Materi (materialTopic/materialNote) harus opsional di semua titik baca -
  tidak boleh ada yang mengasumsikan field itu selalu string terisi.
*/

test("6.1 - pickRecentTopics tetap aman kalau semua sesi kelas belum pernah diisi materi", () => {
  const sessions = [
    { date: "2026-07-20", materialTopic: "" },
    { date: "2026-07-22" }, // field tidak ada sama sekali
    { date: "2026-07-25", materialTopic: null },
  ];
  assert.deepEqual(AttendanceRepository.pickRecentTopics(sessions, 5), []);
});

test("6.1 - formatSessionRowSummary tanpa materi tidak menambah teks 'Materi:'", () => {
  const summary = { present: 30, permission: 0, sick: 0, absent: 0 };
  assert.equal(formatSessionRowSummary(summary, ""), "Hadir 30");
  assert.equal(formatSessionRowSummary(summary, undefined), "Hadir 30");
});

/*
  MVP 2 - Milestone 6.2: Regresi sesi lama (data sebelum MVP 2)
  Sesi yang dibuat sebelum field materialTopic/materialNote ada tidak
  boleh membuat rendering/perhitungan crash - field dianggap kosong.
*/

test("6.2 - pickRecentTopics mengabaikan sesi lama yang tidak punya field materialTopic sama sekali", () => {
  const legacySessions = [
    { date: "2026-06-01", status: "completed" }, // sesi dari sebelum MVP 2
    { date: "2026-07-27", materialTopic: "Hukum II Newton" },
  ];
  assert.deepEqual(AttendanceRepository.pickRecentTopics(legacySessions, 5), [
    "Hukum II Newton",
  ]);
});

test("6.2 - formatSessionRowSummary tidak error saat dipanggil dengan sesi lama (materialTopic undefined)", () => {
  const summary = { present: 28, permission: 1, sick: 0, absent: 1 };
  assert.doesNotThrow(() => formatSessionRowSummary(summary, undefined));
  assert.equal(formatSessionRowSummary(summary, undefined), "Hadir 28, Izin 1, Alpha 1");
});

test("6.2 - formatSessionRowSummary memotong materi yang sangat panjang, tidak menampilkan mentah-mentah", () => {
  const summary = { present: 30, permission: 0, sick: 0, absent: 0 };
  const longTopic = "A".repeat(60);
  const result = formatSessionRowSummary(summary, longTopic);
  assert.ok(result.includes("…"), "materi panjang harus dipotong dengan elipsis");
  assert.ok(result.length < 30 + longTopic.length, "hasil harus lebih pendek dari materi asli");
});

test("6.2 - buildSummary tidak terpengaruh field materi yang hilang (independen dari session)", () => {
  const repo = new AttendanceRepository();
  const records = [{ status: "present" }, { status: "absent" }];
  assert.deepEqual(repo.buildSummary(records), {
    present: 1,
    permission: 0,
    sick: 0,
    absent: 1,
  });
});
