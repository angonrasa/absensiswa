import { openDB } from "../../src/database/db.js";
import { AcademicYearRepository } from "../../src/modules/settings/academicYear.repository.js";
import { ClassRepository } from "../../src/modules/class/class.repository.js";
import { StudentRepository } from "../../src/modules/student/student.repository.js";
import { ScheduleRepository } from "../../src/modules/schedule/schedule.repository.js";
import { SettingsRepository } from "../../src/modules/settings/settings.repository.js";
import { computeSetupChecklist, isSetupComplete } from "../../src/core/setupChecklist.js";
import { showLoading, showError } from "../../src/components/pageState.js";
import { escapeHtml } from "../../src/core/html.js";
import { buildClassFields } from "../../src/core/class-fields.js";
import { buildScheduleFields } from "../../src/core/schedule-fields.js";
import { buildStudentBulkFields } from "../../src/core/student-bulk-fields.js";
import { parseBulkStudentLines } from "../../src/core/student-bulk-parser.js";
import { Button } from "../../src/components/components.js";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const academicYearRepo = new AcademicYearRepository();
const classRepo = new ClassRepository();
const studentRepo = new StudentRepository();
const scheduleRepo = new ScheduleRepository();
const settingsRepo = new SettingsRepository();

const app = document.getElementById("app");

// R9.1 — meta per step (label progress, judul, subjudul), sesuai mockup-wizard-steps.html.
const STEP_META = [
  { label: "Kelas", title: "Tambah kelas", sub: "Buat minimal satu kelas untuk mulai absensi." },
  { label: "Siswa", title: "Tambah siswa", sub: "Tempel daftar nama sekaligus, atau satu-satu." },
  { label: "Jadwal", title: "Tambah jadwal mengajar", sub: "Kapan kamu mengajar kelas ini setiap minggu?" },
];

let currentStep = 0; // 0, 1, 2, atau "done"
let lastAddedClassId = null; // R9.3 — dipakai sebagai default kelas di Step Siswa & Jadwal

function goHome() {
  window.location.href = "../home/index.html";
}
function goWelcome() {
  window.location.href = "../welcome/index.html";
}

/** R9.6 — "Lewati" pojok atas: keluar wizard sepenuhnya, progres yang sudah
 * sempat diisi tetap tersimpan (form manggil repository yang sama seperti
 * Data Master biasa, bukan state sementara). */
async function skipAll() {
  await settingsRepo.setHasSeenOnboarding(true);
  goHome();
}

/**
 * R10.2 — supaya "Lanjutkan Setup" dari Beranda (dan "Mulai Setup" dari
 * Welcome) membuka Wizard tepat di step yang belum selesai, bukan selalu
 * dari Step 1. Urutan STEP_BUILDERS (Kelas, Siswa, Jadwal) sengaja sama
 * persis dengan urutan langkah non-academicYear di computeSetupChecklist
 * (R10.1) — satu sumber kebenaran, tidak ada aturan urutan kedua yang
 * bisa berbeda dari checklist di Welcome/Beranda.
 */
function resolveStartingStep({ classCount, studentCount, scheduleCount }) {
  const checklist = computeSetupChecklist({ classCount, studentCount, scheduleCount }).filter(
    (step) => step.key !== "academicYear"
  );
  const firstUnfinished = checklist.findIndex((step) => !step.done);
  return firstUnfinished === -1 ? "done" : firstUnfinished;
}

/**
 * Di luar cakupan tertulis R9, tapi wajib supaya Step 1 bisa dipakai:
 * checklist R4.3/R8.2 menandai "Tahun ajaran aktif" selalu done=true dengan
 * asumsi "dibuat otomatis oleh aplikasi" — tapi belum ada kode yang benar-benar
 * membuatnya. Tanpa tahun ajaran, form Tambah Kelas (dipakai apa adanya dari
 * Data Master) terkunci ("Buat Tahun Ajaran terlebih dahulu"). Diperbaiki
 * dengan membuat SATU tahun ajaran otomatis kalau belum ada satu pun —
 * memanggil academicYearRepo.create()+activate() yang sudah ada, tidak ada
 * tabel/field baru.
 */
