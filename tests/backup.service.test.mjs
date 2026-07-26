import test from "node:test";
import assert from "node:assert/strict";
import { validateBackup } from "../src/modules/backup/backup.service.js";

const validPayload = {
  meta: { app: "teacher-attendance-companion", backupVersion: 1 },
  data: {
    academicYear: [],
    class: [],
    student: [],
    schedule: [],
    attendanceSession: [],
    attendanceRecord: [],
  },
};

test("backup valid lolos validasi", () => {
  const { valid, errors } = validateBackup(validPayload);
  assert.equal(valid, true);
  assert.deepEqual(errors, []);
});

test("backup tanpa field data ditolak", () => {
  const { valid, errors } = validateBackup({ meta: {} });
  assert.equal(valid, false);
  assert.ok(errors.length > 0);
});

test("backup dengan tabel hilang ditolak", () => {
  const broken = { ...validPayload, data: { ...validPayload.data } };
  delete broken.data.student;
  const { valid, errors } = validateBackup(broken);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("student")));
});

test("input bukan objek ditolak", () => {
  const { valid } = validateBackup(null);
  assert.equal(valid, false);
});
