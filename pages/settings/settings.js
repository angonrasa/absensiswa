import { openDB, clearAllStores } from "../../src/database/db.js";
import {
  exportToFile,
  importData,
  readFileAsJSON,
  validateBackup,
} from "../../src/modules/backup/backup.service.js";
import { AppBar, Button, Card, Modal, showToast } from "../../src/components/components.js";
import { runPage } from "../../src/core/pageState.js";

const app = document.getElementById("app");

function section({ title, description, children }) {
  const wrap = document.createElement("div");
  wrap.className = "settings-section";

  const heading = document.createElement("h3");
  heading.textContent = title;
  wrap.appendChild(heading);

  if (description) {
    const desc = document.createElement("p");
    desc.textContent = description;
    wrap.appendChild(desc);
  }

  children.forEach((child) => wrap.appendChild(child));
  return wrap;
}

async function render() {
  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Pengaturan" }));

  const main = document.createElement("main");

  // --- Backup: Export ---
  const exportBtn = Button({
    label: "Export Data (JSON)",
    variant: "secondary",
    block: true,
    onClick: async () => {
      await exportToFile();
      showToast({ message: "Backup berhasil diunduh." });
    },
  });

  const exportCard = Card({
    content: section({
      title: "Backup Data",
      description:
        "Simpan seluruh data (tahun ajaran, kelas, siswa, jadwal, dan riwayat kehadiran) ke satu file JSON.",
      children: [exportBtn],
    }),
  });
  exportCard.style.marginBottom = "var(--space-4)";
  main.appendChild(exportCard);

  // --- Backup: Import ---
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

  const importBtn = Button({
    label: "Import Data (JSON)",
    variant: "secondary",
    block: true,
    onClick: () => importInput.click(),
  });

  const importCard = Card({
    content: section({
      title: "Restore Data",
      description: "Pulihkan data dari file backup JSON. Data saat ini akan ditimpa.",
      children: [importBtn, importInput],
    }),
  });
  importCard.style.marginBottom = "var(--space-4)";
  main.appendChild(importCard);

  // --- Reset semua data ---
  const resetBtn = Button({
    label: "Reset Semua Data",
    variant: "danger",
    block: true,
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
  });

  const resetCard = Card({
    content: section({
      title: "Reset Data",
      description:
        "Hapus total seluruh isi database (termasuk jadwal dan sesi absensi yang tidak bisa dihapus satu-satu dari Data Master). Gunakan untuk mulai dari awal yang benar-benar bersih.",
      children: [resetBtn],
    }),
  });
  resetCard.classList.add("settings-danger");
  main.appendChild(resetCard);

  app.appendChild(main);
}

async function main() {
  await openDB();
  await runPage(app, render);
}

main();
