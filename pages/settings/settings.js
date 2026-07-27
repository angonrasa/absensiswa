import { openDB, clearAllStores } from "../../src/database/db.js";
import {
  exportToFile,
  importData,
  readFileAsJSON,
  validateBackup,
} from "../../src/modules/backup/backup.service.js";
import { AppBar, Button, Modal, MenuGroup, MenuRow, showToast } from "../../src/components/components.js";
import { runPage } from "../../src/core/pageState.js";

const app = document.getElementById("app");

async function render() {
  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Pengaturan" }));

  const main = document.createElement("main");

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
        },
      }),
      MenuRow({
        icon: "⬆",
        label: "Import Data (JSON)",
        sub: "Pulihkan data dari file backup, menimpa data saat ini",
        chevron: false,
        onClick: () => importInput.click(),
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
  main.appendChild(importInput);

  app.appendChild(main);
}

async function main() {
  await openDB();
  await runPage(app, render);
}

main();
