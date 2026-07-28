import test from "node:test";
import assert from "node:assert/strict";
import { AttendanceRepository } from "../src/modules/attendance/attendance.repository.js";

test("siklus status satu-tap: present -> permission -> sick -> absent -> present", () => {
  assert.equal(AttendanceRepository.nextStatus("present"), "permission");
  assert.equal(AttendanceRepository.nextStatus("permission"), "sick");
  assert.equal(AttendanceRepository.nextStatus("sick"), "absent");
  assert.equal(AttendanceRepository.nextStatus("absent"), "present");
});

test("buildSummary menghitung tiap status dengan benar", () => {
  const repo = new AttendanceRepository();
  const records = [
    { status: "present" },
    { status: "present" },
    { status: "sick" },
    { status: "permission" },
    { status: "absent" },
  ];
  assert.deepEqual(repo.buildSummary(records), {
    present: 2,
    permission: 1,
    sick: 1,
    absent: 1,
  });
});

test("buildSummary dengan daftar kosong menghasilkan nol semua", () => {
  const repo = new AttendanceRepository();
  assert.deepEqual(repo.buildSummary([]), {
    present: 0,
    permission: 0,
    sick: 0,
    absent: 0,
  });
});

test("pickRecentTopics: urutan terbaru dulu, tidak menyertakan yang kosong", () => {
  const sessions = [
    { date: "2026-07-20", materialTopic: "Hukum I Newton" },
    { date: "2026-07-25", materialTopic: "" },
    { date: "2026-07-27", materialTopic: "Hukum II Newton" },
    { date: "2026-07-22", materialTopic: null },
    { date: "2026-07-15", materialTopic: "Pengukuran" },
  ];

  assert.deepEqual(AttendanceRepository.pickRecentTopics(sessions, 5), [
    "Hukum II Newton",
    "Hukum I Newton",
    "Pengukuran",
  ]);
});

test("pickRecentTopics: menghormati parameter limit", () => {
  const sessions = [
    { date: "2026-07-27", materialTopic: "Materi C" },
    { date: "2026-07-25", materialTopic: "Materi B" },
    { date: "2026-07-20", materialTopic: "Materi A" },
  ];

  assert.deepEqual(AttendanceRepository.pickRecentTopics(sessions, 2), [
    "Materi C",
    "Materi B",
  ]);
});

test("pickRecentTopics: daftar kosong menghasilkan array kosong", () => {
  assert.deepEqual(AttendanceRepository.pickRecentTopics([], 5), []);
});
