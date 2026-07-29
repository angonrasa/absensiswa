/**
 * Entry Point — Halaman Absensi
 *
 * Tanggung jawab tunggal: orkestrasi alur halaman (muat data → render →
 * simpan), mengikuti Screen Architecture di 01-Arsitektur-Pendamping.md
 * (Home → Class → Attendance → Save → Done). Render/DOM ada di
 * attendance.render.js, state ada di attendance.state.js, autosave (MVP2
 * Milestone 8.3/8.4) ada di attendance.autosave.js. Sesuai Agents-rules:
 * "Pisahkan antara core, service dan ui, jangan dicampur dalam satu file."
 *
 * Hotfix pasca-8.7 (temuan pengujian nyata): autosave-saat-meninggalkan-
 * halaman (pagehide/visibilitychange) TIDAK cukup diandalkan sendirian —
 * keduanya menulis ke IndexedDB secara async, dan browser tidak menjamin
 * penulisan itu selesai sebelum halaman benar-benar dibongkar saat tombol
 * Back ditekan. Ditambahkan `scheduleAutosave()`: autosave debounced
 * beberapa saat setelah tap/input terakhir, SELAGI halaman masih penuh aktif
 * — supaya draft sudah tersimpan jauh sebelum guru sempat menekan Back. Hook
 * pagehide/visibilitychange yang lama tetap ada sebagai jaring pengaman
 * untuk celah waktu di antaranya (bukan diganti, cuma tidak lagi jadi
 * satu-satunya jalur).
 *
 * Penyempurnaan (audit 2026-07-29, P0 09-UX-Roadmap.md "Auto Save
 * Perubahan"): `scheduleAutosave()` beserta timer debounce-nya dipindah ke
 * attendance.autosave.js (diekspor dari sana) supaya bisa diuji unit —
 * sebelumnya definisi lokal di file ini tidak punya cakupan test sama
 * sekali walau jadi jalur autosave utama. Tidak ada perubahan perilaku.
 */

import { openDB } from "../../src/database/db.js";
import { StudentRepository } from "../../src/modules/student/student.repository.js";
import { ClassRepository } from "../../src/modules/class/class.repository.js";
import { ScheduleRepository } from "../../src/modules/schedule/schedule.repository.js";
import { AttendanceRepository } from "../../src/modules/attendance/attendance.repository.js";
import { runAutoBackupIfDue } from "../../src/modules/backup/backup.service.js";
import { toDateKey } from "../../src/core/date.js";
import { showLoading, showError } from "../../src/components/pageState.js";
import { state, markAsSaved } from "./attendance.state.js";
import { initAutosave, scheduleAutosave, cancelScheduledAutosave } from "./attendance.autosave.js";
import { renderMissingParam, renderResult, render, showAutosaveIndicator } from "./attendance.render.js";

const studentRepo = new StudentRepository();
const classRepo = new ClassRepository();
const scheduleRepo = new ScheduleRepository();
const attendanceRepo = new AttendanceRepository();

const app = document.getElementById("app");

const params = new URLSearchParams(window.location.search);
const classId = params.get("classId");
const scheduleId = params.get("scheduleId");
const dateKey = toDateKey();

