import { buildMasterChoices, collectTransferMasterValues } from "./scopeState.js";
import { readInputValue } from "./scopeRulesUi.js";

export function getScopeState({ state, scopeEl }) {
  const scopeId = String(scopeEl?.dataset?.scopeId || "");
  return state.synonymContext.scopes.get(scopeId) || null;
}

export function initializeSynonymTable({
  dom,
  addSynonymMasterScope,
  rebuildSynonymContext
}) {
  if (dom.synonymScopesContainer.children.length === 0) {
    addSynonymMasterScope();
  }
  rebuildSynonymContext();
}

export function addSynonymMasterScope({
  state,
  dom,
  initialScope = {},
  createSynonymScopeElement,
  refreshSynonymScope,
  updateSynonymGlobalSummary
}) {
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

export function rebuildSynonymContext({
  state,
  addSynonymMasterScope,
  ensureTransferMasterScopes,
  refreshAllSynonymScopes
}) {
  const ctx = state.synonymContext;
  ctx.masterChoices = buildMasterChoices(state);

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

export function ensureTransferMasterScopes({
  state,
  dom,
  getScopeState,
  scopeHasConfiguredRules,
  addSynonymMasterScope
}) {
  const ctx = state.synonymContext;
  if (ctx.autoMasterScopesApplied) {
    return;
  }
  if (!state.transfer || !state.transfer.detected.master) {
    return;
  }

  const transferMasterValues = collectTransferMasterValues(state);
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

export function scopeHasConfiguredRules({
  scopeEl,
  getScopeElement
}) {
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

export function syncScopeFilterStateFromUi({
  dom,
  getScopeState,
  getScopeElement,
  readMultiSelectValues
}) {
  const scopeEls = Array.from(dom.synonymScopesContainer.querySelectorAll(".synonym-scope"));
  scopeEls.forEach((scopeEl) => {
    const scopeState = getScopeState(scopeEl);
    if (!scopeState) {
      return;
    }

    const masterEl = getScopeElement(scopeEl, "masterFilter");
    const attributeEl = getScopeElement(scopeEl, "attributeFilter");
    const optionEl = getScopeElement(scopeEl, "optionFilter");

    if (masterEl) {
      scopeState.selectedMaster = String(masterEl.value || "__ALL__");
    }
    if (attributeEl) {
      scopeState.selectedFilterAttribute = String(attributeEl.value || "");
    }
    if (optionEl) {
      scopeState.selectedFilterOptions = readMultiSelectValues(optionEl);
    }
  });
}
