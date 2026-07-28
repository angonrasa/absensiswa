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