async function handleSave() {
  cancelScheduledAutosave(); // hindari autosaveDraft() menyusul setelah Simpan ditekan
  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Menyimpan...";

  const trimmedTopic = state.materialTopic.trim();
  const trimmedNote = state.materialNote.trim();

  const summary = await attendanceRepo.saveAttendance({
    classId,
    scheduleId,
    date: dateKey,
    statusByStudentId: state.statusByStudentId,
    materialTopic: trimmedTopic,
    materialNote: trimmedNote,
    // sessionStatus tidak dikirim -> default "completed" (attendance.repository.js).
    // MVP2 Milestone 8.5: tombol Simpan tetap konfirmasi eksplisit "completed",
    // beda dengan autosaveDraft() (attendance.autosave.js) yang menulis "draft".
  });

  // MVP2 Milestone 7.3 — fire-and-forget, TIDAK di-await. Auto backup
  // (kalau aktif & sudah waktunya) berjalan di belakang layar, tidak boleh
  // menunda tampilnya ringkasan absensi (Blueprint: harus tetap < 30 detik).
  // Gagal pun tidak akan melempar error ke sini — sudah ditangani di dalam
  // runAutoBackupIfDue() (backup.service.js).
  runAutoBackupIfDue();

  // MVP2 Milestone 8.2 — setelah simpan sukses, state sekarang JADI baseline baru;
  // tidak ada lagi perubahan "belum tersimpan" sampai guru mengubah sesuatu lagi.
  markAsSaved();

  renderResult(app, summary, trimmedTopic);
}

async function main() {
  showLoading(app, "Memuat data siswa...");

  try {
    await openDB();

    if (!classId) {
      renderMissingParam(app);
      return;
    }

    // MVP2 Milestone 8.3/8.4 — daftarkan hook autosave sekali di awal (aman
    // dipanggil sebelum data siswa dimuat; autosaveDraft() menjaga diri
    // sendiri lewat guard `state.students.length === 0`).
    initAutosave({
      repo: attendanceRepo,
      classId,
      scheduleId,
      dateKey,
      // MVP2 Milestone 8.6 — indikator kecil, silent, tidak menunda apa pun.
      onAutosaved: showAutosaveIndicator,
    });

    state.currentClass = await classRepo.getById(classId);
    if (scheduleId) state.currentSchedule = await scheduleRepo.getById(scheduleId);
    state.students = await studentRepo.getByClass(classId);

    // Default = Hadir untuk semua siswa (Prinsip Desain #1).
    state.statusByStudentId = Object.fromEntries(state.students.map((s) => [s.id, "present"]));

    // Jika sesi hari ini sudah ada, muat status yang sudah tersimpan (bukan default lagi).
    // MVP2 Milestone 8.1 — findSession() tidak memfilter status, jadi ini otomatis
    // mencakup sesi draft (autosave Milestone 8.3/8.4) maupun completed (tombol Simpan).
    const existingSession = await attendanceRepo.findSession(classId, dateKey);
    if (existingSession) {
      const records = await attendanceRepo.getRecordsBySession(existingSession.id);
      records.forEach((r) => {
        if (state.statusByStudentId[r.studentId] !== undefined) {
          state.statusByStudentId[r.studentId] = r.status;
        }
      });
      // Materi hari ini sudah pernah diisi untuk sesi ini — muat kembali, jangan reset.
      state.materialTopic = existingSession.materialTopic || "";
      state.materialNote = existingSession.materialNote || "";
    } else {
      // Default = materi terakhir untuk kelas ini (Prinsip Desain "Default = Hadir"
      // diterapkan juga di sini: guru cuma perlu ubah kalau memang beda).
      const recentTopics = await attendanceRepo.getRecentMaterialTopics(classId, 1);
      state.materialTopic = recentTopics[0] || "";
    }
    // Kalau catatan sudah terisi (dari sesi tersimpan), tampilkan langsung, jangan
    // disembunyikan di balik toggle — supaya guru tidak kehilangan isi yang sudah ada.
    state.noteExpanded = Boolean(state.materialNote);

    // MVP2 Milestone 8.2 — state yang baru dimuat (dari sesi tersimpan ATAU default)
    // jadi baseline awal. Kalau guru tidak menyentuh apa pun, isDirty tetap false
    // (regresi 8.7: tidak boleh memaksa membuat session kosong yang tidak perlu).
    markAsSaved();

    await render(app, dateKey, handleSave, scheduleAutosave);
  } catch (err) {
    console.error(err);
    showError(app, "Gagal memuat halaman absensi. Coba muat ulang.");
  }
}

main();