async function ensureActiveAcademicYear() {
  const years = await academicYearRepo.getAll();
  if (years.length > 0) return years.find((y) => y.isActive) || years[0];

  const now = new Date();
  // Tahun ajaran Indonesia umumnya mulai Juli.
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const name = `${startYear}/${startYear + 1}`;
  const created = await academicYearRepo.create({ name });
  await academicYearRepo.activate(created.id);
  return created;
}

/* ---------------- Step 1: Kelas (R9.2) ---------------- */

async function buildStepClass() {
  const container = document.createElement("div");
  const years = await academicYearRepo.getAll();

  const { nameInput, gradeInput, yearSelect, getValue, validate } = buildClassFields(years);

  container.appendChild(nameInput);
  container.appendChild(gradeInput);
  container.appendChild(yearSelect);

  const errorEl = document.createElement("p");
  errorEl.className = "wizard-error";
  errorEl.style.display = "none";
  container.appendChild(errorEl);

  const addBtn = Button({
    label: "+ Tambah Kelas",
    variant: "secondary",
    block: true,
    onClick: async () => {
      if (!validate()) {
        errorEl.textContent = "Isi nama kelas terlebih dahulu.";
        errorEl.style.display = "block";
        return;
      }
      errorEl.style.display = "none";
      const { name, grade, academicYearId } = getValue();
      const created = await classRepo.create({ name, grade, academicYearId });
      lastAddedClassId = created.id;
      nameInput.inputEl.value = "";
      gradeInput.inputEl.value = "";
      await refreshChips();
    },
  });
  container.appendChild(addBtn);

  const chipsWrap = document.createElement("div");
  chipsWrap.className = "wizard-added";
  chipsWrap.style.display = "none";
  const chipsTitle = document.createElement("div");
  chipsTitle.className = "wizard-added__title";
  chipsTitle.textContent = "Sudah ditambahkan";
  const chipsList = document.createElement("div");
  chipsWrap.appendChild(chipsTitle);
  chipsWrap.appendChild(chipsList);
  container.appendChild(chipsWrap);

  async function refreshChips() {
    const classes = await classRepo.getAll();
    chipsList.innerHTML = "";
    chipsWrap.style.display = classes.length ? "" : "none";
    classes.forEach((c) => {
      const chip = document.createElement("span");
      chip.className = "wizard-chip";
      chip.innerHTML = `${escapeHtml(c.name)} <span class="wizard-chip__x" role="button" aria-label="Hapus ${escapeHtml(c.name)}">×</span>`;
      chip.querySelector(".wizard-chip__x").addEventListener("click", async () => {
        await classRepo.remove(c.id);
        if (lastAddedClassId === c.id) lastAddedClassId = null;
        await refreshChips();
      });
      chipsList.appendChild(chip);
    });
  }
  await refreshChips();

  return container;
}

/* ---------------- Step 2: Siswa / bulk add (R9.3) ---------------- */

