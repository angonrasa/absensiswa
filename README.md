# Teacher Attendance Companion

Aplikasi absensi siswa untuk guru — dirancang supaya proses absensi selesai dalam **kurang dari 30 detik**, sekaligus otomatis membangun riwayat kehadiran tiap siswa.

Bukan aplikasi administrasi sekolah. Ini pendamping guru sebelum mengajar.

## Fitur

- ⚡ Absensi super cepat — default semua siswa "Hadir", guru cuma ubah yang tidak hadir (satu tap: Hadir → Izin → Sakit → Alpha)
- 📅 Jadwal mengajar hari ini langsung di Beranda
- 📊 Riwayat & statistik kehadiran otomatis per siswa (tanpa input tambahan)
- ⚠️ Peringatan dini — guru tahu siswa yang mulai sering tidak hadir tanpa menghitung manual
- 🗑️ Kelola riwayat — hapus entri yang salah input (dengan konfirmasi), terpisah dari reset total
- 💾 Backup & restore data lewat file JSON lokal
- 📴 Offline-first — semua data tersimpan di perangkat, tidak butuh internet

## Tech Stack

HTML/CSS/JavaScript murni (ES Modules) + IndexedDB. Tanpa framework, tanpa dependency eksternal.

## Menjalankan Secara Lokal

Project ini pakai ES Modules, jadi tidak bisa dibuka langsung lewat `file://` — perlu local server.

```bash
git clone <url-repo-ini>
cd absensiswa
python3 -m http.server 8000
```

Buka `http://localhost:8000` di browser (Chrome/Edge/Safari — semua browser modern didukung).

Alternatif kalau sudah punya Node.js:
```bash
npx serve .
```

## Menjalankan Test

```bash
node --test "tests/*.test.mjs"
```

## Status

MVP 1.0 — seluruh fitur inti (absensi, riwayat, peringatan, pencarian, backup/restore) sudah selesai dan dipakai harian.

## Lisensi

Belum ditentukan.
