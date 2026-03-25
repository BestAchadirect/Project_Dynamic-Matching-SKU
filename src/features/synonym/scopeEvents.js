import { normalizeFilterDataset } from "./scopeState.js";

let activeDragRow = null;

function getDragInsertRow(tbody, clientY) {
  const rows = Array.from(tbody.querySelectorAll("tr:not(.is-dragging)"));
  let closest = { offset: Number.NEGATIVE_INFINITY, element: null };

  rows.forEach((row) => {
    const rect = row.getBoundingClientRect();
    const offset = clientY - rect.top - rect.height / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, element: row };
    }
  });

  return closest.element;
}

export function handleSynonymScopesClick({
  event,
  state,
  getScopeState,
  updateSynonymGlobalSummary,
  addSynonymRuleRow,
  resetScopeSynonymTable,
  updateScopeTableVisibility,
  handleScopeBulkAddRules
}) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const scopeEl = target.closest(".synonym-scope");
  if (!scopeEl) {
    return;
  }

  const scopeState = getScopeState(scopeEl);
  if (!scopeState) {
    return;
  }

  const action = target.getAttribute("data-action");
  if (action === "remove-master-scope") {
    state.synonymContext.scopes.delete(scopeState.id);
    scopeEl.remove();
    updateSynonymGlobalSummary();
    return;
  }

  if (action === "toggle-scope" || target.closest("[data-action='toggle-scope']")) {
    const scopeHeader = target.closest("[data-action='toggle-scope']");
    if (scopeHeader) {
      scopeEl.classList.toggle("collapsed");
    }
    return;
  }

  if (action === "add-rule-row") {
    addSynonymRuleRow(scopeEl);
    return;
  }

  if (action === "clear-all-rules") {
    resetScopeSynonymTable(scopeEl);
    updateSynonymGlobalSummary();
    return;
  }

  if (action === "delete-synonym-row") {
    const row = target.closest("tr");
    if (!row) {
      return;
    }
    row.remove();
    updateScopeTableVisibility(scopeEl);
    updateSynonymGlobalSummary();
    return;
  }

  if (action === "bulk-add-rules") {
    handleScopeBulkAddRules(scopeEl, scopeState);
  }
}

export function handleSynonymScopesChange({
  event,
  getScopeState,
  refreshSynonymScope,
  readMultiSelectValues,
  updateScopeBulkButtonState,
  refreshSynonymRuleRow
}) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const scopeEl = target.closest(".synonym-scope");
  if (!scopeEl) {
    return;
  }

  const scopeState = getScopeState(scopeEl);
  if (!scopeState) {
    return;
  }

  const field = target.getAttribute("data-field");
  if (!field) {
    return;
  }

  if (field === "masterFilter") {
    scopeState.selectedMaster = String(target.value || "__ALL__");
    refreshSynonymScope(scopeEl, scopeState);
    return;
  }

  if (field === "targetMasterFilter") {
    scopeState.selectedTargetMaster = String(target.value || "");
    refreshSynonymScope(scopeEl, scopeState);
    return;
  }

  if (field === "filterDataset") {
    scopeState.selectedFilterDataset = normalizeFilterDataset(target.value || "target");
    scopeState.selectedFilterAttribute = "";
    scopeState.selectedFilterOptions = new Set();
    scopeState.selectedFilterAttribute2 = "";
    scopeState.selectedFilterOptions2 = new Set();
    refreshSynonymScope(scopeEl, scopeState);
    return;
  }

  if (field === "attributeFilter") {
    scopeState.selectedFilterAttribute = String(target.value || "");
    scopeState.selectedFilterOptions = new Set();
    refreshSynonymScope(scopeEl, scopeState);
    return;
  }

  if (field === "attributeFilter2") {
    scopeState.selectedFilterAttribute2 = String(target.value || "");
    scopeState.selectedFilterOptions2 = new Set();
    refreshSynonymScope(scopeEl, scopeState);
    return;
  }

  if (field === "optionFilter") {
    scopeState.selectedFilterOptions = readMultiSelectValues(target);
    refreshSynonymScope(scopeEl, scopeState);
    return;
  }

  if (field === "optionFilter2") {
    scopeState.selectedFilterOptions2 = readMultiSelectValues(target);
    refreshSynonymScope(scopeEl, scopeState);
    return;
  }

  if (field === "bulkSourceAttr" || field === "bulkTargetAttr") {
    updateScopeBulkButtonState(scopeEl, scopeState);
    return;
  }

  if (field === "attributeName" || field === "targetAttributeName") {
    const row = target.closest("tr");
    if (row) {
      refreshSynonymRuleRow(scopeEl, scopeState, row);
    }
  }
}

