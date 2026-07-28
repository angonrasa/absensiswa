import { openDB } from "../../src/database/db.js";
import { AcademicYearRepository } from "../../src/modules/settings/academicYear.repository.js";
import { ClassRepository } from "../../src/modules/class/class.repository.js";
import { StudentRepository } from "../../src/modules/student/student.repository.js";
import { ScheduleRepository } from "../../src/modules/schedule/schedule.repository.js";
import { AttendanceRepository } from "../../src/modules/attendance/attendance.repository.js";
import { showLoading, showError } from "../../src/components/pageState.js";
import {
  AppBar,
  BottomNav,
  Button,
  Modal,
  BottomSheet,
  FloatingButton,
  showToast,
} from "../../src/components/components.js";
import { renderAcademicYearTab } from "./academic-year.tab.js";
import { renderClassTab } from "./class.tab.js";
import { renderStudentTab } from "./student.tab.js";
import { renderScheduleTab } from "./schedule.tab.js";

export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export const academicYearRepo = new AcademicYearRepository();
export const classRepo = new ClassRepository();
export const studentRepo = new StudentRepository();
export const scheduleRepo = new ScheduleRepository();
export const attendanceRepo = new AttendanceRepository();

const TABS = [
  { key: "academicYear", label: "Tahun Ajaran" },
  { key: "class", label: "Kelas" },
  { key: "student", label: "Siswa" },
  { key: "schedule", label: "Jadwal" },
];

// Dukung tautan langsung ke tab tertentu, cth. dari Beranda: "?tab=schedule"
// (dipakai supaya "Lihat jadwal seminggu →" langsung membuka tab Jadwal).
const requestedTab = new URLSearchParams(window.location.search).get("tab");
let activeTab = TABS.some((t) => t.key === requestedTab) ? requestedTab : "academicYear";

const app = document.getElementById("app");

/* ---------------- Helper bersama (dipakai oleh keempat tab) ---------------- */

export function openSheet(content) {
  const sheet = BottomSheet({ content });
  document.body.appendChild(sheet);
  return sheet;
}

export function confirmDelete(message, doDelete) {
  const modal = Modal({
    title: "Hapus Data",
    body: message,
    actions: [
      Button({ label: "Batal", variant: "secondary", onClick: () => modal.close() }),
      Button({
        label: "Hapus",
        variant: "danger",
        onClick: () => {
          modal.close();
          showToast({
            message: "Data dihapus.",
            undoLabel: "Urungkan",
            onCommit: async () => {
              await doDelete();
              renderTabContent();
            },
          });
        },
      }),
    ],
  });
  document.body.appendChild(modal);
}

// MVP 2 Milestone 5.2 — versi jamak dari confirmDelete, dipakai tombol
// "Hapus Terpilih" di ketiga tab. Pola sama persis (modal konfirmasi lalu
// toast + undo, aksi hapus sesungguhnya baru jalan saat toast commit),
// supaya guru tetap punya kesempatan membatalkan seperti hapus satuan.
export function confirmBulkDelete(count, doDeleteAll) {
  const modal = Modal({
    title: "Hapus Data",
    body: `${count} item terpilih akan dihapus. Lanjutkan?`,
    actions: [
      Button({ label: "Batal", variant: "secondary", onClick: () => modal.close() }),
      Button({
        label: "Hapus",
        variant: "danger",
        onClick: () => {
          modal.close();
          showToast({
            message: `${count} item dihapus.`,
            undoLabel: "Urungkan",
            onCommit: async () => {
              await doDeleteAll();
              renderTabContent();
            },
          });
        },
      }),
    ],
  });
  document.body.appendChild(modal);
}

export function emptyState(text) {
  const el = document.createElement("div");
  el.className = "empty-state";
  el.textContent = text;
  return el;
}

export function iconButton(icon, label, onClick) {
  const btn = document.createElement("button");
  btn.className = "icon-btn";
  btn.setAttribute("aria-label", label);
  btn.textContent = icon;
  btn.addEventListener("click", onClick);
  return btn;
}

// MVP 2 Milestone 5.1 — Mode pilih (selection mode) di Data Master.
// Pola yang sama dengan selectionMode di pages/history/history.js
// (dipakai untuk bulk-delete riwayat), dipakai ulang di sini supaya
// ketiga tab (Kelas/Siswa/Jadwal) tidak menulis logika checkbox sendiri-sendiri.
//
// mainHtml   : HTML string untuk isi utama baris (judul + subjudul), sama
//              seperti yang selama ini langsung ditaruh di row.innerHTML.
// selectionMode : boolean, apakah mode pilih sedang aktif.
// selected      : boolean, apakah baris ini sedang dicentang.
// onToggle      : dipanggil saat baris/checkbox di-tap.
// actionsEl     : elemen aksi (Edit/Hapus) — disembunyikan saat mode pilih aktif,
//                 supaya tidak ada aksi ganda (checkbox vs icon hapus) pada baris yang sama.
export function selectableRow(mainHtml, { selectionMode, selected, onToggle, actionsEl }) {
  const row = document.createElement("div");
  row.className = "list-row";
  if (selectionMode) row.classList.add("list-row--selectable");

  if (selectionMode) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "list-row__checkbox";
    checkbox.checked = !!selected;
    checkbox.addEventListener("change", () => onToggle());
    row.appendChild(checkbox);
    row.addEventListener("click", (e) => {
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
        onToggle();
      }
    });
  }

  const mainWrap = document.createElement("div");
  mainWrap.innerHTML = mainHtml;
  row.appendChild(mainWrap.firstElementChild);

  if (!selectionMode && actionsEl) row.appendChild(actionsEl);

  return row;
}

// Tombol "Pilih" / "Batal Pilih" yang dipakai di header tiap tab. State
// selectionMode tetap disimpan lokal di tiap tab (bukan disatukan di sini)
// supaya Kelas/Siswa/Jadwal tetap independen sesuai Agents-rules.md
// ("Keep modules independent").
export function selectToggleButton(onClick) {
  return Button({ label: "Pilih", variant: "secondary", onClick });
}

/* ---------------- Shell ---------------- */

const RENDERERS = {
  academicYear: renderAcademicYearTab,
  class: renderClassTab,
  student: renderStudentTab,
  schedule: renderScheduleTab,
};

export async function renderTabContent() {
  const container = document.getElementById("tab-content");
  showLoading(container, "Memuat data...");
  try {
    const built = document.createElement("div");
    await RENDERERS[activeTab](built);
    container.innerHTML = "";
    container.append(...built.childNodes);
  } catch (err) {
    console.error(err);
    showError(container, "Gagal memuat data. Coba pilih tab lain lalu kembali.");
  }
}

function renderShell() {
  app.innerHTML = "";
  app.appendChild(AppBar({ title: "Data Master" }));
  app.appendChild(BottomNav({ active: "data" }));

  const tabs = document.createElement("div");
  tabs.className = "tabs";
  TABS.forEach((tab) => {
    const btn = document.createElement("button");
    btn.className = `tab${tab.key === activeTab ? " tab--active" : ""}`;
    btn.textContent = tab.label;
    btn.addEventListener("click", () => {
      activeTab = tab.key;
      renderShell();
    });
    tabs.appendChild(btn);
  });
  app.appendChild(tabs);

  const main = document.createElement("main");
  main.id = "tab-content";
  app.appendChild(main);

  renderTabContent();
}

async function main() {
  try {
    await openDB();
    renderShell();
  } catch (err) {
    console.error(err);
    showError(app, "Gagal memuat aplikasi. Coba muat ulang halaman.");
  }
}

main();