async function buildStepStudent() {
  const container = document.createElement("div");
  const classes = await classRepo.getAll();

  if (classes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "wizard-hint";
    empty.textContent = "Tambahkan kelas dulu di langkah sebelumnya.";
    container.appendChild(empty);
    return container;
  }

  const { classSelect, genderDefaultSelect, nisStartInput, textareaWrap, textarea, getLines } =
    buildStudentBulkFields(classes, { defaultClassId: lastAddedClassId });
  container.appendChild(classSelect);
  container.appendChild(genderDefaultSelect);
  container.appendChild(nisStartInput);
  container.appendChild(textareaWrap);

  const hint = document.createElement("div");
  hint.className = "wizard-hint-card";
  hint.innerHTML = `<span aria-hidden="true">💡</span><span>Format bebas: Nama saja, atau tambahkan koma untuk NIS dan/atau L/P per baris. NIS Awal opsional — kosongkan agar nama tanpa NIS diisi otomatis urut.</span>`;
  container.appendChild(hint);

  const errorEl = document.createElement("p");
  errorEl.className = "wizard-error";
  errorEl.style.display = "none";
  container.appendChild(errorEl);

  const addBtn = Button({
    label: "Tambah Semua",
    variant: "secondary",
    block: true,
    onClick: async () => {
      const classId = classSelect.selectEl.value;
      const lines = getLines();

      if (!classId || lines.length === 0) {
        errorEl.textContent = "Pilih kelas dan isi minimal satu nama siswa.";
        errorEl.style.display = "block";
        return;
      }
      errorEl.style.display = "none";

      const autoNis = nisStartInput.inputEl.value.trim();
      const defaultGender = genderDefaultSelect.selectEl.value;
      const parsed = parseBulkStudentLines(textarea.value, { defaultGender, nisStart: autoNis });

      for (const student of parsed) {
        await studentRepo.create({ classId, ...student });
      }

      textarea.value = "";
      nisStartInput.inputEl.value = "";
      await refreshAddedSummary();
    },
  });
  container.appendChild(addBtn);

  const addedWrap = document.createElement("div");
  addedWrap.className = "wizard-added";
  container.appendChild(addedWrap);

  async function refreshAddedSummary() {
    const classesNow = await classRepo.getAll();
    addedWrap.innerHTML = "";
    let any = false;
    for (const c of classesNow) {
      const list = await studentRepo.getByClass(c.id);
      if (list.length === 0) continue;
      any = true;
      const title = document.createElement("div");
      title.className = "wizard-added__title";
      title.textContent = `${list.length} siswa di ${c.name}`;
      addedWrap.appendChild(title);
    }
    addedWrap.style.display = any ? "" : "none";
  }
  await refreshAddedSummary();

  return container;
}

/* ---------------- Step 3: Jadwal (R9.4) ---------------- */

async function buildStepSchedule() {
  const container = document.createElement("div");
  const classes = await classRepo.getAll();

  if (classes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "wizard-hint";
    empty.textContent = "Tambahkan kelas dulu di langkah sebelumnya.";
    container.appendChild(empty);
    return container;
  }

  const allSchedules = (await Promise.all(classes.map((c) => scheduleRepo.getByClass(c.id)))).flat();

  const { subjectInput, classSelect, daySelect, startInput, endInput, getValue, validate } = buildScheduleFields(
    classes,
    allSchedules,
    { defaultClassId: lastAddedClassId }
  );
  container.appendChild(subjectInput);
  container.appendChild(classSelect);
  container.appendChild(daySelect);
  container.appendChild(startInput);
  container.appendChild(endInput);

  const errorEl = document.createElement("p");
  errorEl.className = "wizard-error";
  errorEl.style.display = "none";
  container.appendChild(errorEl);

  const addBtn = Button({
    label: "+ Tambah Jadwal",
    variant: "secondary",
    block: true,
    onClick: async () => {
      if (!validate()) {
        errorEl.textContent = "Lengkapi semua field jadwal.";
        errorEl.style.display = "block";
        return;
      }
      errorEl.style.display = "none";
      const { subject, classId, day, startTime, endTime } = getValue();
      await scheduleRepo.create({ subject, classId, day, startTime, endTime });
      await refreshChips();
    },
  });
  container.appendChild(addBtn);

  const chipsWrap = document.createElement("div");
  chipsWrap.className = "wizard-added";
  chipsWrap.style.display = "none";
  const chipsTitle = document.createElement("div");
  chipsTitle.className = "wizard-added__title";
  chipsTitle.textContent = "Sudah ditambahkan";
  const chipsList = document.createElement("div");
  chipsWrap.appendChild(chipsTitle);
  chipsWrap.appendChild(chipsList);
  container.appendChild(chipsWrap);

  async function refreshChips() {
    const classesNow = await classRepo.getAll();
    const classById = Object.fromEntries(classesNow.map((c) => [c.id, c]));
    const schedulesNow = (await Promise.all(classesNow.map((c) => scheduleRepo.getByClass(c.id))))
      .flat()
      .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.startTime.localeCompare(b.startTime));

    chipsList.innerHTML = "";
    chipsWrap.style.display = schedulesNow.length ? "" : "none";
    schedulesNow.forEach((s) => {
      const chip = document.createElement("span");
      chip.className = "wizard-chip";
      const label = `${s.day} · ${s.startTime} · ${classById[s.classId]?.name || "-"}`;
      chip.innerHTML = `${escapeHtml(label)} <span class="wizard-chip__x" role="button" aria-label="Hapus ${escapeHtml(label)}">×</span>`;
      chip.querySelector(".wizard-chip__x").addEventListener("click", async () => {
        await scheduleRepo.remove(s.id);
        await refreshChips();
      });
      chipsList.appendChild(chip);
    });
  }
  await refreshChips();

  return container;
}

