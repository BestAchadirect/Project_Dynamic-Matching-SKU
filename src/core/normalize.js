export function normalizeHeader(header) {
  return String(header || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalHeader(header) {
  return normalizeHeader(header).replace(/[^a-z0-9]/g, "");
}

export function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeSynonymValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(\d)\s+([a-z%]+)/gi, "$1$2")
    .trim();
}

export function readCell(row, header) {
  if (!header) {
    return "";
  }
  return String(row[header] ?? "").trim();
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
