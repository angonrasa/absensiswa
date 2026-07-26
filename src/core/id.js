/**
 * Generate ID unik secara lokal (tanpa dependency eksternal).
 * Format: prefix-timestamp36-random4
 */
export function generateId(prefix = "id") {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${time}-${rand}`;
}
