import test from "node:test";
import assert from "node:assert/strict";
import { computeWarnings, WARNING_THRESHOLD } from "../src/modules/history/warning.service.js";

function entry(date, status) {
  return { date, status };
}

test("tidak ada peringatan untuk siswa rajin", () => {
  const timeline = [
    entry("2026-07-01", "present"),
    entry("2026-07-02", "present"),
    entry("2026-07-03", "present"),
  ];
  assert.deepEqual(computeWarnings(timeline, new Date("2026-07-04")), []);
});

test("peringatan alpha berturut-turut muncul saat mencapai batas", () => {
  const timeline = [
    entry("2026-07-01", "present"),
    entry("2026-07-02", "absent"),
    entry("2026-07-03", "absent"),
    entry("2026-07-04", "absent"),
  ];
  const warnings = computeWarnings(timeline, new Date("2026-07-05"));
  const types = warnings.map((w) => w.type);
  assert.ok(types.includes("alpha_consecutive"));
});

test("alpha berturut-turut berhenti terhitung begitu ada kehadiran", () => {
  const timeline = [
    entry("2026-07-01", "absent"),
    entry("2026-07-02", "absent"),
    entry("2026-07-03", "present"), // memutus rentetan
  ];
  const warnings = computeWarnings(timeline, new Date("2026-07-04"));
  assert.ok(!warnings.some((w) => w.type === "alpha_consecutive"));
});

test("peringatan alpha bulanan muncul di ambang batas", () => {
  const timeline = [
    entry("2026-07-02", "absent"),
    entry("2026-07-09", "present"),
    entry("2026-07-10", "absent"),
    entry("2026-07-16", "present"),
    entry("2026-07-17", "absent"),
    entry("2026-07-23", "present"),
    entry("2026-07-24", "absent"),
  ];
  const warnings = computeWarnings(timeline, new Date("2026-07-25"));
  assert.ok(warnings.some((w) => w.type === "alpha_monthly"));
});

test("batas ambang sesuai dokumen Algoritma", () => {
  assert.equal(WARNING_THRESHOLD.ALPHA_CONSECUTIVE, 3);
  assert.equal(WARNING_THRESHOLD.ALPHA_MONTHLY, 4);
});