const STEP_BUILDERS = [buildStepClass, buildStepStudent, buildStepSchedule];

/* ---------------- Shell (R9.1) ---------------- */

function renderShell(stepIndex, contentEl, ctaLabel, onCta, nextValue) {
  app.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "wizard";

  const head = document.createElement("div");
  head.className = "wizard-head";

  const top = document.createElement("div");
  top.className = "wizard-top";

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "wizard-back";
  backBtn.textContent = "‹ Kembali";
  backBtn.addEventListener("click", () => {
    if (stepIndex === 0) {
      goWelcome();
      return;
    }
    currentStep = stepIndex - 1;
    renderCurrentStep();
  });
  top.appendChild(backBtn);

  const skipTopBtn = document.createElement("button");
  skipTopBtn.type = "button";
  skipTopBtn.className = "wizard-skip";
  skipTopBtn.textContent = "Lewati";
  skipTopBtn.addEventListener("click", skipAll);
  top.appendChild(skipTopBtn);

  head.appendChild(top);

  const progress = document.createElement("div");
  progress.className = "wizard-progress";
  [0, 1, 2].forEach((i) => {
    const seg = document.createElement("div");
    seg.className = "wizard-progress__seg" + (i < stepIndex ? " is-done" : i === stepIndex ? " is-current" : "");
    progress.appendChild(seg);
  });
  head.appendChild(progress);

  const stepLabel = document.createElement("div");
  stepLabel.className = "wizard-step-label";
  stepLabel.textContent = `Langkah ${stepIndex + 1} dari 3`;
  head.appendChild(stepLabel);

  const meta = STEP_META[stepIndex];
  const title = document.createElement("h2");
  title.className = "wizard-title";
  title.textContent = meta.title;
  head.appendChild(title);

  const sub = document.createElement("p");
  sub.className = "wizard-sub";
  sub.textContent = meta.sub;
  head.appendChild(sub);

  wrap.appendChild(head);

  const content = document.createElement("div");
  content.className = "wizard-content";
  content.appendChild(contentEl);
  wrap.appendChild(content);

  const actions = document.createElement("div");
  actions.className = "wizard-actions";

  const ctaBtn = Button({ label: ctaLabel, variant: "primary", block: true, onClick: onCta });
  actions.appendChild(ctaBtn);

  // R9.6 — "Lewati langkah ini": lanjut tanpa mengisi step ini.
  const skipStepBtn = Button({
    label: "Lewati langkah ini",
    variant: "ghost",
    block: true,
    onClick: () => {
      currentStep = nextValue;
      renderCurrentStep();
    },
  });
  actions.appendChild(skipStepBtn);

  wrap.appendChild(actions);
  app.appendChild(wrap);
}

