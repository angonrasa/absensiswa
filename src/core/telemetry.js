// telemetry.js
// Telemetri sederhana: device id anonim, versi app, waktu pakai terakhir,
// jumlah penggunaan fitur, dan error. Dikirim ke Google Apps Script.
//
// Endpoint sama dengan Piyik Mind — dibedakan lewat APP_NAME di payload
// (lihat config.js).
//
// Prinsip: silent by design. Kalau offline atau endpoint gagal, app tidak
// boleh terganggu sama sekali (semua kegagalan ditelan, tidak dilempar ke atas).

import { TELEMETRY_ENDPOINT, APP_VERSION, APP_NAME } from "./config.js";

const DEVICE_ID_KEY = "absensiswa_device_id";
const COUNTERS_KEY = "absensiswa_feature_counters";
const ERRORS_KEY = "absensiswa_errors";
const LAST_SENT_KEY = "absensiswa_telemetry_last_sent";
const ENABLED_KEY = "absensiswa_telemetry_enabled";
const MAX_ERRORS = 20;
const SEND_INTERVAL_MS = 24 * 60 * 60 * 1000; // maksimal 1x per hari

/**
 * Status default: aktif (kalau belum pernah diatur), supaya perilaku lama
 * tetap sama untuk user existing. User baru tetap bisa mematikannya kapan
 * saja lewat Pengaturan > Privasi (lihat settings.controller.js).
 * @returns {boolean}
 */
export function isTelemetryEnabled() {
  const value = localStorage.getItem(ENABLED_KEY);
  return value === null ? true : value === "1";
}

/**
 * Menyalakan/mematikan telemetry. Kalau dimatikan, data yang sudah
 * terkumpul (counter fitur & error) langsung dihapus juga — tidak
 * menunggu terkirim kalau suatu saat dinyalakan lagi.
 * @param {boolean} enabled
 */
export function setTelemetryEnabled(enabled) {
  localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
  if (!enabled) {
    saveCounters({});
    localStorage.setItem(ERRORS_KEY, JSON.stringify([]));
  }
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getCounters() {
  try {
    return JSON.parse(localStorage.getItem(COUNTERS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveCounters(counters) {
  localStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
}

/**
 * Panggil ini dari modul lain untuk mencatat pemakaian fitur.
 * Contoh: trackEvent("attendance_saved")
 */
export function trackEvent(featureName) {
  if (!isTelemetryEnabled()) return;
  const counters = getCounters();
  counters[featureName] = (counters[featureName] || 0) + 1;
  saveCounters(counters);
}

function getErrors() {
  try {
    return JSON.parse(localStorage.getItem(ERRORS_KEY)) || [];
  } catch {
    return [];
  }
}

function logError(message, stack) {
  const errors = getErrors();
  errors.push({
    message: String(message || "").slice(0, 500),
    stack: String(stack || "").slice(0, 1000),
    time: new Date().toISOString(),
  });
  while (errors.length > MAX_ERRORS) errors.shift();
  localStorage.setItem(ERRORS_KEY, JSON.stringify(errors));
}

function initErrorTracking() {
  window.addEventListener("error", (event) => {
    logError(event.message, event.error && event.error.stack);
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    logError(
      reason && reason.message ? reason.message : String(reason),
      reason && reason.stack
    );
  });
}

function shouldSendToday() {
  const lastSent = localStorage.getItem(LAST_SENT_KEY);
  if (!lastSent) return true;
  return Date.now() - Number(lastSent) > SEND_INTERVAL_MS;
}

async function sendTelemetry() {
  const payload = {
    appName: APP_NAME,
    deviceId: getDeviceId(),
    version: APP_VERSION,
    lastUsed: new Date().toISOString(),
    featureUsage: getCounters(),
    errors: getErrors(),
  };

  try {
    // mode "no-cors" + Content-Type "text/plain" supaya request tidak
    // memicu preflight CORS (Apps Script Web App tidak setup CORS).
    // Konsekuensinya: kita tidak bisa baca respons (fire-and-forget).
    await fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
  } catch {
    return; // offline / gagal kirim — diamkan, coba lagi besok
  }

  // Reset counter & error lokal (best-effort; karena no-cors kita tidak bisa
  // memastikan data benar-benar sampai — tradeoff yang disengaja demi simple).
  saveCounters({});
  localStorage.setItem(ERRORS_KEY, JSON.stringify([]));
  localStorage.setItem(LAST_SENT_KEY, String(Date.now()));
}

/**
 * Panggil sekali di titik masuk aplikasi (src/index.js atau setara).
 * Tidak melakukan apa-apa kalau user sudah mematikan telemetry di
 * Pengaturan > Privasi.
 */
export function initTelemetry() {
  if (!isTelemetryEnabled()) return;

  initErrorTracking();
  if (shouldSendToday()) {
    sendTelemetry();
  }
}
