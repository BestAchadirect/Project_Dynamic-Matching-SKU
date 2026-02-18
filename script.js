"use strict";

const GLOBAL_GROUP_KEY = "__GLOBAL__";
const PREVIEW_LIMIT = 10;
const STRICT_SYNONYM_MODE = false;

const state = {
  transfer: null,
  target: null,
  masterMode: false,
  results: [],
  synonymContext: createEmptySynonymContext()
};

const dom = {
  transferInput: document.getElementById("transferInput"),
  targetInput: document.getElementById("targetInput"),
  addMasterScopeBtn: document.getElementById("addMasterScopeBtn"),
  synonymScopesContainer: document.getElementById("synonymScopesContainer"),
  parseTransferBtn: document.getElementById("parseTransferBtn"),
  parseTargetBtn: document.getElementById("parseTargetBtn"),
  runBtn: document.getElementById("runBtn"),
  copyBtn: document.getElementById("copyBtn"),
  downloadCsvBtn: document.getElementById("downloadCsvBtn"),
  transferMeta: document.getElementById("transferMeta"),
  targetMeta: document.getElementById("targetMeta"),
  transferPreview: document.getElementById("transferPreview"),
  targetPreview: document.getElementById("targetPreview"),
  modeInfo: document.getElementById("modeInfo"),
  resultsContainer: document.getElementById("resultsContainer"),
  resultSummary: document.getElementById("resultSummary"),
  alertBox: document.getElementById("alertBox"),
  synonymSummaryBar: document.getElementById("synonymSummaryBar") // Added
};

attachEvents();
initializeSynonymTable();
updateRunAvailability();
renderResults();

function attachEvents() {
  dom.parseTransferBtn.addEventListener("click", () => parseDataset("transfer"));
  dom.parseTargetBtn.addEventListener("click", () => parseDataset("target"));
  dom.addMasterScopeBtn.addEventListener("click", () => addSynonymMasterScope());
  dom.synonymScopesContainer.addEventListener("click", handleSynonymScopesClick);
  dom.synonymScopesContainer.addEventListener("change", handleSynonymScopesChange);
  dom.runBtn.addEventListener("click", runMatching);
  dom.copyBtn.addEventListener("click", copyResultsAsTsv);
  dom.downloadCsvBtn.addEventListener("click", downloadResultsAsCsv);
}

function initializeSynonymTable() {
  addSynonymRuleRow();
  rebuildSynonymContext();
}

function handleSynonymRowActions(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (!target.matches("[data-action='delete-synonym-row']")) {
    return;
  }

  const row = target.closest("tr");
  if (!row) {
    return;
  }

  row.remove();
  if (dom.synonymTbody.children.length === 0) {
    addSynonymRuleRow();
  }
}

function handleSynonymRowChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const row = target.closest("tr");
  if (!row) {
    return;
  }

  const field = target.getAttribute("data-field");
  if (field === "attributeName" || field === "targetAttributeName") {
    refreshSynonymRuleRow(row);
  }
}

function handleSynonymMasterFilterChange() {
  state.synonymContext.selectedMaster = String(dom.synonymMasterFilter.value || "__ALL__");
  rebuildAttributeFilterControls();
  rebuildSynonymCatalogs();
  rebuildBulkAttributeControls();
  refreshAllSynonymRuleRows();
  updateSynonymScopeInfo();
}

function handleSynonymAttributeFilterChange() {
  const previousFilterAttribute = state.synonymContext.selectedFilterAttribute;
  state.synonymContext.selectedFilterAttribute = String(dom.synonymAttributeFilter.value || "");
  state.synonymContext.selectedFilterOptions = new Set();
  rebuildAttributeFilterControls();
  rebuildSynonymCatalogs();
  rebuildBulkAttributeControls();

  const switchedToAllAttributes =
    Boolean(previousFilterAttribute) && !state.synonymContext.selectedFilterAttribute;
  const isSpecificMasterSelected = (state.synonymContext.selectedMaster || "__ALL__") !== "__ALL__";

  if (switchedToAllAttributes && isSpecificMasterSelected) {
    resetSynonymTableToDefault();
  } else {
    refreshAllSynonymRuleRows();
  }
  updateSynonymScopeInfo();
}

function handleSynonymOptionFilterChange() {
  state.synonymContext.selectedFilterOptions = readMultiSelectValues(dom.synonymOptionFilter);
  rebuildSynonymCatalogs();
  rebuildBulkAttributeControls();
  refreshAllSynonymRuleRows();
  updateSynonymScopeInfo();
}

function handleBulkAddRules() {
  clearAlert();

  const sourceAttr = String(dom.bulkSourceAttribute.value || "");
  const targetAttr = String(dom.bulkTargetAttribute.value || "");
  if (!sourceAttr || !targetAttr) {
    showAlert("Select both Bulk Source Attr and Bulk Target Attr before adding bulk rules.", "error");
    return;
  }

  const sourceOptions = mapCatalogValuesToOptions(state.synonymContext.sourceCatalog, sourceAttr);
  if (sourceOptions.length === 0) {
    showAlert("No source options available for the selected bulk source attribute.", "error");
    return;
  }

  const targetValues = state.synonymContext.targetCatalog.get(targetAttr)?.values || new Map();
  let unresolved = 0;

  sourceOptions.forEach((option) => {
    const preferredTarget = targetValues.has(option.value) ? option.value : "";
    if (!preferredTarget) {
      unresolved += 1;
    }

    addSynonymRuleRow({
      attributeName: sourceAttr,
      sourcePattern: option.value,
      targetAttributeName: targetAttr,
      targetValue: preferredTarget,
      matchType: "EXACT"
    });
  });

  if (unresolved > 0) {
    showAlert(
      `Added ${sourceOptions.length} bulk rules. ${unresolved} rows need Target Value selection.`,
      "warn"
    );
  } else {
    showAlert(`Added ${sourceOptions.length} bulk rules for all visible options.`, "success");
  }
}

