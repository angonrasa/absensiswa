/*
  UI section "Data Yatim Ditemukan" untuk halaman Pengaturan — R12.2.

  Dipisah dari orphanCleanup.js (logika murni) supaya findOrphanData/
  deleteOrphanData tetap bisa dipakai tanpa DOM, misal dari unit test (R12.6)
  atau dari home.js (R12.4) yang tidak butuh section ini sama sekali.

  Memakai pola & komponen yang SAMA seperti "Reset Semua Data" di settings.js
  (MenuGroup/MenuRow dengan danger:true, Modal untuk konfirmasi, showToast
  untuk feedback) — tidak ada CSS baru yang perlu ditambahkan, semua token
  (--color-danger, .btn--danger, .menu-row--danger) sudah ada di components.css.

  Cara pakai di settings.js — tambahkan di dalam render(), setelah otherGroup
  didefinisikan:

    import { renderOrphanCleanupGroup } from "../../src/core/orphanCleanupUI.js";
    ...
    const orphanGroup = await renderOrphanCleanupGroup();
    main.appendChild(dataGroup);
    main.appendChild(otherGroup);
    if (orphanGroup) main.appendChild(orphanGroup);
    main.appendChild(importInput);

  Group ini otomatis tidak tampil (return null) kalau tidak ada data yatim.
*/

import { MenuGroup, MenuRow, Modal, Button, showToast } from "../components/components.js";
import { findOrphanData, deleteOrphanData, summarizeOrphans } from "./orphanCleanup.js";

function describeOrphans(summary) {
  const parts = [];
  if (summary.scheduleCount > 0) parts.push(`${summary.scheduleCount} Jadwal`);
  if (summary.sessionCount > 0) parts.push(`${summary.sessionCount} Sesi Absensi`);
  if (summary.recordCount > 0) parts.push(`${summary.recordCount} Record Kehadiran`);
  return parts.join(", ");
}

/**
 * R12.2 — Bangun MenuGroup "Data Yatim" berisi satu MenuRow ringkasan +
 * aksi hapus. Async karena perlu scan (findOrphanData) dulu.
 *
 * Return `null` kalau tidak ada data yatim, supaya pemanggil cukup:
 *   if (orphanGroup) main.appendChild(orphanGroup);
 */
export async function renderOrphanCleanupGroup() {
  const orphans = await findOrphanData();
  const summary = summarizeOrphans(orphans);

  if (summary.total === 0) return null;

  const partsText = describeOrphans(summary);

  return MenuGroup({
    title: "Data Yatim",
    rows: [
      MenuRow({
        icon: "🧹",
        label: `Hapus Data Yatim (${summary.total})`,
        sub: `${partsText} — sisa data yang kelas/siswanya sudah dihapus di Data Master. Aman dihapus.`,
        danger: true,
        chevron: false,
        onClick: () => {
          const modal = Modal({
            title: "Hapus Data Yatim?",
            body: `Akan menghapus ${partsText}. Kelas, Siswa, dan Tahun Ajaran yang masih valid TIDAK terpengaruh. Tindakan ini tidak bisa dibatalkan. Lanjutkan?`,
            actions: [
              Button({ label: "Batal", variant: "secondary", onClick: () => modal.close() }),
              Button({
                label: "Ya, Hapus",
                variant: "danger",
                onClick: async () => {
                  await deleteOrphanData(orphans);
                  modal.close();
                  showToast({ message: "Data yatim berhasil dihapus." });
                  window.location.reload();
                },
              }),
            ],
          });
          document.body.appendChild(modal);
        },
      }),
    ],
  });
}
