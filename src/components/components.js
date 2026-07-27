/*
  Core Components — vanilla JS, tanpa dependency.
  Setiap fungsi mengembalikan HTMLElement.
*/

export function Button({ label, variant = "primary", block = false, disabled = false, onClick }) {
  const btn = document.createElement("button");
  btn.className = `btn btn--${variant}${block ? " btn--block" : ""}`;
  btn.textContent = label;
  btn.disabled = disabled;
  if (onClick) btn.addEventListener("click", onClick);
  return btn;
}

export function Input({ label, type = "text", value = "", placeholder = "", error = "", onInput }) {
  const wrap = document.createElement("div");
  wrap.className = "field";

  if (label) {
    const lbl = document.createElement("label");
    lbl.className = "field__label";
    lbl.textContent = label;
    wrap.appendChild(lbl);
  }

  const input = document.createElement("input");
  input.className = "field__input";
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  if (onInput) input.addEventListener("input", (e) => onInput(e.target.value));
  wrap.appendChild(input);

  if (error) {
    const err = document.createElement("div");
    err.className = "field__error";
    err.textContent = error;
    wrap.appendChild(err);
  }

  wrap.inputEl = input;
  return wrap;
}

export function Select({ label, options = [], value = "", onChange }) {
  const wrap = document.createElement("div");
  wrap.className = "field";

  if (label) {
    const lbl = document.createElement("label");
    lbl.className = "field__label";
    lbl.textContent = label;
    wrap.appendChild(lbl);
  }

  const select = document.createElement("select");
  select.className = "field__input";
  options.forEach((opt) => {
    const optionEl = document.createElement("option");
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    if (opt.value === value) optionEl.selected = true;
    select.appendChild(optionEl);
  });
  if (onChange) select.addEventListener("change", (e) => onChange(e.target.value));
  wrap.appendChild(select);

  wrap.selectEl = select;
  return wrap;
}

export function Card({ content, pressable = false, onClick }) {
  const card = document.createElement("div");
  card.className = `card${pressable ? " card--pressable" : ""}`;
  if (content instanceof HTMLElement) card.appendChild(content);
  else card.innerHTML = content;
  if (pressable && onClick) card.addEventListener("click", onClick);
  return card;
}

const STATUS_LABEL = {
  present: "Hadir",
  permission: "Izin",
  sick: "Sakit",
  absent: "Alpha",
};

export function Badge({ status, label }) {
  const badge = document.createElement("span");
  const variant = status ? status : "neutral";
  badge.className = `badge badge--${variant}`;
  badge.textContent = label || STATUS_LABEL[status] || status || "";
  return badge;
}

export function AppBar({ title, leftAction, rightAction }) {
  const bar = document.createElement("header");
  bar.className = "appbar";

  if (leftAction) bar.appendChild(leftAction);

  const titleEl = document.createElement("h2");
  titleEl.className = "appbar__title";
  titleEl.textContent = title;
  bar.appendChild(titleEl);

  if (rightAction) bar.appendChild(rightAction);

  return bar;
}

export function MenuRow({ icon, label, sub, danger = false, chevron = true, onClick }) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = `menu-row${danger ? " menu-row--danger" : ""}`;

  if (icon) {
    const iconEl = document.createElement("span");
    iconEl.className = "menu-row__icon";
    iconEl.setAttribute("aria-hidden", "true");
    iconEl.textContent = icon;
    row.appendChild(iconEl);
  }

  const textEl = document.createElement("div");
  textEl.className = "menu-row__text";
  textEl.textContent = label;
  if (sub) {
    const subEl = document.createElement("div");
    subEl.className = "menu-row__sub";
    subEl.textContent = sub;
    textEl.appendChild(subEl);
  }
  row.appendChild(textEl);

  if (chevron) {
    const chevronEl = document.createElement("span");
    chevronEl.className = "menu-row__chevron";
    chevronEl.setAttribute("aria-hidden", "true");
    chevronEl.textContent = "›";
    row.appendChild(chevronEl);
  }

  if (onClick) row.addEventListener("click", onClick);
  return row;
}

export function MenuGroup({ title, rows = [] }) {
  const group = document.createElement("div");
  group.className = "menu-group";

  if (title) {
    const heading = document.createElement("div");
    heading.className = "menu-group__title";
    heading.textContent = title;
    group.appendChild(heading);
  }

  rows.forEach((row) => group.appendChild(row));
  return group;
}

export function FloatingButton({ icon = "+", onClick }) {
  const fab = document.createElement("button");
  fab.className = "fab";
  fab.setAttribute("aria-label", "Tambah");
  fab.textContent = icon;
  if (onClick) fab.addEventListener("click", onClick);
  return fab;
}

