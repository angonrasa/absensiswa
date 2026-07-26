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

export function FloatingButton({ icon = "+", onClick }) {
  const fab = document.createElement("button");
  fab.className = "fab";
  fab.setAttribute("aria-label", "Tambah");
  fab.textContent = icon;
  if (onClick) fab.addEventListener("click", onClick);
  return fab;
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
