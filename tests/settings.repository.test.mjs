import test from "node:test";
import assert from "node:assert/strict";
import { SettingsRepository } from "../src/modules/settings/settings.repository.js";

test("data kosong semua -> hasSeenOnboarding false", () => {
  assert.equal(
    SettingsRepository.computeHasSeenOnboarding({ classCount: 0, studentCount: 0, scheduleCount: 0 }),
    false
  );
});

test("tidak ada argumen sama sekali -> hasSeenOnboarding false", () => {
  assert.equal(SettingsRepository.computeHasSeenOnboarding(), false);
});

test("sudah ada kelas -> hasSeenOnboarding true", () => {
  assert.equal(
    SettingsRepository.computeHasSeenOnboarding({ classCount: 1, studentCount: 0, scheduleCount: 0 }),
    true
  );
});

test("sudah ada siswa -> hasSeenOnboarding true", () => {
  assert.equal(
    SettingsRepository.computeHasSeenOnboarding({ classCount: 0, studentCount: 5, scheduleCount: 0 }),
    true
  );
});

test("sudah ada jadwal -> hasSeenOnboarding true", () => {
  assert.equal(
    SettingsRepository.computeHasSeenOnboarding({ classCount: 0, studentCount: 0, scheduleCount: 2 }),
    true
  );
});

test("kelas, siswa, dan jadwal semua terisi -> tetap true (bukan hasil AND)", () => {
  assert.equal(
    SettingsRepository.computeHasSeenOnboarding({ classCount: 3, studentCount: 40, scheduleCount: 6 }),
    true
  );
});
