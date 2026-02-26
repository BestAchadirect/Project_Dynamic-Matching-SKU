import { normalizeValue } from "../../core/normalize.js";

function getBulkSourceCatalog(scopeState) {
  return scopeState.bulkSourceCatalog || scopeState.sourceCatalog || new Map();
}

function getBulkTargetCatalog(scopeState) {
  return scopeState.bulkTargetCatalog || scopeState.targetCatalog || new Map();
}

function getRuleSourceCatalog(scopeState) {
  return scopeState.sourceCatalog || new Map();
}

export function addSynonymRuleRow({
  scopeEl,
  initialValue = {},
  getScopeElement,
  updateScopeTableVisibility,
  updateSynonymGlobalSummary,
  refreshSynonymRuleRow,
  getScopeState
}) {
  const tbody = getScopeElement(scopeEl, "synonymTbody");
  if (!tbody) {
    return;
  }

  const row = document.createElement("tr");
  row.innerHTML = `
    <td><select class="synonym-select" data-field="attributeName"></select></td>
    <td><select class="synonym-select" data-field="sourcePattern"></select></td>
    <td><select class="synonym-select" data-field="targetAttributeName"></select></td>
    <td><select class="synonym-select" data-field="targetValue"></select></td>
    <td>
      <select class="synonym-select" data-field="matchType">
        <option value="EXACT">EXACT</option>
        <option value="CONTAINS">CONTAINS</option>
        <option value="REGEX">REGEX</option>
      </select>
    </td>
    <td>
      <button class="btn-icon" data-action="delete-synonym-row" type="button" title="Delete Rule">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    </td>
  `;
  tbody.appendChild(row);

  updateScopeTableVisibility(scopeEl);
  updateSynonymGlobalSummary();

  const matchTypeEl = row.querySelector("[data-field='matchType']");
  if (matchTypeEl) {
    const desired = String(initialValue.matchType || "EXACT").toUpperCase();
    matchTypeEl.value = ["EXACT", "CONTAINS", "REGEX"].includes(desired) ? desired : "EXACT";
  }

  refreshSynonymRuleRow(scopeEl, getScopeState(scopeEl), row, initialValue);
}

export function resetScopeSynonymTable({
  scopeEl,
  getScopeElement,
  updateScopeTableVisibility
}) {
  const tbody = getScopeElement(scopeEl, "synonymTbody");
  if (!tbody) {
    return;
  }
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  updateScopeTableVisibility(scopeEl);
}

export function rebuildScopeBulkControls({
  scopeEl,
  scopeState,
  getScopeElement,
  mapCatalogAttributesToOptions,
  updateSelectOptions,
  updateScopeBulkButtonState
}) {
  const sourceEl = getScopeElement(scopeEl, "bulkSourceAttr");
  const targetEl = getScopeElement(scopeEl, "bulkTargetAttr");
  if (!sourceEl || !targetEl) {
    return;
  }

  const addRuleBtn = scopeEl.querySelector("[data-action='add-rule-row']");
  const hasSourceAttributes = (scopeState.sourceCatalog?.size || 0) > 0;

  const sourceOptions = mapCatalogAttributesToOptions(getBulkSourceCatalog(scopeState));
  const targetOptions = mapCatalogAttributesToOptions(getBulkTargetCatalog(scopeState));
  sourceEl.disabled = !hasSourceAttributes || sourceOptions.length === 0;
  targetEl.disabled = !hasSourceAttributes || targetOptions.length === 0;
  if (addRuleBtn) {
    addRuleBtn.disabled = !hasSourceAttributes;
  }

  updateSelectOptions(sourceEl, sourceOptions, "Select Source Attr", sourceEl.value);
  updateSelectOptions(targetEl, targetOptions, "Select Target Attr", targetEl.value);
  updateScopeBulkButtonState(scopeEl, scopeState);
}

export function updateScopeBulkButtonState({
  scopeEl,
  scopeState,
  getScopeElement,
  getScopeAction
}) {
  const sourceEl = getScopeElement(scopeEl, "bulkSourceAttr");
  const targetEl = getScopeElement(scopeEl, "bulkTargetAttr");
  const bulkBtn = getScopeAction(scopeEl, "bulk-add-rules");
  if (!sourceEl || !targetEl || !bulkBtn) {
    return;
  }

  if ((scopeState.sourceCatalog?.size || 0) === 0) {
    bulkBtn.disabled = true;
    return;
  }

  const sourceAttr = String(sourceEl.value || "");
  const targetAttr = String(targetEl.value || "");
  bulkBtn.disabled = !(sourceAttr && targetAttr);
}

