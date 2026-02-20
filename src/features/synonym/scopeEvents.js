export function handleSynonymScopesClick({
  event,
  state,
  getScopeState,
  updateSynonymGlobalSummary,
  addSynonymRuleRow,
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
  resetScopeSynonymTable,
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
