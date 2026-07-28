import { openDB, clearAllStores } from "../../src/database/db.js";
import {
  exportToFile,
  importData,
  readFileAsJSON,
  validateBackup,
} from "../../src/modules/backup/backup.service.js";
import { AppBar, BottomNav, Button, Modal, MenuGroup, MenuRow, Toggle, showToast } from "../../src/components/components.js";
import { runPage } from "../../src/components/pageState.js";
import { renderOrphanCleanupGroup } from "../../src/core/orphanCleanupUI.js";
import { SettingsRepository } from "../../src/modules/settings/settings.repository.js";

const app = document.getElementById("app");
const settingsRepo = new SettingsRepository();

/** MVP2 M7.4 — sub-label ringkas untuk baris Auto Backup. */
function formatLastBackup(iso) {
  if (!iso) return "Belum pernah backup";
  const date = new Date(iso);
  const tanggal = date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const jam = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `Backup terakhir: ${tanggal}, ${jam}`;
}

async function render() {
  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Pengaturan" }));
  app.appendChild(BottomNav({ active: "pengaturan" }));

  const main = document.createElement("main");

  // MVP2 M7.4 — dibaca sekali di awal render, dipakai untuk isi awal Toggle
  // Auto Backup + sub-label "Backup terakhir". Aman untuk data lama:
  // getConfig() sudah menangani default kalau field ini belum pernah ada
  // (lihat settings.repository.js).
  const config = await settingsRepo.getConfig();

  // --- Import: input file tersembunyi, dipicu dari menu row ---
  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = "application/json";
  importInput.style.display = "none";
  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    importInput.value = "";
    if (!file) return;

    let payload;
    try {
      payload = await readFileAsJSON(file);
    } catch (err) {
      alert(err.message);
      return;
    }

    const { valid, errors } = validateBackup(payload);
    if (!valid) {
      alert(`File backup tidak valid:\n${errors.join("\n")}`);
      return;
    }

    const modal = Modal({
      title: "Konfirmasi Import",
      body: "Seluruh data saat ini akan ditimpa dengan isi file backup ini. Tindakan ini tidak bisa dibatalkan. Lanjutkan?",
      actions: [
        Button({ label: "Batal", variant: "secondary", onClick: () => modal.close() }),
        Button({
          label: "Timpa Data",
          variant: "danger",
          onClick: async () => {
            await importData(payload);
            modal.close();
            window.location.href = "../home/index.html";
          },
        }),
      ],
    });
    document.body.appendChild(modal);
  });

  // MVP2 M7.4 — toggle Auto Backup. `right` di MenuRow menggantikan
  // chevron, jadi baris ini bukan tombol (tidak ada aksi tap-baris), hanya
  // switch-nya yang interaktif. Tidak ada modal konfirmasi (mematikan
  // Auto Backup bukan aksi merusak data, sesuai roadmap 7.4).
  const autoBackupToggle = Toggle({
    checked: config.autoBackupEnabled,
    ariaLabel: "Auto Backup",
    onChange: async (checked) => {
      await settingsRepo.setAutoBackupEnabled(checked);
      showToast({
        message: checked ? "Auto Backup diaktifkan." : "Auto Backup dimatikan.",
      });
    },
  });

  // --- Grup: Data ---
  const dataGroup = MenuGroup({
    title: "Data",
    rows: [
      MenuRow({
        icon: "⇅",
        label: "Export Data (JSON)",
        sub: "Simpan seluruh data ke satu file backup",
        chevron: false,
        onClick: async () => {
          await exportToFile();
          showToast({ message: "Backup berhasil diunduh." });
          render(); // refresh sub-label "Backup terakhir"
        },
      }),
      MenuRow({
        icon: "⬆",
        label: "Import Data (JSON)",
        sub: "Pulihkan data dari file backup, menimpa data saat ini",
        chevron: false,
        onClick: () => importInput.click(),
      }),
      MenuRow({
        icon: "🔄",
        label: "Auto Backup",
        sub: formatLastBackup(config.lastBackupAt),
        right: autoBackupToggle,
      }),
    ],
  });

  // --- Grup: Lainnya ---
  const otherGroup = MenuGroup({
    title: "Lainnya",
    rows: [
      MenuRow({
        icon: "🗑",
        label: "Reset Semua Data",
        sub: "Hapus seluruh data lokal, termasuk jadwal & sesi absensi",
        danger: true,
        chevron: false,
        onClick: () => {
          const modal = Modal({
            title: "Reset Semua Data?",
            body: "Ini akan menghapus SELURUH data — tahun ajaran, kelas, siswa, jadwal, sesi absensi, dan riwayat kehadiran — tanpa bisa dikembalikan kecuali kamu punya file backup. Lanjutkan?",
            actions: [
              Button({ label: "Batal", variant: "secondary", onClick: () => modal.close() }),
              Button({
                label: "Ya, Hapus Semua",
                variant: "danger",
                onClick: async () => {
                  await clearAllStores();
                  modal.close();
                  window.location.href = "../home/index.html";
                },
              }),
            ],
          });
          document.body.appendChild(modal);
        },
      }),
      MenuRow({
        icon: "ℹ️",
        label: "Tentang Aplikasi",
        sub: "Versi, info aplikasi",
        onClick: () => {
          window.location.href = "../about/index.html";
        },
      }),
    ],
  });

  main.appendChild(dataGroup);
  main.appendChild(otherGroup);

  // R12.2 — hanya tampil kalau ada Jadwal/AttendanceSession/AttendanceRecord
  // yang classId/studentId-nya sudah tidak ada di Data Master (lihat
  // orphanCleanup.js). Ditaruh setelah "Lainnya" supaya tidak dikira bagian
  // dari Reset Semua Data (dua aksi berbeda: ini hapus terarah, bukan total).
  const orphanGroup = await renderOrphanCleanupGroup();
  if (orphanGroup) main.appendChild(orphanGroup);

  main.appendChild(importInput);

  app.appendChild(main);
}

async function main() {
  await openDB();
  await runPage(app, render);
}

main();