export function handleScopeBulkAddRules({
  scopeEl,
  scopeState,
  clearAlert,
  showAlert,
  getScopeElement,
  mapCatalogValuesToOptions,
  addSynonymRuleRow
}) {
  clearAlert();

  const sourceAttrEl = getScopeElement(scopeEl, "bulkSourceAttr");
  const targetAttrEl = getScopeElement(scopeEl, "bulkTargetAttr");
  if (!sourceAttrEl || !targetAttrEl) {
    return;
  }

  const sourceAttr = String(sourceAttrEl.value || "");
  const targetAttr = String(targetAttrEl.value || "");
  if (!sourceAttr || !targetAttr) {
    showAlert("Select both Bulk Source Attr and Bulk Target Attr before adding bulk rules.", "error");
    return;
  }

  const sourceOptions = mapCatalogValuesToOptions(getBulkSourceCatalog(scopeState), sourceAttr);
  if (sourceOptions.length === 0) {
    showAlert("No source options available for the selected bulk source attribute.", "error");
    return;
  }

  const targetValues = getBulkTargetCatalog(scopeState).get(targetAttr)?.values || new Map();
  let unresolved = 0;

  sourceOptions.forEach((option) => {
    const preferredTarget = targetValues.has(option.value) ? option.value : "";
    if (!preferredTarget) {
      unresolved += 1;
    }

    addSynonymRuleRow(scopeEl, {
      attributeName: sourceAttr,
      sourcePattern: option.value,
      targetAttributeName: targetAttr,
      targetValue: preferredTarget,
      matchType: "EXACT"
    });
  });

  if (unresolved > 0) {
    showAlert(`Added ${sourceOptions.length} bulk rules. ${unresolved} rows need Target Value selection.`, "warn");
  } else {
    showAlert(`Added ${sourceOptions.length} bulk rules for all source options.`, "success");
  }
}

export function refreshScopeRuleRows({
  scopeEl,
  scopeState,
  getScopeElement,
  refreshSynonymRuleRow
}) {
  const tbody = getScopeElement(scopeEl, "synonymTbody");
  if (!tbody) {
    return;
  }
  const rows = Array.from(tbody.querySelectorAll("tr"));
  rows.forEach((row) => refreshSynonymRuleRow(scopeEl, scopeState, row));
}

export function refreshSynonymRuleRow({
  scopeState,
  row,
  initialValue = null,
  mapCatalogAttributesToOptions,
  mapCatalogValuesToOptions,
  updateSelectOptions
}) {
  if (!scopeState || !row) {
    return;
  }

  const sourceAttrEl = row.querySelector("[data-field='attributeName']");
  const sourcePatternEl = row.querySelector("[data-field='sourcePattern']");
  const targetAttrEl = row.querySelector("[data-field='targetAttributeName']");
  const targetValueEl = row.querySelector("[data-field='targetValue']");
  if (!sourceAttrEl || !sourcePatternEl || !targetAttrEl || !targetValueEl) {
    return;
  }

  const sourceAttrValue = initialValue ? String(initialValue.attributeName || "") : sourceAttrEl.value;
  const sourcePatternValue = initialValue ? String(initialValue.sourcePattern || "") : sourcePatternEl.value;
  const targetAttrValue = initialValue ? String(initialValue.targetAttributeName || "") : targetAttrEl.value;
  const targetValueValue = initialValue ? String(initialValue.targetValue || "") : targetValueEl.value;

  const sourceCatalog = getRuleSourceCatalog(scopeState);
  const sourceAttributeOptions = mapCatalogAttributesToOptions(sourceCatalog);
  updateSelectOptions(sourceAttrEl, sourceAttributeOptions, "Select Attribute", normalizeValue(sourceAttrValue));
  const sourceValueOptions = mapCatalogValuesToOptions(sourceCatalog, sourceAttrEl.value);
  updateSelectOptions(sourcePatternEl, sourceValueOptions, "Select Source Pattern", normalizeValue(sourcePatternValue));

  const targetAttributeOptions = mapCatalogAttributesToOptions(scopeState.targetCatalog);
  updateSelectOptions(targetAttrEl, targetAttributeOptions, "Select Target Attribute", normalizeValue(targetAttrValue));
  const targetValueOptions = mapCatalogValuesToOptions(scopeState.targetCatalog, targetAttrEl.value);
  updateSelectOptions(targetValueEl, targetValueOptions, "Select Target Value", normalizeValue(targetValueValue));

  const hasSourceAttributes = sourceCatalog.size > 0;
  targetAttrEl.disabled = !hasSourceAttributes || targetAttributeOptions.length === 0;
  targetValueEl.disabled = !hasSourceAttributes || targetValueOptions.length === 0;
}

export function readInputValue(row, field) {
  const node = row.querySelector(`[data-field='${field}']`);
  if (!node) {
    return "";
  }
  return String(node.value || "").trim();
}
