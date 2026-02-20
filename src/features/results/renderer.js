import { NO_HEADER_DEFAULT_HEADERS, PREVIEW_LIMIT } from "../../core/constants.js";
import { escapeHtml } from "../../core/normalize.js";
import { summarizeStatuses } from "./summary.js";

export function renderDataset(kind, { state, dom }) {
  const isTransfer = kind === "transfer";
  const data = state[kind];
  const metaEl = isTransfer ? dom.transferMeta : dom.targetMeta;
  const previewEl = isTransfer ? dom.transferPreview : dom.targetPreview;

  if (!data) {
    metaEl.textContent = "";
    previewEl.innerHTML = "";
    return;
  }

  const { detected } = data;
  const items = [
    `Parse mode: <strong>${data.parseWithoutHeader ? "No Header (default template)" : "Header Row"}</strong>`,
    `Rows parsed: <strong>${data.rows.length}</strong>`,
    `SKU column: <span class="mono">${escapeHtml(detected.sku || "Not found")}</span>`,
    `MasterCode column: <span class="mono">${escapeHtml(detected.master || "Not found")}</span>`,
    `Pair #1: <span class="mono">${escapeHtml(detected.attr1 || "Not found")}</span> / <span class="mono">${escapeHtml(detected.opt1 || "Not found")}</span>`,
    `Pair #2: <span class="mono">${escapeHtml(detected.attr2 || "Not found")}</span> / <span class="mono">${escapeHtml(detected.opt2 || "Not found")}</span>`
  ];

  if (data.parseWithoutHeader) {
    items.push(
      `Default headers applied: ${NO_HEADER_DEFAULT_HEADERS.map((header) => escapeHtml(header)).join(" | ")}`
    );
  }

  if (detected.errors.length > 0) {
    items.push(`<strong>Errors:</strong> ${escapeHtml(detected.errors.join(" | "))}`);
  }

  metaEl.innerHTML = `<ul class="meta-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  previewEl.innerHTML = renderPreviewTable(data.headers, data.rows, PREVIEW_LIMIT);
}

export function renderPreviewTable(headers, rows, maxRows) {
  if (!rows || rows.length === 0) {
    return `<div class="meta">No data rows parsed.</div>`;
  }

  const previewRows = rows.slice(0, maxRows);
  const headHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyHtml = previewRows
    .map((row) => {
      const cols = headers
        .map((header) => `<td>${escapeHtml(row[header] || "")}</td>`)
        .join("");
      return `<tr>${cols}</tr>`;
    })
    .join("");

  return `<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

export function updateRunAvailability({ state, dom }) {
  const transferReady = Boolean(state.transfer && state.transfer.detected.errors.length === 0);
  const targetReady = Boolean(state.target && state.target.detected.errors.length === 0);

  dom.runBtn.disabled = !(transferReady && targetReady);
  state.masterMode =
    transferReady &&
    targetReady &&
    Boolean(state.transfer.detected.master) &&
    Boolean(state.target.detected.master);

  if (!state.transfer || !state.target) {
    dom.modeInfo.textContent = "Parse both tables to enable matching.";
    return;
  }

  if (state.masterMode) {
    dom.modeInfo.textContent = "Master Matching Mode: ON (matching restricted by detected MasterCode group).";
  } else {
    dom.modeInfo.textContent = "Master Matching Mode: OFF (global matching because MasterCode is not detected in both tables).";
  }
}

export function renderResults({ state, dom }) {
  const rows = state.results;
  dom.copyBtn.disabled = rows.length === 0;
  dom.downloadCsvBtn.disabled = rows.length === 0;

  if (rows.length === 0) {
    dom.resultsContainer.innerHTML = `<div class="meta">No results yet.</div>`;
    dom.resultSummary.textContent = "";
    return;
  }

  const headers = [
    "SourceSku",
    "SourceAttributes1",
    "SourceAttributes2",
    "TargetSku",
    "TargetAttributes1",
    "TargetAttributes2"
  ];

  const headHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyHtml = rows
    .map((row) => {
      const cells = headers
        .map((header) => `<td>${escapeHtml(row[header] || "")}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  dom.resultsContainer.innerHTML = `<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
  dom.resultSummary.textContent = summarizeStatuses(rows);
}
