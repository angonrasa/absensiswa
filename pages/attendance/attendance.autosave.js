/**
 * Service Module — Autosave Absensi (MVP2 Milestone 8.3 & 8.4)
 *
 * Tanggung jawab tunggal: menyimpan draft ke database saat guru meninggalkan
 * halaman Absensi atau app di-background, TANPA menyentuh DOM (itu tanggung
 * jawab attendance.js). Membaca/menandai state lewat attendance.state.js dan
 * menulis lewat AttendanceRepository yang di-inject dari luar (initAutosave),
 * bukan diimpor/dibuat sendiri — modul ini tidak tahu apa pun soal jadwal
 * URL/DOM. Sesuai Agents-rules: "Pisahkan antara core, service dan ui, jangan
 * dicampur dalam satu file."
 */

import { state, markAsSaved } from "./attendance.state.js";

let attendanceRepo = null;
let pageConfig = null; // { classId, scheduleId, dateKey }
let onAutosaved = null; // MVP2 Milestone 8.6 — callback opsional, DOM-free di sini

/**
 * Autosave sebagai draft (BUKAN completed), dipicu saat guru meninggalkan
 * halaman Absensi tanpa menekan tombol Simpan. Hanya berjalan kalau benar-
 * benar ada perubahan (state.isDirty) — supaya tidak menulis session kosong
 * yang tidak perlu (regresi 8.7) dan tidak menambah beban saat guru tidak
 * mengubah apa pun.
 *
 * Best-effort & silent: tidak ada loading/modal (itu ranah indikator 8.6),
 * kegagalan hanya dicatat ke console — tap status yang sudah dilakukan guru
 * tetap aman di memori kalau guru kembali ke halaman ini, dan tombol Simpan
 * (handleSave di attendance.js, sessionStatus default "completed") tetap
 * jalur utama.
 */
export async function autosaveDraft() {
  if (!state.isDirty) return;
  if (!pageConfig?.classId || state.students.length === 0) return;

  try {
    await attendanceRepo.saveAttendance({
      classId: pageConfig.classId,
      scheduleId: pageConfig.scheduleId,
      date: pageConfig.dateKey,
      statusByStudentId: state.statusByStudentId,
      materialTopic: state.materialTopic.trim(),
      materialNote: state.materialNote.trim(),
      sessionStatus: "draft",
    });
    markAsSaved();
    // MVP2 Milestone 8.6 — beri tahu UI (attendance.js/attendance.render.js)
    // kalau ingin menampilkan indikator kecil "Tersimpan otomatis". Modul ini
    // tetap tidak menyentuh DOM sendiri — hanya memanggil callback yang
    // di-inject dari luar, sama seperti pola `repo` di initAutosave().
    if (typeof onAutosaved === "function") onAutosaved();
  } catch (err) {
    console.error("Autosave draft gagal:", err);
  }
}

/**
 * Daftarkan hook navigasi keluar (Milestone 8.3, "pagehide") dan app
 * pause/hidden (Milestone 8.4, "visibilitychange"). Dipanggil sekali dari
 * main() di attendance.js, setelah repository & parameter halaman tersedia.
 *
 * "beforeunload" sengaja tidak dipakai untuk kedua hook ini karena tidak
 * reliable di mobile (guru pindah app / kunci layar / terima telepon tidak
 * selalu memicu beforeunload). "pagehide" dipakai untuk navigasi keluar
 * (back button/pindah halaman), "visibilitychange" untuk app di-background
 * tanpa halaman benar-benar ditinggalkan.
 *
 * Catatan keterbatasan: ini best-effort — kedua event tidak menjamin operasi
 * async (IndexedDB) selesai sebelum halaman benar-benar ditinggalkan di semua
 * kondisi (mis. tab ditutup paksa), tapi ini pendekatan standar untuk
 * autosave di web tanpa menambah dependency baru (sesuai Agents-rules).
 *
 * Catatan soal indikator (Milestone 8.6): karena kedua trigger di atas hanya
 * jalan saat halaman SEDANG ditinggalkan/disembunyikan, `onAutosaved` biasanya
 * terpanggil ketika guru tidak sedang melihat layar. Ini disengaja, bukan
 * bug — "silent, tidak menyela" (Blueprint) berarti indikator boleh terlewat
 * saat guru sedang berpindah halaman. Ia baru sungguh-sungguh terlihat kalau
 * guru kembali ke tab ini sesaat setelah app di-background (visibilitychange
 * "hidden" lalu "visible" lagi) — itu pun sekadar bonus reassurance, bukan
 * jaminan.
 */
export function initAutosave({ repo, classId, scheduleId, dateKey, onAutosaved: onSaved }) {
  attendanceRepo = repo;
  pageConfig = { classId, scheduleId, dateKey };
  onAutosaved = onSaved || null;

  // Guard: window/document tidak selalu tersedia (mis. saat modul ini
  // diimpor dari `node --test` tanpa jsdom — lihat tests/attendance.autosave.test.mjs).
  // Di browser sungguhan keduanya selalu ada, jadi perilaku produksi tidak
  // berubah. Sengaja tidak menambah dependency (jsdom/fake browser) hanya
  // demi testability, sesuai Agents-rules ("Never introduce new dependencies
  // unless necessary") — autosaveDraft() sendiri sudah DOM-free dan bisa
  // diuji langsung lewat repo yang di-mock.
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => {
      autosaveDraft();
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        autosaveDraft();
      }
    });
  }
}