async function renderCurrentStep() {
  if (currentStep === "done") {
    await renderDone();
    return;
  }

  showLoading(app, "Memuat...");
  try {
    const stepIndex = currentStep;
    const contentEl = await STEP_BUILDERS[stepIndex]();
    const nextValue = stepIndex === 2 ? "done" : stepIndex + 1;
    const ctaLabel = stepIndex === 2 ? "Selesai" : "Lanjut";
    const onCta = () => {
      currentStep = nextValue;
      renderCurrentStep();
    };
    renderShell(stepIndex, contentEl, ctaLabel, onCta, nextValue);
  } catch (err) {
    console.error(err);
    showError(app, "Gagal memuat langkah ini. Coba muat ulang.");
  }
}

/* ---------------- Layar Selesai (R9.5) ---------------- */

async function renderDone() {
  showLoading(app, "Memuat ringkasan...");
  try {
    const [classes, students, schedules] = await Promise.all([
      classRepo.getAll(),
      studentRepo.getAll(),
      scheduleRepo.getAll(),
    ]);

    // FIX: "done" bisa dicapai dua cara — beneran selesai isi 3 step, ATAU
    // menekan "Lewati langkah ini" berturut-turut tanpa mengisi apa pun.
    // Sebelumnya layar ini selalu bilang "Semua siap!" walau datanya 0/0/0.
    // Sekarang dicek dulu lewat checklist asli (fungsi yang sama dipakai
    // Welcome/Beranda, R10.1), supaya pesan sesuai kondisi sebenarnya.
    const complete = isSetupComplete({
      classCount: classes.length,
      studentCount: students.length,
      scheduleCount: schedules.length,
    });

    app.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "wizard-done";
    wrap.innerHTML = complete
      ? `
      <div class="wizard-done__mark" aria-hidden="true">✓</div>
      <h2>Semua siap!</h2>
      <p>Data dasar sudah lengkap. Absensi pertamamu tinggal satu tap dari Beranda.</p>
    `
      : `
      <div class="wizard-done__mark" aria-hidden="true">⏭</div>
      <h2>Oke, dilewati dulu</h2>
      <p>Setup belum lengkap. Kamu bisa lanjutkan kapan saja dari tombol "Lanjutkan Setup" di Beranda.</p>
    `;

    const summary = document.createElement("div");
    summary.className = "wizard-done__summary";
    summary.innerHTML = `
      <div class="wizard-done__row"><span>Kelas</span><span class="v">${classes.length} kelas</span></div>
      <div class="wizard-done__row"><span>Siswa</span><span class="v">${students.length} siswa</span></div>
      <div class="wizard-done__row"><span>Jadwal</span><span class="v">${schedules.length} jadwal</span></div>
    `;
    wrap.appendChild(summary);

    const doneBtn = Button({
      label: "Buka Beranda",
      variant: "primary",
      onClick: async () => {
        await settingsRepo.setHasSeenOnboarding(true);
        goHome();
      },
    });
    wrap.appendChild(doneBtn);

    app.appendChild(wrap);
  } catch (err) {
    console.error(err);
    showError(app, "Gagal memuat ringkasan. Coba muat ulang.");
  }
}

async function main() {
  showLoading(app, "Memuat...");
  try {
    await openDB();
    await ensureActiveAcademicYear();

    // R10.2 — resume di step pertama yang belum selesai (bukan selalu Step 1),
    // dihitung dari data asli lewat fungsi checklist yang sama dengan
    // Welcome/Beranda (R10.1).
    const [classCount, studentCount, scheduleCount] = await Promise.all([
      classRepo.getAll().then((list) => list.length),
      studentRepo.getAll().then((list) => list.length),
      scheduleRepo.getAll().then((list) => list.length),
    ]);
    currentStep = resolveStartingStep({ classCount, studentCount, scheduleCount });

    await renderCurrentStep();
  } catch (err) {
    console.error(err);
    showError(app, "Gagal memuat wizard. Coba muat ulang halaman.");
  }
}

main();
