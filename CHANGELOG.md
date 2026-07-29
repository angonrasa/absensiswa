# Changelog

Semua perubahan penting pada Teacher Attendance Companion (Absensiswa) dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/).

---

## [Unreleased]

Belum dirilis — sedang/akan dikerjakan:

- Riwayat per Kelas: filter rentang tanggal
- Export Riwayat ke JPG & XLSX

---

## [1.1.0] - 2026-07-29

### Added

- **Materi pembelajaran** — setiap sesi absensi kini bisa dikaitkan dengan
  materi yang diajarkan hari itu, otomatis muncul di riwayat siswa yang
  tidak hadir.
- **Riwayat per Kelas** — rekap seluruh sesi absensi satu kelas per
  tanggal (bukan cuma per siswa), lengkap dengan materi hari itu.
- **Hapus massal di Data Master** — pilih banyak baris (kelas/siswa/
  jadwal) sekaligus lalu hapus dalam satu aksi.
- **Auto Backup** — backup otomatis ke file lokal, plus pengingat kalau
  auto backup dimatikan dan sudah beberapa hari belum ada cadangan.
- **Autosave absensi** — perubahan status kehadiran tersimpan otomatis
  saat pindah halaman atau aplikasi di-background, tombol Simpan tetap
  ada sebagai konfirmasi akhir.
- **Insight Kehadiran** — pola sederhana kehadiran siswa (mis. sering
  sakit di hari tertentu), perluasan dari Peringatan Dini.
- **Deteksi & pembersihan data yatim** — Pengaturan kini bisa mendeteksi
  dan membersihkan data yatim (jadwal/sesi yang induknya sudah terhapus)
  secara presisi, tanpa harus Reset Semua Data.
- **Onboarding** — layar Welcome dan wizard 3 langkah (Kelas → Siswa →
  Jadwal) untuk pengguna baru; pengguna lama tidak terganggu.
- **Redesign UI/UX** — design token baru, komponen dasar (tombol, card,
  pill/badge status, list row), dan ring statistik kehadiran di Beranda,
  diterapkan konsisten ke seluruh halaman.

### Changed

- Nomor versi aplikasi naik dari `1.0.1` ke `1.1.0` mengikuti Semantic
  Versioning — kenaikan **minor** karena berisi fitur baru yang tetap
  kompatibel ke belakang, bukan sekadar perbaikan bug.

---

## [1.0.1] 2026-07-28

### Fixed

- Statistik Beranda ("Hadir Hari Ini" / "% Kehadiran") menampilkan
  `-%`/`0` yang membingungkan di hari-hari belum ada absensi, alih-alih
  pesan "Belum ada absensi hari ini".
- Peringatan "Alpha berturut-turut" salah hitung saat ada 2 sesi absensi
  dalam 1 hari (mis. sebelum dan sesudah istirahat) — sekarang
  dikelompokkan per tanggal terlebih dulu sebelum menghitung streak.

---

## [1.0.0] - Rilis awal MVP 1

### Added

- Absensi kelas dalam waktu kurang dari 30 detik (default semua Hadir,
  guru hanya mengubah yang tidak hadir).
- Jadwal mengajar harian & daftar kelas di Beranda.
- Data Master: Tahun Ajaran, Kelas, Siswa, Jadwal.
- Riwayat kehadiran otomatis per siswa (timeline + statistik).
- Peringatan dini untuk siswa yang sering tidak hadir.
- Backup & Restore data ke/dari file JSON lokal.
- Bottom navigation (Beranda, Data Master, Riwayat, Pengaturan) & halaman
  About.
