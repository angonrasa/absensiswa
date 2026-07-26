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