function addSynonymRuleRow(initialValue = {}) {
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
    <td><button class="synonym-action" data-action="delete-synonym-row" type="button">Delete</button></td>
  `;

  dom.synonymTbody.appendChild(row);
  const matchTypeEl = row.querySelector("[data-field='matchType']");
  if (matchTypeEl) {
    const desired = String(initialValue.matchType || "EXACT").toUpperCase();
    matchTypeEl.value = ["EXACT", "CONTAINS", "REGEX"].includes(desired) ? desired : "EXACT";
  }
  refreshSynonymRuleRow(row, initialValue);
}

function resetSynonymTableToDefault() {
  while (dom.synonymTbody.firstChild) {
    dom.synonymTbody.removeChild(dom.synonymTbody.firstChild);
  }
  addSynonymRuleRow();
}

function createEmptySynonymContext() {
  return {
    masterChoices: [],
    selectedMaster: "__ALL__",
    selectedFilterAttribute: "",
    selectedFilterOptions: new Set(),
    sourceCatalog: new Map(),
    targetCatalog: new Map()
  };
}

function rebuildSynonymContext() {
  const nextContext = createEmptySynonymContext();
  const prevContext = state.synonymContext || createEmptySynonymContext();
  nextContext.masterChoices = buildMasterChoices();
  nextContext.selectedMaster = prevContext.selectedMaster || "__ALL__";
  nextContext.selectedFilterAttribute = prevContext.selectedFilterAttribute || "";
  nextContext.selectedFilterOptions = new Set(prevContext.selectedFilterOptions || []);

  const choiceSet = new Set(nextContext.masterChoices.map((choice) => choice.value));
  if (state.masterMode && nextContext.selectedMaster !== "__ALL__" && !choiceSet.has(nextContext.selectedMaster)) {
    nextContext.selectedMaster = "__ALL__";
  }

  state.synonymContext = nextContext;
  renderSynonymMasterFilter();
  rebuildAttributeFilterControls();
  rebuildSynonymCatalogs();
  rebuildBulkAttributeControls();
  refreshAllSynonymRuleRows();
  updateSynonymScopeInfo();
}

function buildMasterChoices() {
  const hasTransferMaster = Boolean(state.transfer && state.transfer.detected.master);
  const hasTargetMaster = Boolean(state.target && state.target.detected.master);
  if (!hasTransferMaster && !hasTargetMaster) {
    return [];
  }

  const seen = new Map();

  if (hasTransferMaster) {
    state.transfer.rows.forEach((row) => {
      const sourceRaw = readCell(row, state.transfer.detected.master);
      const sourceNorm = normalizeValue(sourceRaw);
      if (!sourceNorm) {
        return;
      }

      if (!seen.has(sourceNorm)) {
        seen.set(sourceNorm, sourceRaw);
      }
    });
  }

  if (hasTargetMaster) {
    state.target.rows.forEach((row) => {
      const targetRaw = readCell(row, state.target.detected.master);
      const targetNorm = normalizeValue(targetRaw);
      if (!targetNorm || seen.has(targetNorm)) {
        return;
      }
      seen.set(targetNorm, targetRaw);
    });
  }

  return Array.from(seen.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function renderSynonymMasterFilter() {
  const selectEl = dom.synonymMasterFilter;
  const options = [{ value: "__ALL__", label: "All Masters" }];

  if (state.masterMode) {
    options.push(...state.synonymContext.masterChoices);
    selectEl.disabled = false;
  } else {
    selectEl.disabled = true;
  }

  updateSelectOptions(selectEl, options, null, state.synonymContext.selectedMaster);
  if (!selectEl.value) {
    selectEl.value = "__ALL__";
    state.synonymContext.selectedMaster = "__ALL__";
  } else {
    state.synonymContext.selectedMaster = selectEl.value;
  }
}

function refreshAllSynonymRuleRows() {
  const rows = Array.from(dom.synonymTbody.querySelectorAll("tr"));
  rows.forEach((row) => refreshSynonymRuleRow(row));
}

function refreshSynonymRuleRow(row, initialValue = null) {
  const sourceCatalog = getSynonymCatalogForRole("source");
  const targetCatalog = getSynonymCatalogForRole("target");

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

  const sourceAttributeOptions = mapCatalogAttributesToOptions(sourceCatalog);
  updateSelectOptions(sourceAttrEl, sourceAttributeOptions, "Select Attribute", normalizeValue(sourceAttrValue));

  const sourceValueOptions = mapCatalogValuesToOptions(sourceCatalog, sourceAttrEl.value);
  updateSelectOptions(sourcePatternEl, sourceValueOptions, "Select Source Pattern", normalizeValue(sourcePatternValue));

  const targetAttributeOptions = mapCatalogAttributesToOptions(targetCatalog);
  updateSelectOptions(targetAttrEl, targetAttributeOptions, "Select Target Attribute", normalizeValue(targetAttrValue));

  const targetValueOptions = mapCatalogValuesToOptions(targetCatalog, targetAttrEl.value);
  updateSelectOptions(targetValueEl, targetValueOptions, "Select Target Value", normalizeValue(targetValueValue));
}

function getSynonymCatalogForRole(role) {
  return role === "source" ? state.synonymContext.sourceCatalog : state.synonymContext.targetCatalog;
}

function mapCatalogAttributesToOptions(catalog) {
  return Array.from(catalog.entries())
    .map(([attrNorm, data]) => ({
      value: attrNorm,
      label: data.label || attrNorm
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function mapCatalogValuesToOptions(catalog, attrNorm) {
  if (!attrNorm || !catalog.has(attrNorm)) {
    return [];
  }

  const values = catalog.get(attrNorm).values;
  return Array.from(values.entries())
    .map(([valueNorm, rawValue]) => ({
      value: valueNorm,
      label: rawValue || valueNorm
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function readMultiSelectValues(selectEl) {
  const values = new Set();
  Array.from(selectEl.selectedOptions).forEach((option) => {
    const value = String(option.value || "");
    if (value) {
      values.add(value);
    }
  });
  return values;
}

function updateSelectOptions(selectEl, options, placeholder, preferredValue) {
  const normalizedPreferred = preferredValue == null ? "" : String(preferredValue).trim();
  const normalizedOptions = options || [];

  while (selectEl.firstChild) {
    selectEl.removeChild(selectEl.firstChild);
  }

  if (placeholder) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = placeholder;
    selectEl.appendChild(emptyOption);
  }

  normalizedOptions.forEach((option) => {
    const optionEl = document.createElement("option");
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    selectEl.appendChild(optionEl);
  });

  const optionValues = new Set(normalizedOptions.map((option) => option.value));
  if (normalizedPreferred && optionValues.has(normalizedPreferred)) {
    selectEl.value = normalizedPreferred;
    return;
  }

  if (placeholder) {
    selectEl.value = "";
    return;
  }

  if (normalizedOptions.length > 0) {
    selectEl.value = normalizedOptions[0].value;
  } else {
    selectEl.value = "";
  }
}

function updateMultiSelectOptions(selectEl, options, preferredValues) {
  const preferred = preferredValues || new Set();
  while (selectEl.firstChild) {
    selectEl.removeChild(selectEl.firstChild);
  }

  options.forEach((option) => {
    const optionEl = document.createElement("option");
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    if (preferred.has(option.value)) {
      optionEl.selected = true;
    }
    selectEl.appendChild(optionEl);
  });
}

function rebuildAttributeFilterControls() {
  const sourceCatalogForFilter = buildCatalogForRole("source", { applyAttributeFilter: false });
  const attributeOptions = mapCatalogAttributesToOptions(sourceCatalogForFilter);
  dom.synonymAttributeFilter.disabled = attributeOptions.length === 0;

  updateSelectOptions(
    dom.synonymAttributeFilter,
    attributeOptions,
    "All Attributes",
    state.synonymContext.selectedFilterAttribute
  );

  state.synonymContext.selectedFilterAttribute = String(dom.synonymAttributeFilter.value || "");
  const optionChoices = mapCatalogValuesToOptions(sourceCatalogForFilter, state.synonymContext.selectedFilterAttribute);
  const preferredOptionSet = new Set(state.synonymContext.selectedFilterOptions || []);
  updateMultiSelectOptions(dom.synonymOptionFilter, optionChoices, preferredOptionSet);
  state.synonymContext.selectedFilterOptions = readMultiSelectValues(dom.synonymOptionFilter);
  dom.synonymOptionFilter.disabled = !state.synonymContext.selectedFilterAttribute || optionChoices.length === 0;
}

function rebuildSynonymCatalogs() {
  state.synonymContext.sourceCatalog = buildCatalogForRole("source", { applyAttributeFilter: true });
  state.synonymContext.targetCatalog = buildCatalogForRole("target", { applyAttributeFilter: true });
}

function rebuildBulkAttributeControls() {
  const sourceOptions = mapCatalogAttributesToOptions(state.synonymContext.sourceCatalog);
  const targetOptions = mapCatalogAttributesToOptions(state.synonymContext.targetCatalog);
  dom.bulkSourceAttribute.disabled = sourceOptions.length === 0;
  dom.bulkTargetAttribute.disabled = targetOptions.length === 0;

  updateSelectOptions(dom.bulkSourceAttribute, sourceOptions, "Select Source Attr", dom.bulkSourceAttribute.value);
  updateSelectOptions(dom.bulkTargetAttribute, targetOptions, "Select Target Attr", dom.bulkTargetAttribute.value);
  updateBulkButtonState();
}

function updateBulkButtonState() {
  const sourceAttr = String(dom.bulkSourceAttribute.value || "");
  const targetAttr = String(dom.bulkTargetAttribute.value || "");
  const hasSourceValues = sourceAttr
    ? mapCatalogValuesToOptions(state.synonymContext.sourceCatalog, sourceAttr).length > 0
    : false;

  dom.bulkAddRulesBtn.disabled = !(sourceAttr && targetAttr && hasSourceValues);
}

function buildCatalogForRole(role, options = {}) {
  const catalog = new Map();
  if (!state.transfer || !state.target) {
    return catalog;
  }

  const applyAttributeFilter = options.applyAttributeFilter !== false;
  const dataset = role === "source" ? state.transfer : state.target;
  const datasetRole = role === "source" ? "transfer" : "target";
  const selectedMaster = state.synonymContext.selectedMaster || "__ALL__";
  const filterAttrNorm = applyAttributeFilter ? state.synonymContext.selectedFilterAttribute : "";
  const filterOptionSet = applyAttributeFilter ? state.synonymContext.selectedFilterOptions : new Set();

  dataset.rows.forEach((row) => {
    const groupKey = resolveSynonymGroupKey(dataset, row);
    if (!groupKey) {
      return;
    }

    if (state.masterMode && selectedMaster !== "__ALL__" && groupKey !== selectedMaster) {
      return;
    }

    const pair1 = extractPair(row, dataset.detected.attr1, dataset.detected.opt1);
    const pair2 = extractPair(row, dataset.detected.attr2, dataset.detected.opt2);
    const pairs = [pair1, pair2].filter((pair) => pair.complete);

    if (!rowPassesAttributeFilter(pairs, filterAttrNorm, filterOptionSet)) {
      return;
    }

    pairs.forEach((pair) => {
      addPairToCatalog(catalog, pair.attrNorm, pair.attrRaw, pair.optNorm, pair.optRaw);
    });
  });

  return catalog;
}

function resolveSynonymGroupKey(dataset, row) {
  if (!state.masterMode) {
    return GLOBAL_GROUP_KEY;
  }

  const masterHeader = dataset.detected.master;
  const masterRaw = readCell(row, masterHeader);
  const masterNorm = normalizeValue(masterRaw);
  if (!masterNorm) {
    return null;
  }

  return masterNorm;
}

function rowPassesAttributeFilter(pairs, filterAttrNorm, filterOptionSet) {
  if (!filterAttrNorm) {
    return true;
  }

  const pair = pairs.find((item) => item.attrNorm === filterAttrNorm);
  if (!pair) {
    return false;
  }

  if (!filterOptionSet || filterOptionSet.size === 0) {
    return true;
  }

  return filterOptionSet.has(pair.optNorm);
}

function addPairToCatalog(catalog, attrNorm, attrRaw, valueNorm, valueRaw) {
  if (!attrNorm || !valueNorm) {
    return;
  }

  if (!catalog.has(attrNorm)) {
    catalog.set(attrNorm, {
      label: attrRaw || attrNorm,
      values: new Map()
    });
  }

  const attrData = catalog.get(attrNorm);
  if (!attrData.label && attrRaw) {
    attrData.label = attrRaw;
  }

  if (!attrData.values.has(valueNorm)) {
    attrData.values.set(valueNorm, valueRaw || valueNorm);
  }
}

function updateSynonymScopeInfo() {
  if (!state.transfer || !state.target) {
    dom.synonymScopeInfo.textContent = "Parse both tables to load selectable synonym values.";
    return;
  }

  const selectedMaster = state.synonymContext.selectedMaster || "__ALL__";
  const selectedAttribute = state.synonymContext.selectedFilterAttribute || "";
  const optionCount = state.synonymContext.selectedFilterOptions.size;
  const filterText = selectedAttribute
    ? ` | Attribute filter: ${selectedAttribute}${optionCount > 0 ? ` (${optionCount} option selected)` : " (all options)"}`
    : "";

  if (!state.masterMode) {
    dom.synonymScopeInfo.textContent = `MasterCode filter disabled (MasterCode missing in one table).${filterText}`;
    return;
  }

  if (selectedMaster === "__ALL__") {
    dom.synonymScopeInfo.textContent = `Showing synonym values from all master groups${filterText}.`;
    return;
  }

  const choice = state.synonymContext.masterChoices.find((item) => item.value === selectedMaster);
  dom.synonymScopeInfo.textContent = choice
    ? `Showing synonym values for MasterCode: ${choice.label}${filterText}.`
    : `Showing synonym values for selected master${filterText}.`;
}

// Synonym scopes override: master-filter controls and tables are managed per scope card.
function createEmptySynonymContext() {
  return {
    masterChoices: [],
    scopes: new Map(),
    nextScopeId: 1,
    autoMasterScopesApplied: false
  };
}

function initializeSynonymTable() {
  if (dom.synonymScopesContainer.children.length === 0) {
    addSynonymMasterScope();
  }
  rebuildSynonymContext();
}

function addSynonymMasterScope(initialScope = {}) {
  const ctx = state.synonymContext;
  const scopeId = `scope_${ctx.nextScopeId}`;
  ctx.nextScopeId += 1;

  const scopeState = {
    id: scopeId,
    selectedMaster: String(initialScope.selectedMaster || "__ALL__"),
    selectedFilterAttribute: String(initialScope.selectedFilterAttribute || ""),
    selectedFilterOptions: new Set(initialScope.selectedFilterOptions || []),
    sourceCatalog: new Map(),
    targetCatalog: new Map()
  };
  ctx.scopes.set(scopeId, scopeState);

  const scopeEl = createSynonymScopeElement(scopeId);
  dom.synonymScopesContainer.appendChild(scopeEl);
  refreshSynonymScope(scopeEl, scopeState);
  if (ctx.scopes.size === 1) {
    scopeEl.classList.remove("collapsed");
  }
  updateSynonymGlobalSummary();
}

function createSynonymScopeElement(scopeId) {
  const el = document.createElement("section");
  el.className = "synonym-scope card collapsed"; // Start collapsed
  el.dataset.scopeId = scopeId;
  el.innerHTML = `
    <div class="card-head" data-action="toggle-scope">
      <h3>Master Code: <span data-field="scopeHeaderInfo">All Masters</span></h3>
      <div class="action-row">
        <button class="btn btn-secondary btn-sm" data-action="remove-master-scope" type="button">Remove Scope</button>
      </div>
    </div>
    <div class="synonym-scope-content">
      <div class="synonym-filter-grid">
        <div class="filter-group">
          <label>MasterCode Filter</label>
          <select class="synonym-filter-select" data-field="masterFilter"></select>
        </div>
        <div class="filter-group">
          <label>Attribute Filter</label>
          <select class="synonym-filter-select" data-field="attributeFilter"></select>
        </div>
        <div class="filter-group">
          <label>Options (Multi-select)</label>
          <select class="synonym-filter-select" data-field="optionFilter" multiple size="4"></select>
        </div>
      </div>
      
      <div class="synonym-action-bar">
        <div class="meta" data-field="scopeInfo"></div>
        <div style="flex-grow: 1;"></div>
        <div class="filter-group" style="min-width: 150px;">
          <select class="synonym-filter-select" data-field="bulkSourceAttr"></select>
        </div>
        <div class="filter-group" style="min-width: 150px;">
          <select class="synonym-filter-select" data-field="bulkTargetAttr"></select>
        </div>
        <button class="btn btn-secondary" data-action="bulk-add-rules" type="button">Bulk Add</button>
        <button class="btn btn-primary" data-action="add-rule-row" type="button">Add Rule</button>
      </div>

      <div class="synonym-table-wrap empty">
        <table class="synonym-table">
          <thead>
            <tr>
              <th>Source Attribute</th>
              <th>Source Pattern</th>
              <th>Target Attribute</th>
              <th>Target Value</th>
              <th>Match Type</th>
              <th style="width: 50px;"></th>
            </tr>
          </thead>
          <tbody data-field="synonymTbody"></tbody>
        </table>
      </div>
    </div>
  `;
  return el;
}

function handleSynonymScopesClick(event) {
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

  if (action === "delete-synonym-row") {
    const row = target.closest("tr");
    if (!row) {
      return;
    }
    row.remove();
    updateScopeTableVisibility(scopeEl);
    updateSynonymGlobalSummary(); // Added
    return;
  }

  if (action === "bulk-add-rules") {
    handleScopeBulkAddRules(scopeEl, scopeState);
  }
}

function handleSynonymScopesChange(event) {
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

  if (field === "attributeFilter") {
    const previous = scopeState.selectedFilterAttribute;
    scopeState.selectedFilterAttribute = String(target.value || "");
    scopeState.selectedFilterOptions = new Set();
    refreshSynonymScope(scopeEl, scopeState);

    const switchedToAllAttributes = Boolean(previous) && !scopeState.selectedFilterAttribute;
    const isSpecificMaster = (scopeState.selectedMaster || "__ALL__") !== "__ALL__";
    if (switchedToAllAttributes && isSpecificMaster) {
      resetScopeSynonymTable(scopeEl);
    }
    return;
  }

  if (field === "optionFilter") {
    scopeState.selectedFilterOptions = readMultiSelectValues(target);
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

function rebuildSynonymContext() {
  const ctx = state.synonymContext;
  ctx.masterChoices = buildMasterChoices();

  const validMasters = new Set(ctx.masterChoices.map((choice) => choice.value));
  ctx.scopes.forEach((scopeState) => {
    if (state.masterMode && scopeState.selectedMaster !== "__ALL__" && !validMasters.has(scopeState.selectedMaster)) {
      scopeState.selectedMaster = "__ALL__";
    }
  });

  if (ctx.scopes.size === 0) {
    addSynonymMasterScope();
  }

  ensureTransferMasterScopes();
  refreshAllSynonymScopes();
}

function ensureTransferMasterScopes() {
  const ctx = state.synonymContext;
  if (ctx.autoMasterScopesApplied) {
    return;
  }
  if (!state.transfer || !state.transfer.detected.master) {
    return;
  }

  const transferMasterValues = collectTransferMasterValues();
  if (transferMasterValues.length === 0) {
    return;
  }

  const scopeEls = Array.from(dom.synonymScopesContainer.querySelectorAll(".synonym-scope"));
  const existingSpecificMasters = new Set();

  scopeEls.forEach((scopeEl) => {
    const scopeState = getScopeState(scopeEl);
    if (!scopeState) {
      return;
    }
    const selectedMaster = String(scopeState.selectedMaster || "__ALL__");
    if (selectedMaster !== "__ALL__") {
      existingSpecificMasters.add(selectedMaster);
    }
  });

  // Replace the initial empty "All Masters" scope with detected transfer masters.
  if (scopeEls.length === 1) {
    const onlyScopeEl = scopeEls[0];
    const onlyScopeState = getScopeState(onlyScopeEl);
    const isOnlyAllMasters = onlyScopeState && String(onlyScopeState.selectedMaster || "__ALL__") === "__ALL__";
    if (isOnlyAllMasters && !scopeHasConfiguredRules(onlyScopeEl)) {
      ctx.scopes.delete(onlyScopeState.id);
      onlyScopeEl.remove();
    }
  }

  transferMasterValues.forEach((masterValue) => {
    if (existingSpecificMasters.has(masterValue)) {
      return;
    }
    addSynonymMasterScope({ selectedMaster: masterValue });
    existingSpecificMasters.add(masterValue);
  });

  ctx.autoMasterScopesApplied = true;
}

function collectTransferMasterValues() {
  if (!state.transfer || !state.transfer.detected.master) {
    return [];
  }

  const values = [];
  const seen = new Set();
  state.transfer.rows.forEach((row) => {
    const sourceMasterNorm = normalizeValue(readCell(row, state.transfer.detected.master));
    if (!sourceMasterNorm || seen.has(sourceMasterNorm)) {
      return;
    }
    seen.add(sourceMasterNorm);
    values.push(sourceMasterNorm);
  });

  return values;
}

function scopeHasConfiguredRules(scopeEl) {
  const tbody = getScopeElement(scopeEl, "synonymTbody");
  if (!tbody) {
    return false;
  }

  const rows = Array.from(tbody.querySelectorAll("tr"));
  return rows.some((row) => {
    const attributeName = readInputValue(row, "attributeName");
    const sourcePattern = readInputValue(row, "sourcePattern");
    const targetAttributeName = readInputValue(row, "targetAttributeName");
    const targetValue = readInputValue(row, "targetValue");
    return Boolean(attributeName || sourcePattern || targetAttributeName || targetValue);
  });
}

function refreshAllSynonymScopes() {
  const scopes = Array.from(dom.synonymScopesContainer.querySelectorAll(".synonym-scope"));
  scopes.forEach((scopeEl) => {
    const scopeState = getScopeState(scopeEl);
    if (scopeState) {
      refreshSynonymScope(scopeEl, scopeState);
    }
  });
}

function refreshSynonymScope(scopeEl, scopeState) {
  renderScopeMasterFilter(scopeEl, scopeState);
  rebuildScopeAttributeFilterControls(scopeEl, scopeState);
  rebuildScopeCatalogs(scopeState);
  rebuildScopeBulkControls(scopeEl, scopeState);
  refreshScopeRuleRows(scopeEl, scopeState);
  updateScopeTableVisibility(scopeEl);
  updateScopeInfo(scopeEl, scopeState);
}

function addSynonymRuleRow(scopeEl, initialValue = {}) {
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
  updateSynonymGlobalSummary(); // Added

  const matchTypeEl = row.querySelector("[data-field='matchType']");
  if (matchTypeEl) {
    const desired = String(initialValue.matchType || "EXACT").toUpperCase();
    matchTypeEl.value = ["EXACT", "CONTAINS", "REGEX"].includes(desired) ? desired : "EXACT";
  }

  refreshSynonymRuleRow(scopeEl, getScopeState(scopeEl), row, initialValue);
}

function resetScopeSynonymTable(scopeEl) {
  const tbody = getScopeElement(scopeEl, "synonymTbody");
  if (!tbody) {
    return;
  }
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  updateScopeTableVisibility(scopeEl);
}

function updateScopeTableVisibility(scopeEl) {
  const tableWrap = scopeEl.querySelector(".synonym-table-wrap");
  const tbody = getScopeElement(scopeEl, "synonymTbody");
  if (!tableWrap || !tbody) {
    return;
  }
  tableWrap.classList.toggle("empty", tbody.children.length === 0);
}

function getScopeState(scopeEl) {
  const scopeId = String(scopeEl?.dataset?.scopeId || "");
  return state.synonymContext.scopes.get(scopeId) || null;
}

function getScopeElement(scopeEl, field) {
  return scopeEl.querySelector(`[data-field='${field}']`);
}

function getScopeAction(scopeEl, action) {
  return scopeEl.querySelector(`[data-action='${action}']`);
}

function renderScopeMasterFilter(scopeEl, scopeState) {
  const selectEl = getScopeElement(scopeEl, "masterFilter");
  if (!selectEl) {
    return;
  }

  const options = [{ value: "__ALL__", label: "All Masters" }];
  const hasMasterChoices = state.synonymContext.masterChoices.length > 0;
  const allowMasterSelection = state.masterMode || !state.target;
  if (hasMasterChoices && allowMasterSelection) {
    options.push(...state.synonymContext.masterChoices);
    selectEl.disabled = false;
  } else {
    selectEl.disabled = true;
  }

  updateSelectOptions(selectEl, options, null, scopeState.selectedMaster);
  scopeState.selectedMaster = String(selectEl.value || "__ALL__");
}

function rebuildScopeAttributeFilterControls(scopeEl, scopeState) {
  const attributeEl = getScopeElement(scopeEl, "attributeFilter");
  const optionEl = getScopeElement(scopeEl, "optionFilter");
  if (!attributeEl || !optionEl) {
    return;
  }

  const sourceCatalogForFilter = buildCatalogForScope(scopeState, "source", { applyAttributeFilter: false });
  const attributeOptions = mapCatalogAttributesToOptions(sourceCatalogForFilter);
  attributeEl.disabled = attributeOptions.length === 0;

  updateSelectOptions(attributeEl, attributeOptions, "All Attributes", scopeState.selectedFilterAttribute);
  scopeState.selectedFilterAttribute = String(attributeEl.value || "");

  const optionChoices = mapCatalogValuesToOptions(sourceCatalogForFilter, scopeState.selectedFilterAttribute);
  updateMultiSelectOptions(optionEl, optionChoices, scopeState.selectedFilterOptions);
  scopeState.selectedFilterOptions = readMultiSelectValues(optionEl);
  optionEl.disabled = !scopeState.selectedFilterAttribute || optionChoices.length === 0;
}

function rebuildScopeCatalogs(scopeState) {
  scopeState.sourceCatalog = buildCatalogForScope(scopeState, "source", { applyAttributeFilter: true });
  scopeState.targetCatalog = buildCatalogForScope(scopeState, "target", { applyAttributeFilter: true });
}

function rebuildScopeBulkControls(scopeEl, scopeState) {
  const sourceEl = getScopeElement(scopeEl, "bulkSourceAttr");
  const targetEl = getScopeElement(scopeEl, "bulkTargetAttr");
  if (!sourceEl || !targetEl) {
    return;
  }

  const sourceOptions = mapCatalogAttributesToOptions(scopeState.sourceCatalog);
  const targetOptions = mapCatalogAttributesToOptions(scopeState.targetCatalog);
  sourceEl.disabled = sourceOptions.length === 0;
  targetEl.disabled = targetOptions.length === 0;

  updateSelectOptions(sourceEl, sourceOptions, "Select Source Attr", sourceEl.value);
  updateSelectOptions(targetEl, targetOptions, "Select Target Attr", targetEl.value);
  updateScopeBulkButtonState(scopeEl, scopeState);
}

function updateScopeBulkButtonState(scopeEl, scopeState) {
  const sourceEl = getScopeElement(scopeEl, "bulkSourceAttr");
  const targetEl = getScopeElement(scopeEl, "bulkTargetAttr");
  const bulkBtn = getScopeAction(scopeEl, "bulk-add-rules");
  if (!sourceEl || !targetEl || !bulkBtn) {
    return;
  }

  const sourceAttr = String(sourceEl.value || "");
  const targetAttr = String(targetEl.value || "");
  const hasSourceValues = sourceAttr
    ? mapCatalogValuesToOptions(scopeState.sourceCatalog, sourceAttr).length > 0
    : false;

  bulkBtn.disabled = !(sourceAttr && targetAttr && hasSourceValues);
}

function handleScopeBulkAddRules(scopeEl, scopeState) {
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

  const sourceOptions = mapCatalogValuesToOptions(scopeState.sourceCatalog, sourceAttr);
  if (sourceOptions.length === 0) {
    showAlert("No source options available for the selected bulk source attribute.", "error");
    return;
  }

  const targetValues = scopeState.targetCatalog.get(targetAttr)?.values || new Map();
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
    showAlert(`Added ${sourceOptions.length} bulk rules for all visible options.`, "success");
  }
}

function refreshScopeRuleRows(scopeEl, scopeState) {
  const tbody = getScopeElement(scopeEl, "synonymTbody");
  if (!tbody) {
    return;
  }
  const rows = Array.from(tbody.querySelectorAll("tr"));
  rows.forEach((row) => refreshSynonymRuleRow(scopeEl, scopeState, row));
}

function refreshSynonymRuleRow(scopeEl, scopeState, row, initialValue = null) {
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

  const sourceAttributeOptions = mapCatalogAttributesToOptions(scopeState.sourceCatalog);
  updateSelectOptions(sourceAttrEl, sourceAttributeOptions, "Select Attribute", normalizeValue(sourceAttrValue));
  const sourceValueOptions = mapCatalogValuesToOptions(scopeState.sourceCatalog, sourceAttrEl.value);
  updateSelectOptions(sourcePatternEl, sourceValueOptions, "Select Source Pattern", normalizeValue(sourcePatternValue));

  const targetAttributeOptions = mapCatalogAttributesToOptions(scopeState.targetCatalog);
  updateSelectOptions(targetAttrEl, targetAttributeOptions, "Select Target Attribute", normalizeValue(targetAttrValue));
  const targetValueOptions = mapCatalogValuesToOptions(scopeState.targetCatalog, targetAttrEl.value);
  updateSelectOptions(targetValueEl, targetValueOptions, "Select Target Value", normalizeValue(targetValueValue));
}

function buildCatalogForScope(scopeState, role, options = {}) {
  const catalog = new Map();
  if (!state.transfer || !state.target) {
    return catalog;
  }

  const dataset = role === "source" ? state.transfer : state.target;
  const datasetRole = role === "source" ? "transfer" : "target";
  const applyAttributeFilter = options.applyAttributeFilter !== false;
  const selectedMaster = scopeState.selectedMaster || "__ALL__";
  const filterAttrNorm = applyAttributeFilter ? scopeState.selectedFilterAttribute : "";
  const filterOptionSet = applyAttributeFilter ? scopeState.selectedFilterOptions : new Set();

  dataset.rows.forEach((row) => {
    const groupKey = resolveSynonymGroupKey(dataset, row);
    if (!groupKey) {
      return;
    }

    if (state.masterMode && selectedMaster !== "__ALL__" && groupKey !== selectedMaster) {
      return;
    }

    const pair1 = extractPair(row, dataset.detected.attr1, dataset.detected.opt1);
    const pair2 = extractPair(row, dataset.detected.attr2, dataset.detected.opt2);
    const pairs = [pair1, pair2].filter((pair) => pair.complete);

    if (!rowPassesAttributeFilter(pairs, filterAttrNorm, filterOptionSet)) {
      return;
    }

    pairs.forEach((pair) => {
      addPairToCatalog(catalog, pair.attrNorm, pair.attrRaw, pair.optNorm, pair.optRaw);
    });
  });

  return catalog;
}

function rowPassesAttributeFilter(pairs, filterAttrNorm, filterOptionSet) {
  if (!filterAttrNorm) {
    return true;
  }

  const pair = pairs.find((item) => item.attrNorm === filterAttrNorm);
  if (!pair) {
    return false;
  }

  if (!filterOptionSet || filterOptionSet.size === 0) {
    return true;
  }
  return filterOptionSet.has(pair.optNorm);
}

function addPairToCatalog(catalog, attrNorm, attrRaw, valueNorm, valueRaw) {
  if (!attrNorm || !valueNorm) {
    return;
  }

  if (!catalog.has(attrNorm)) {
    catalog.set(attrNorm, {
      label: attrRaw || attrNorm,
      values: new Map()
    });
  }

  const attrData = catalog.get(attrNorm);
  if (!attrData.label && attrRaw) {
    attrData.label = attrRaw;
  }

  if (!attrData.values.has(valueNorm)) {
    attrData.values.set(valueNorm, valueRaw || valueNorm);
  }
}

function updateScopeInfo(scopeEl, scopeState) {
  const infoEl = getScopeElement(scopeEl, "scopeInfo");
  const headerInfoEl = getScopeElement(scopeEl, "scopeHeaderInfo");
  const selectedMaster = scopeState.selectedMaster || "__ALL__";
  const masterLabel = getScopeMasterLabel(scopeState);

  if (headerInfoEl) {
    headerInfoEl.textContent = masterLabel;
  }

  if (!infoEl) {
    return;
  }

  if (!state.transfer || !state.target) {
    infoEl.textContent = "Parse both tables to load selectable values.";
    return;
  }

  const selectedAttribute = scopeState.selectedFilterAttribute || "";
  const optionCount = scopeState.selectedFilterOptions.size;
  const filterText = selectedAttribute
    ? ` | Attribute filter: ${selectedAttribute}${optionCount > 0 ? ` (${optionCount} selected)` : " (all options)"}`
    : "";

  if (!state.masterMode) {
    infoEl.textContent = `MasterCode filter disabled.${filterText}`;
    return;
  }

  if (selectedMaster === "__ALL__") {
    infoEl.textContent = `All master groups${filterText}.`;
    return;
  }

  const choice = state.synonymContext.masterChoices.find((item) => item.value === selectedMaster);
  const infoText = choice
    ? `MasterCode: ${choice.label}${filterText}.`
    : `MasterCode: ${selectedMaster}${filterText}.`;

  infoEl.textContent = infoText;
}

function updateSynonymGlobalSummary() {
  const bar = dom.synonymSummaryBar;
  if (!bar) return;

  const scopes = state.synonymContext.scopes;
  let totalRules = 0;

  const scopeEls = Array.from(dom.synonymScopesContainer.querySelectorAll(".synonym-scope"));
  scopeEls.forEach((el) => {
    const tbody = el.querySelector("[data-field='synonymTbody']");
    if (tbody) {
      const rows = Array.from(tbody.querySelectorAll("tr"));
      rows.forEach((row) => {
        const attr = row.querySelector("[data-field='attributeName']")?.value;
        if (attr) {
          totalRules += 1;
        }
      });
    }
  });

  if (scopes.size === 0 && totalRules === 0) {
    bar.classList.add("hidden");
    return;
  }

  bar.classList.remove("hidden");
  bar.innerHTML = `
    <div class="summary-item"><strong>Scopes:</strong> ${scopes.size}</div>
    <div class="summary-item"><strong>Total Rules:</strong> ${totalRules}</div>
  `;
}

function getScopeMasterLabel(scopeState) {
  const selectedMaster = scopeState.selectedMaster || "__ALL__";
  if (selectedMaster === "__ALL__") {
    return "All Masters";
  }

  const choice = state.synonymContext.masterChoices.find((item) => item.value === selectedMaster);
  return choice ? choice.label : selectedMaster;
}

function parseDataset(kind) {
  clearAlert();
  const isTransfer = kind === "transfer";
  const input = isTransfer ? dom.transferInput.value : dom.targetInput.value;

  try {
    const parsed = parseTsv(input);
    const detected = detectColumns(parsed.headers);
    state[kind] = { ...parsed, detected };
    if (isTransfer) {
      state.synonymContext.autoMasterScopesApplied = false;
    }

    renderDataset(kind);
    updateRunAvailability();
    rebuildSynonymContext();

    if (detected.errors.length > 0) {
      showAlert(`${kind} parse completed with configuration errors: ${detected.errors.join(" | ")}`, "error");
    } else {
      showAlert(`${kind} parsed successfully (${parsed.rows.length} rows).`, "success");
    }
  } catch (error) {
    state[kind] = null;
    renderDataset(kind);
    updateRunAvailability();
    rebuildSynonymContext();
    showAlert(`${kind} parse failed: ${error.message}`, "error");
  }
}

function parseTsv(rawText) {
  const text = String(rawText || "").replace(/\r/g, "");
  const lines = text.split("\n");

  let headerIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() !== "") {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex < 0) {
    throw new Error("No content found.");
  }

  let headers = splitTsvLine(lines[headerIndex]);
  if (headers.length === 0) {
    throw new Error("Header row is empty.");
  }

  headers = headers.map((header, idx) => {
    const clean = String(header || "").trim();
    return clean === "" ? `Column${idx + 1}` : clean;
  });

  const rows = [];
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "") {
      continue;
    }

    const cells = splitTsvLine(line);
    const row = {};
    for (let col = 0; col < headers.length; col += 1) {
      row[headers[col]] = (cells[col] ?? "").trim();
    }
    rows.push(row);
  }

  return { headers, rows };
}

function splitTsvLine(line) {
  const cells = String(line || "").split("\t");
  while (cells.length > 0 && String(cells[cells.length - 1]).trim() === "") {
    cells.pop();
  }
  return cells.map((cell) => String(cell || "").trim());
}

function detectColumns(headers) {
  const used = new Set();
  const errors = [];

  const sku = pickBestHeader(headers, scoreSkuHeader, used);
  if (sku) {
    used.add(sku);
  } else {
    errors.push("SKU column not detected.");
  }

  const master = pickBestHeader(headers, scoreMasterHeader);

  const attr1 = pickBestHeader(headers, (header) => scorePairHeader(header, "attribute", 1), used);
  if (attr1) {
    used.add(attr1);
  } else {
    errors.push("Pair #1 attribute column not detected.");
  }

  const opt1 = pickBestHeader(headers, (header) => scorePairHeader(header, "option", 1), used);
  if (opt1) {
    used.add(opt1);
  } else {
    errors.push("Pair #1 option column not detected.");
  }

  const attr2 = pickBestHeader(headers, (header) => scorePairHeader(header, "attribute", 2), used);
  if (attr2) {
    used.add(attr2);
  } else {
    errors.push("Pair #2 attribute column not detected.");
  }

  const opt2 = pickBestHeader(headers, (header) => scorePairHeader(header, "option", 2), used);
  if (opt2) {
    used.add(opt2);
  } else {
    errors.push("Pair #2 option column not detected.");
  }

  return {
    sku,
    master,
    attr1,
    opt1,
    attr2,
    opt2,
    errors
  };
}

function pickBestHeader(headers, scorer, usedSet) {
  let best = null;
  let bestScore = 0;

  headers.forEach((header) => {
    if (usedSet && usedSet.has(header)) {
      return;
    }

    const score = scorer(header);
    if (score > bestScore) {
      best = header;
      bestScore = score;
    }
  });

  return bestScore > 0 ? best : null;
}

function scoreSkuHeader(header) {
  const normalized = normalizeHeader(header);
  const canonical = canonicalHeader(header);

  if (canonical === "sku") {
    return 100;
  }
  if (/\bsku\b/.test(normalized)) {
    return 90;
  }
  if (canonical.startsWith("sku") || canonical.endsWith("sku")) {
    return 70;
  }
  if (canonical.includes("sku")) {
    return 55;
  }
  return 0;
}

function scoreMasterHeader(header) {
  const normalized = normalizeHeader(header);
  const canonical = canonicalHeader(header);

  if (canonical === "mastercode") {
    return 100;
  }
  if (normalized === "master code") {
    return 95;
  }
  if (canonical.includes("mastercode")) {
    return 90;
  }
  if (/\bmaster\b/.test(normalized)) {
    return 60;
  }
  return 0;
}

function scorePairHeader(header, type, number) {
  const normalized = normalizeHeader(header);
  const canonical = canonicalHeader(header);
  const num = String(number);
  const hasNum = new RegExp(`(^|[^0-9])${num}([^0-9]|$)`).test(normalized);

  const isAttribute = type === "attribute";
  const hasType = isAttribute
    ? /\battribute\b|\battr\b/.test(normalized)
    : /\boption\b|\bopt\b/.test(normalized);

  if (!hasType) {
    return 0;
  }

  if (
    canonical === `${num}${type}` ||
    canonical === `${type}${num}` ||
    canonical === `${num}${isAttribute ? "attr" : "opt"}` ||
    canonical === `${isAttribute ? "attr" : "opt"}${num}`
  ) {
    return 100;
  }

  if (normalized.includes(`#${num}`) && hasType) {
    return 95;
  }

  if (hasType && hasNum) {
    return 85;
  }

  if (canonical.includes(num)) {
    return 70;
  }

  return 0;
}