/*
  Bottom Navigation — 4 tab (Beranda / Data Master / Riwayat / Pengaturan).

  Catatan penting: catatan pembuka 05-Roadmap-Redesign-UIUX.md menyebut
  komponen ini "sudah jalan" (dicek dari README log 2026-07-27) sehingga
  sengaja tidak dimasukkan milestone R1-R10. Audit ulang (2026-07-27)
  menemukan komponen ini TIDAK PERNAH ada di source code — hanya ada di
  file mockup HTML. Ditambahkan sekarang sebagai bagian dari perbaikan,
  mengikuti persis markup/ikon di mockup-redesign-v2.html.

  Navigasi pakai <a href> biasa (bukan client-side routing), karena app
  ini multi-page — satu tab = satu file .html terpisah (01-Arsitektur).
  Efek samping sengaja: menambah class "has-bottomnav" ke <body> supaya
  CSS (components.css) tahu perlu menyisakan ruang di bawah untuk konten
  & FAB, tanpa tiap halaman harus mengatur padding-nya sendiri.
*/
const BOTTOM_NAV_ITEMS = [
  {
    tab: "beranda",
    href: "../home/index.html",
    label: "Beranda",
    icon: `<path d="M4 11.5L12 4l8 7.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    tab: "data",
    href: "../master-data/index.html",
    label: "Data Master",
    icon: `<path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l2 2.5h7A1.5 1.5 0 0 1 20 9v8.5A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-11Z" stroke-width="2" stroke-linejoin="round"/>`,
  },
  {
    tab: "riwayat",
    href: "../history/index.html",
    label: "Riwayat",
    icon: `<circle cx="12" cy="12" r="8" stroke-width="2"/><path d="M12 8v4l3 2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    tab: "pengaturan",
    href: "../settings/index.html",
    label: "Pengaturan",
    icon: `<circle cx="12" cy="12" r="2.6" stroke-width="2"/><path d="M12 4.5v1.6M12 17.9v1.6M4.5 12h1.6M17.9 12h1.6M6.8 6.8l1.15 1.15M16.05 16.05l1.15 1.15M6.8 17.2l1.15-1.15M16.05 7.95l1.15-1.15" stroke-width="2" stroke-linecap="round"/>`,
  },
];

export function BottomNav({ active }) {
  document.body.classList.add("has-bottomnav");

  const nav = document.createElement("nav");
  nav.className = "bottomnav";
  nav.setAttribute("aria-label", "Navigasi utama");

  BOTTOM_NAV_ITEMS.forEach(({ tab, href, label, icon }) => {
    const item = document.createElement("a");
    item.className = `navitem${tab === active ? " is-active" : ""}`;
    item.href = href;
    if (tab === active) item.setAttribute("aria-current", "page");
    item.innerHTML = `
      <span class="icon-wrap"><svg width="21" height="21" viewBox="0 0 24 24" fill="none">${icon}</svg></span>
      <span class="label">${label}</span>
    `;
    nav.appendChild(item);
  });

  return nav;
}

let activeToast = null;

/**
 * Toast singkat di bawah layar. Kalau `undoLabel` diberikan, aksi sesungguhnya
 * (onCommit) baru dijalankan setelah durasi habis TANPA ditekan Urungkan.
 */
export function showToast({ message, undoLabel, onUndo, onCommit, duration = 4000 }) {
  if (activeToast) activeToast.remove();

  const toast = document.createElement("div");
  toast.className = "toast";

  const text = document.createElement("span");
  text.textContent = message;
  toast.appendChild(text);

  let timeoutId;
  let undone = false;

  if (undoLabel) {
    const undoBtn = document.createElement("button");
    undoBtn.className = "toast__undo";
    undoBtn.textContent = undoLabel;
    undoBtn.addEventListener("click", () => {
      undone = true;
      clearTimeout(timeoutId);
      toast.remove();
      if (onUndo) onUndo();
    });
    toast.appendChild(undoBtn);
  }

  document.body.appendChild(toast);
  activeToast = toast;

  timeoutId = setTimeout(() => {
    toast.remove();
    if (activeToast === toast) activeToast = null;
    if (!undone && onCommit) onCommit();
  }, duration);

  return toast;
}

export function Modal({ title, body, actions = [] }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";

  const titleEl = document.createElement("h3");
  titleEl.className = "modal__title";
  titleEl.textContent = title;
  modal.appendChild(titleEl);

  const bodyEl = document.createElement("div");
  bodyEl.className = "modal__body";
  if (body instanceof HTMLElement) bodyEl.appendChild(body);
  else bodyEl.textContent = body;
  modal.appendChild(bodyEl);

  const actionsEl = document.createElement("div");
  actionsEl.className = "modal__actions";
  actions.forEach((actionEl) => actionsEl.appendChild(actionEl));
  modal.appendChild(actionsEl);

  overlay.appendChild(modal);

  overlay.close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.close();
  });

  return overlay;
}

export function BottomSheet({ content }) {
  const overlay = document.createElement("div");
  overlay.className = "sheet-overlay";

  const sheet = document.createElement("div");
  sheet.className = "sheet";

  const handle = document.createElement("div");
  handle.className = "sheet__handle";
  sheet.appendChild(handle);

  if (content instanceof HTMLElement) sheet.appendChild(content);
  else sheet.innerHTML = content;

  overlay.appendChild(sheet);

  overlay.close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.close();
  });

  return overlay;
}