function parseTabularClipboard(text) {
  const raw = String(text || "").replace(/\r/g, "");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split("\t").map((cell) => String(cell || "").trim()));
}

function getNextRuleRow(currentRow) {
  if (!currentRow) {
    return null;
  }
  const next = currentRow.nextElementSibling;
  return next instanceof HTMLTableRowElement ? next : null;
}

export function handleSynonymScopesPaste({
  event,
  getScopeState,
  addSynonymRuleRow,
  refreshSynonymRuleRow,
  updateSynonymGlobalSummary
}) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const field = target.getAttribute("data-field");
  if (field !== "sourcePattern" && field !== "targetValue") {
    return;
  }

  const clipboardText = event.clipboardData?.getData("text/plain") || "";
  const parsedRows = parseTabularClipboard(clipboardText);
  const hasTableShape = parsedRows.length > 1 || parsedRows.some((cells) => cells.length > 1);
  if (!hasTableShape || parsedRows.length === 0) {
    return;
  }

  const scopeEl = target.closest(".synonym-scope");
  const startRow = target.closest("tr");
  if (!scopeEl || !(startRow instanceof HTMLTableRowElement)) {
    return;
  }

  const scopeState = getScopeState(scopeEl);
  if (!scopeState) {
    return;
  }

  event.preventDefault();

  const baseSourceAttr = String(startRow.querySelector("[data-field='attributeName']")?.value || "");
  const baseTargetAttr = String(startRow.querySelector("[data-field='targetAttributeName']")?.value || "");
  let row = startRow;

  parsedRows.forEach((cells, index) => {
    if (index > 0) {
      const nextRow = getNextRuleRow(row);
      row = nextRow || addSynonymRuleRow(scopeEl, {
        attributeName: baseSourceAttr,
        targetAttributeName: baseTargetAttr,
        matchType: "EXACT"
      });
    }

    if (!(row instanceof HTMLTableRowElement)) {
      return;
    }

    refreshSynonymRuleRow(scopeEl, scopeState, row);

    const sourcePatternEl = row.querySelector("[data-field='sourcePattern']");
    const targetValueEl = row.querySelector("[data-field='targetValue']");

    if (field === "sourcePattern") {
      if (sourcePatternEl instanceof HTMLInputElement) {
        sourcePatternEl.value = String(cells[0] || "");
      }
      if (cells.length > 1 && targetValueEl instanceof HTMLInputElement) {
        targetValueEl.value = String(cells[1] || "");
      }
      return;
    }

    if (cells.length > 1) {
      if (sourcePatternEl instanceof HTMLInputElement) {
        sourcePatternEl.value = String(cells[0] || "");
      }
      if (targetValueEl instanceof HTMLInputElement) {
        targetValueEl.value = String(cells[1] || "");
      }
      return;
    }

    if (targetValueEl instanceof HTMLInputElement) {
      targetValueEl.value = String(cells[0] || "");
    }
  });

  updateSynonymGlobalSummary();
}

export function handleSynonymScopesDragStart({ event }) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    event.preventDefault();
    return;
  }

  const row = target.closest("tr[draggable='true']");
  if (!row) {
    event.preventDefault();
    return;
  }

  activeDragRow = row;
  row.classList.add("is-dragging");
  const tbody = row.parentElement;
  if (tbody instanceof HTMLElement) {
    tbody.classList.add("is-dragging-active");
  }

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "");
  }
}

export function handleSynonymScopesDragOver({ event }) {
  if (!activeDragRow) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const scopeEl = target.closest(".synonym-scope");
  if (!scopeEl) {
    return;
  }

  const tbody = scopeEl.querySelector("[data-field='synonymTbody']");
  if (!(tbody instanceof HTMLElement) || activeDragRow.parentElement !== tbody) {
    return;
  }

  event.preventDefault();
  const insertBefore = getDragInsertRow(tbody, event.clientY);
  if (insertBefore) {
    tbody.insertBefore(activeDragRow, insertBefore);
  } else {
    tbody.appendChild(activeDragRow);
  }
}

export function handleSynonymScopesDrop({ event }) {
  if (!activeDragRow) {
    return;
  }
  event.preventDefault();
}

export function handleSynonymScopesDragEnd({
  updateSynonymGlobalSummary
}) {
  if (!activeDragRow) {
    return;
  }

  const draggedRow = activeDragRow;
  const tbody = draggedRow.parentElement;
  draggedRow.classList.remove("is-dragging");
  if (tbody instanceof HTMLElement) {
    tbody.classList.remove("is-dragging-active");
  }

  activeDragRow = null;
  updateSynonymGlobalSummary();
}