function normalizeHeader(header) {
  return String(header || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalHeader(header) {
  return normalizeHeader(header).replace(/[^a-z0-9]/g, "");
}

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeSynonymValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(\d)\s+([a-z%]+)/gi, "$1$2")
    .trim();
}

function renderDataset(kind) {
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
    `Rows parsed: <strong>${data.rows.length}</strong>`,
    `SKU column: <span class="mono">${escapeHtml(detected.sku || "Not found")}</span>`,
    `MasterCode column: <span class="mono">${escapeHtml(detected.master || "Not found")}</span>`,
    `Pair #1: <span class="mono">${escapeHtml(detected.attr1 || "Not found")}</span> / <span class="mono">${escapeHtml(detected.opt1 || "Not found")}</span>`,
    `Pair #2: <span class="mono">${escapeHtml(detected.attr2 || "Not found")}</span> / <span class="mono">${escapeHtml(detected.opt2 || "Not found")}</span>`
  ];

  if (detected.errors.length > 0) {
    items.push(`<strong>Errors:</strong> ${escapeHtml(detected.errors.join(" | "))}`);
  }

  metaEl.innerHTML = `<ul class="meta-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  previewEl.innerHTML = renderPreviewTable(data.headers, data.rows, PREVIEW_LIMIT);
}

function renderPreviewTable(headers, rows, maxRows) {
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

function updateRunAvailability() {
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

function runMatching() {
  clearAlert();

  if (dom.runBtn.disabled) {
    showAlert("Run is disabled. Parse both tables and resolve detection errors first.", "error");
    return;
  }

  const transfer = state.transfer;
  const target = state.target;
  const rawSynonymRules = readSynonymRulesFromUi();
  const synonymMap = preprocessSynonymRules(rawSynonymRules);
  const targetIndex = buildTargetIndex(target, state.masterMode);

  const results = [];
  transfer.rows.forEach((row) => {
    const result = createBaseResult();
    result.SourceSku = readCell(row, transfer.detected.sku);

    const transferMasterRaw = transfer.detected.master ? readCell(row, transfer.detected.master) : "";
    result.SourceMasterCode = transferMasterRaw;

    const pair1 = extractPair(row, transfer.detected.attr1, transfer.detected.opt1);
    const pair2 = extractPair(row, transfer.detected.attr2, transfer.detected.opt2);
    result.SourceAttributes1 = pair1.display;
    result.SourceAttributes2 = pair2.display;

    const sourceSkuNorm = normalizeValue(result.SourceSku);
    if (!sourceSkuNorm) {
      result.Status = "BLOCKED";
      result.Reason = "Missing source SKU.";
      results.push(result);
      return;
    }

    if (pair1.incomplete) {
      result.Status = "BLOCKED";
      result.Reason = "Pair #1 is incomplete (attribute or option missing).";
      results.push(result);
      return;
    }

    if (pair2.incomplete) {
      result.Status = "BLOCKED";
      result.Reason = "Pair #2 is incomplete (attribute or option missing).";
      results.push(result);
      return;
    }

    const completePairs = [pair1, pair2].filter((pair) => pair.complete);
    if (completePairs.length === 0) {
      result.Status = "BLOCKED";
      result.Reason = "No complete attribute pairs in source row.";
      results.push(result);
      return;
    }

    const sourceMasterNormForSynonym = normalizeValue(transferMasterRaw);
    const synonymMasterKey = state.masterMode
      ? (sourceMasterNormForSynonym || "__ALL__")
      : "__ALL__";

    const usablePairs = [];
    for (let i = 0; i < completePairs.length; i += 1) {
      const synonymOutcome = applySynonymRuleToPair(completePairs[i], synonymMap, synonymMasterKey);

      if (STRICT_SYNONYM_MODE && synonymOutcome.attributeHasRules && !synonymOutcome.matched) {
        result.Status = "BLOCKED";
        result.Reason = "Synonym rule not found for value";
        results.push(result);
        return;
      }

      usablePairs.push(synonymOutcome.pairForLookup);
    }

    let groupKey = GLOBAL_GROUP_KEY;
    if (state.masterMode) {
      const sourceMasterNorm = normalizeValue(transferMasterRaw);
      if (!sourceMasterNorm) {
        result.Status = "BLOCKED";
        result.Reason = "Master matching is enabled but source MasterCode is missing.";
        results.push(result);
        return;
      }

      groupKey = sourceMasterNorm;

      if (!targetIndex.allByGroup.has(groupKey)) {
        result.Status = "NO_MATCH";
        result.Reason = "Source MasterCode does not exist in target table.";
        results.push(result);
        return;
      }
    }

    let candidateSet = null;
    for (let i = 0; i < usablePairs.length; i += 1) {
      const pair = usablePairs[i];
      const optionSet = targetIndex.index.get(groupKey)?.get(pair.attrNorm)?.get(pair.optNorm);

      if (!optionSet) {
        candidateSet = new Set();
        break;
      }

      candidateSet = candidateSet ? intersectSets(candidateSet, optionSet) : new Set(optionSet);
      if (candidateSet.size === 0) {
        break;
      }
    }

    if (!candidateSet || candidateSet.size === 0) {
      result.Status = "NO_MATCH";
      result.Reason = state.masterMode
        ? "No attribute match inside the selected MasterCode group."
        : "No attribute match in target table.";
      results.push(result);
      return;
    }

    if (candidateSet.size === 1) {
      const skuKey = candidateSet.values().next().value;
      const meta = targetIndex.skuMeta.get(skuKey) || {
        sku: skuKey,
        master: "",
        attr1Display: "",
        attr2Display: ""
      };
      result.TargetSku = meta.sku;
      result.TargetAttributes1 = meta.attr1Display || "";
      result.TargetAttributes2 = meta.attr2Display || "";
      result.TargetMasterCode = meta.master;
      result.Status = "MATCHED";
      result.Reason = "Single candidate found.";
      results.push(result);
      return;
    }

    const candidateSkus = Array.from(candidateSet)
      .map((skuKey) => (targetIndex.skuMeta.get(skuKey)?.sku || skuKey))
      .sort((a, b) => a.localeCompare(b));

    result.Status = "AMBIGUOUS";
    result.Reason = `Multiple candidates found in same ${state.masterMode ? "MasterCode" : "global"} scope.`;
    result.Candidates = candidateSkus.join(", ");
    results.push(result);
  });

  state.results = results;
  renderResults();

  showAlert(`Matching completed: ${results.length} rows processed.`, "success");
}

function createBaseResult() {
  return {
    SourceSku: "",
    SourceMasterCode: "",
    SourceAttributes1: "",
    SourceAttributes2: "",
    TargetSku: "",
    TargetAttributes1: "",
    TargetAttributes2: "",
    TargetMasterCode: "",
    Status: "",
    Reason: "",
    Candidates: ""
  };
}

function readSynonymRulesFromUi() {
  const rules = [];
  const scopeEls = Array.from(dom.synonymScopesContainer.querySelectorAll(".synonym-scope"));
  let rowCounter = 0;

  scopeEls.forEach((scopeEl, scopeIndex) => {
    const scopeState = getScopeState(scopeEl);
    if (!scopeState) {
      return;
    }

    const tbody = getScopeElement(scopeEl, "synonymTbody");
    if (!tbody) {
      return;
    }

    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.forEach((row, rowIndex) => {
      rowCounter += 1;
      const attributeName = readInputValue(row, "attributeName");
      const sourcePattern = readInputValue(row, "sourcePattern");
      const targetAttributeName = readInputValue(row, "targetAttributeName");
      const targetValue = readInputValue(row, "targetValue");
      let matchType = readInputValue(row, "matchType").toUpperCase();

      const allEmpty = !attributeName && !sourcePattern && !targetAttributeName && !targetValue;
      if (allEmpty) {
        return;
      }

      if (!["EXACT", "CONTAINS", "REGEX"].includes(matchType)) {
        console.warn(`[Synonym] Invalid match type on row ${rowCounter}. Defaulting to EXACT.`);
        matchType = "EXACT";
      }

      if (!attributeName || !sourcePattern || !targetAttributeName || !targetValue) {
        console.warn(`[Synonym] Incomplete row ${rowCounter} ignored.`);
        return;
      }

      rules.push({
        attributeName,
        sourcePattern,
        targetAttributeName,
        targetValue,
        matchType,
        masterScope: scopeState.selectedMaster || "__ALL__",
        rowNumber: rowCounter,
        scopeNumber: scopeIndex + 1,
        scopeRowNumber: rowIndex + 1
      });
    });
  });

  return rules;
}

function preprocessSynonymRules(rawRules) {
  const synonymMap = new Map();

  rawRules.forEach((rule, order) => {
    const masterKey = normalizeValue(rule.masterScope || "__ALL__") || "__all__";
    const attrNorm = normalizeValue(rule.attributeName);
    const patternNorm = normalizeSynonymValue(rule.sourcePattern);
    const targetAttrNorm = normalizeValue(rule.targetAttributeName);
    const targetValueNorm = normalizeValue(rule.targetValue);

    if (!attrNorm || !patternNorm || !targetAttrNorm || !targetValueNorm) {
      console.warn(`[Synonym] Invalid normalized values on row ${rule.rowNumber}.`);
      return;
    }

    if (!synonymMap.has(masterKey)) {
      synonymMap.set(masterKey, new Map());
    }

    const masterMap = synonymMap.get(masterKey);
    if (!masterMap.has(attrNorm)) {
      masterMap.set(attrNorm, {
        exact: [],
        contains: [],
        regex: [],
        exactPatternMap: new Map()
      });
    }

    const grouped = masterMap.get(attrNorm);
    const compiledRule = {
      order,
      rowNumber: rule.rowNumber,
      sourcePatternRaw: rule.sourcePattern,
      patternNorm,
      targetAttributeRaw: rule.targetAttributeName,
      targetValueRaw: rule.targetValue,
      targetAttrNorm,
      targetValueNorm
    };

    if (rule.matchType === "EXACT") {
      if (grouped.exactPatternMap.has(patternNorm)) {
        const existing = grouped.exactPatternMap.get(patternNorm);
        const sameTarget =
          existing.targetAttrNorm === compiledRule.targetAttrNorm &&
          existing.targetValueNorm === compiledRule.targetValueNorm;

        if (!sameTarget) {
          console.warn(
            `[Synonym] EXACT conflict for master "${masterKey}", attribute "${rule.attributeName}" and pattern "${rule.sourcePattern}" on row ${rule.rowNumber}. Using first match from row ${existing.rowNumber}.`
          );
        } else {
          console.warn(
            `[Synonym] Duplicate EXACT rule for master "${masterKey}", attribute "${rule.attributeName}" and pattern "${rule.sourcePattern}" on row ${rule.rowNumber}. Using first match from row ${existing.rowNumber}.`
          );
        }
        return;
      }

      grouped.exact.push(compiledRule);
      grouped.exactPatternMap.set(patternNorm, compiledRule);
      return;
    }

    if (rule.matchType === "CONTAINS") {
      grouped.contains.push(compiledRule);
      return;
    }

    try {
      compiledRule.regex = new RegExp(rule.sourcePattern, "i");
      grouped.regex.push(compiledRule);
    } catch (error) {
      console.warn(`[Synonym] Invalid REGEX on row ${rule.rowNumber}: ${error.message}`);
    }
  });

  return synonymMap;
}

function applySynonymRuleToPair(pair, synonymMap, masterKey) {
  const normalizedMasterKey = normalizeValue(masterKey || "__ALL__") || "__all__";
  const searchKeys = normalizedMasterKey === "__all__"
    ? ["__all__"]
    : [normalizedMasterKey, "__all__"];

  let attributeHasRules = false;
  for (let i = 0; i < searchKeys.length; i += 1) {
    const masterMap = synonymMap.get(searchKeys[i]);
    if (!masterMap) {
      continue;
    }
    const grouped = masterMap.get(pair.attrNorm);
    if (!grouped) {
      continue;
    }

    attributeHasRules = true;
    const matchedRule = findMatchingRule(grouped, pair.optRaw);
    if (!matchedRule) {
      continue;
    }

    return {
      pairForLookup: {
        ...pair,
        attrNorm: matchedRule.targetAttrNorm,
        optNorm: matchedRule.targetValueNorm
      },
      matched: true,
      attributeHasRules: true
    };
  }

  return {
    pairForLookup: pair,
    matched: false,
    attributeHasRules
  };
}

function findMatchingRule(grouped, sourceRawValue) {
  const sourceValueNorm = normalizeSynonymValue(sourceRawValue);
  const sourceValueRaw = String(sourceRawValue || "");

  for (let i = 0; i < grouped.exact.length; i += 1) {
    if (sourceValueNorm === grouped.exact[i].patternNorm) {
      return grouped.exact[i];
    }
  }

  for (let i = 0; i < grouped.contains.length; i += 1) {
    if (sourceValueNorm.includes(grouped.contains[i].patternNorm)) {
      return grouped.contains[i];
    }
  }

  for (let i = 0; i < grouped.regex.length; i += 1) {
    if (grouped.regex[i].regex.test(sourceValueRaw)) {
      return grouped.regex[i];
    }
  }

  return null;
}

function readInputValue(row, field) {
  const node = row.querySelector(`[data-field='${field}']`);
  if (!node) {
    return "";
  }
  return String(node.value || "").trim();
}

function buildTargetIndex(target, masterMode) {
  const index = new Map();
  const allByGroup = new Map();
  const skuMeta = new Map();
  const d = target.detected;

  target.rows.forEach((row) => {
    const skuRaw = readCell(row, d.sku);
    const skuNorm = normalizeValue(skuRaw);
    if (!skuNorm) {
      return;
    }

    const rowMasterRaw = d.master ? readCell(row, d.master) : "";
    const groupKey = masterMode ? normalizeValue(rowMasterRaw) : GLOBAL_GROUP_KEY;

    if (!allByGroup.has(groupKey)) {
      allByGroup.set(groupKey, new Set());
    }
    allByGroup.get(groupKey).add(skuNorm);

    const pair1 = extractPair(row, d.attr1, d.opt1);
    const pair2 = extractPair(row, d.attr2, d.opt2);

    if (!skuMeta.has(skuNorm)) {
      skuMeta.set(skuNorm, {
        sku: skuRaw,
        master: rowMasterRaw,
        attr1Display: pair1.display || "",
        attr2Display: pair2.display || ""
      });
    }

    const usablePairs = [pair1, pair2].filter((pair) => pair.complete);

    if (!index.has(groupKey)) {
      index.set(groupKey, new Map());
    }

    const groupIndex = index.get(groupKey);
    usablePairs.forEach((pair) => {
      if (!groupIndex.has(pair.attrNorm)) {
        groupIndex.set(pair.attrNorm, new Map());
      }
      const attrIndex = groupIndex.get(pair.attrNorm);
      if (!attrIndex.has(pair.optNorm)) {
        attrIndex.set(pair.optNorm, new Set());
      }
      attrIndex.get(pair.optNorm).add(skuNorm);
    });
  });

  if (!allByGroup.has(GLOBAL_GROUP_KEY)) {
    allByGroup.set(GLOBAL_GROUP_KEY, new Set());
  }

  return { index, allByGroup, skuMeta };
}

function extractPair(row, attrHeader, optHeader) {
  const attrRaw = readCell(row, attrHeader);
  const optRaw = readCell(row, optHeader);
  const attrNorm = normalizeValue(attrRaw);
  const optNorm = normalizeValue(optRaw);

  const complete = Boolean(attrNorm && optNorm);
  const incomplete = (!attrNorm && optNorm) || (attrNorm && !optNorm);
  const display = complete ? `${attrRaw}=${optRaw}` : "";

  return {
    attrRaw,
    optRaw,
    attrNorm,
    optNorm,
    complete,
    incomplete,
    display
  };
}

function readCell(row, header) {
  if (!header) {
    return "";
  }
  return String(row[header] ?? "").trim();
}

function intersectSets(left, right) {
  const out = new Set();
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  small.forEach((value) => {
    if (large.has(value)) {
      out.add(value);
    }
  });
  return out;
}

function renderResults() {
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
        .map((header) => {
          if (header === "Status") {
            const cls = `status-${String(row.Status || "").toLowerCase()}`;
            return `<td><span class="status-badge ${cls}">${escapeHtml(row.Status)}</span></td>`;
          }
          return `<td>${escapeHtml(row[header] || "")}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  dom.resultsContainer.innerHTML = `<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
  dom.resultSummary.textContent = summarizeStatuses(rows);
}

function summarizeStatuses(rows) {
  const counts = {
    MATCHED: 0,
    NO_MATCH: 0,
    AMBIGUOUS: 0,
    BLOCKED: 0
  };

  rows.forEach((row) => {
    if (counts[row.Status] !== undefined) {
      counts[row.Status] += 1;
    }
  });

  return `Total ${rows.length} | MATCHED ${counts.MATCHED} | NO_MATCH ${counts.NO_MATCH} | AMBIGUOUS ${counts.AMBIGUOUS} | BLOCKED ${counts.BLOCKED}`;
}

async function copyResultsAsTsv() {
  if (state.results.length === 0) {
    showAlert("No results available to copy.", "error");
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

  const lines = [headers.join("\t")];
  state.results.forEach((row) => {
    const cells = headers.map((header) => sanitizeTsvCell(row[header] || ""));
    lines.push(cells.join("\t"));
  });

  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    showAlert("Results copied to clipboard as TSV.", "success");
  } catch (error) {
    showAlert(`Clipboard copy failed: ${error.message}`, "error");
  }
}

function downloadResultsAsCsv() {
  if (state.results.length === 0) {
    showAlert("No results available to download.", "error");
    return;
  }

  const headers = ["transfer_sku", "new_sku", "scope"];
  const rows = state.results
    .filter((row) => String(row.TargetSku || "").trim() !== "")
    .map((row) => [
      String(row.SourceSku || "").trim(),
      String(row.TargetSku || "").trim(),
      "Sales, Catalog"
    ]);

  if (rows.length === 0) {
    showAlert("No matched rows with target SKU available for CSV download.", "error");
    return;
  }

  const csvLines = [headers.map(csvEscape).join(",")];
  rows.forEach((line) => {
    csvLines.push(line.map(csvEscape).join(","));
  });

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `sku_transfer_${generateExportCode()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showAlert(`CSV downloaded with ${rows.length} rows.`, "success");
}

function sanitizeTsvCell(value) {
  return String(value || "")
    .replace(/\t/g, " ")
    .replace(/\r?\n/g, " ")
    .trim();
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function generateExportCode() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const timestamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${timestamp}_${randomSuffix}`;
}

function showAlert(message, type) {
  dom.alertBox.classList.remove("hidden", "is-error", "is-warn", "is-success");
  dom.alertBox.classList.add(type === "warn" ? "is-warn" : type === "success" ? "is-success" : "is-error");
  dom.alertBox.textContent = message;
}

function clearAlert() {
  dom.alertBox.textContent = "";
  dom.alertBox.classList.add("hidden");
  dom.alertBox.classList.remove("is-error", "is-warn", "is-success");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
