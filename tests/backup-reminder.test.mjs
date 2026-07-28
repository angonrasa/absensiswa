import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBackupReminder } from "../src/modules/backup/backup.service.js";
import { defaultConfig } from "../src/modules/settings/settings.repository.js";

// --- MVP2 M7.1 — defaultConfig menyertakan field baru dengan default aman ---

test("MVP2 M7.1 — defaultConfig menyertakan autoBackupEnabled & lastBackupAt", () => {
  const config = defaultConfig();
  assert.equal(config.autoBackupEnabled, true);
  assert.equal(config.lastBackupAt, null);
  // field lama tidak boleh ikut berubah
  assert.equal(config.hasSeenOnboarding, false);
});

// --- MVP2 M7.5 — computeBackupReminder (pure function, tanpa IndexedDB) ---

test("MVP2 M7.5 — autoBackupEnabled true selalu false (pengingat hanya untuk auto backup mati)", () => {
  assert.equal(
    computeBackupReminder({
      autoBackupEnabled: true,
      lastBackupAt: null,
      sessions: [{ date: "2026-07-01" }, { date: "2026-07-02" }, { date: "2026-07-03" }],
    }),
    false
  );
});

test("MVP2 M7.5 — 3 hari unik sejak lastBackupAt -> true", () => {
  const lastBackupAt = "2026-07-01T00:00:00.000Z";
  const sessions = [
    { date: "2026-07-02", updatedAt: "2026-07-02T08:00:00.000Z" },
    { date: "2026-07-03", updatedAt: "2026-07-03T08:00:00.000Z" },
    { date: "2026-07-04", updatedAt: "2026-07-04T08:00:00.000Z" },
  ];
  assert.equal(computeBackupReminder({ autoBackupEnabled: false, lastBackupAt, sessions }), true);
});

test("MVP2 M7.5 — hanya 2 hari unik (2 sesi di hari yang sama) -> false", () => {
  const lastBackupAt = "2026-07-01T00:00:00.000Z";
  const sessions = [
    { date: "2026-07-02", updatedAt: "2026-07-02T08:00:00.000Z" },
    { date: "2026-07-02", updatedAt: "2026-07-02T09:30:00.000Z" }, // 2 JP hari sama
    { date: "2026-07-03", updatedAt: "2026-07-03T08:00:00.000Z" },
  ];
  assert.equal(computeBackupReminder({ autoBackupEnabled: false, lastBackupAt, sessions }), false);
});

test("MVP2 M7.5 — lastBackupAt kosong -> hitung dari sesi paling awal", () => {
  const sessions = [
    { date: "2026-06-01", updatedAt: "2026-06-01T08:00:00.000Z" },
    { date: "2026-06-02", updatedAt: "2026-06-02T08:00:00.000Z" },
    { date: "2026-06-03", updatedAt: "2026-06-03T08:00:00.000Z" },
  ];
  assert.equal(
    computeBackupReminder({ autoBackupEnabled: false, lastBackupAt: null, sessions }),
    true
  );
});

test("MVP2 M7.5 — sesi sebelum lastBackupAt tidak ikut dihitung", () => {
  const lastBackupAt = "2026-07-10T00:00:00.000Z";
  const sessions = [
    { date: "2026-07-01", updatedAt: "2026-07-01T08:00:00.000Z" }, // sebelum lastBackupAt
    { date: "2026-07-02", updatedAt: "2026-07-02T08:00:00.000Z" }, // sebelum lastBackupAt
  ];
  assert.equal(computeBackupReminder({ autoBackupEnabled: false, lastBackupAt, sessions }), false);
});
