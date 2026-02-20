import { shouldUseTargetAttributeFilter } from "./scopeState.js";
import {
  createSynonymScopeElement,
  getScopeElement,
  getScopeAction,
  readMultiSelectValues,
  updateSelectOptions,
  updateMultiSelectOptions,
  updateScopeTableVisibility
} from "./scopeDom.js";
import {
  buildCatalogForScope,
  mapCatalogAttributesToOptions,
  mapCatalogValuesToOptions
} from "./scopeCatalog.js";
import {
  addSynonymRuleRow as addSynonymRuleRowHelper,
  resetScopeSynonymTable as resetScopeSynonymTableHelper,
  rebuildScopeBulkControls as rebuildScopeBulkControlsHelper,
  updateScopeBulkButtonState as updateScopeBulkButtonStateHelper,
  handleScopeBulkAddRules as handleScopeBulkAddRulesHelper,
  refreshScopeRuleRows as refreshScopeRuleRowsHelper,
  refreshSynonymRuleRow as refreshSynonymRuleRowHelper
} from "./scopeRulesUi.js";
import {
  updateScopeInfo as updateScopeInfoHelper,
  updateSynonymGlobalSummary as updateSynonymGlobalSummaryHelper
} from "./scopeSummary.js";
import {
  getScopeState as getScopeStateContext,
  initializeSynonymTable as initializeSynonymTableContext,
  addSynonymMasterScope as addSynonymMasterScopeContext,
  rebuildSynonymContext as rebuildSynonymContextContext,
  ensureTransferMasterScopes as ensureTransferMasterScopesContext,
  scopeHasConfiguredRules as scopeHasConfiguredRulesContext,
  syncScopeFilterStateFromUi as syncScopeFilterStateFromUiContext
} from "./scopeContext.js";
import {
  handleSynonymScopesClick as handleSynonymScopesClickHelper,
  handleSynonymScopesChange as handleSynonymScopesChangeHelper
} from "./scopeEvents.js";

export function createScopeUiController({ state, dom, showAlert, clearAlert, extractPair }) {
  function getScopeState(scopeEl) {
    return getScopeStateContext({ state, scopeEl });
  }

  function updateSynonymGlobalSummary() {
    updateSynonymGlobalSummaryHelper({ state, dom });
  }

  function refreshSynonymRuleRow(scopeEl, scopeState, row, initialValue = null) {
    refreshSynonymRuleRowHelper({
      scopeState,
      row,
      initialValue,
      mapCatalogAttributesToOptions,
      mapCatalogValuesToOptions,
      updateSelectOptions
    });
  }

  function addSynonymRuleRow(scopeEl, initialValue = {}) {
    addSynonymRuleRowHelper({
      scopeEl,
      initialValue,
      getScopeElement,
      updateScopeTableVisibility,
      updateSynonymGlobalSummary,
      refreshSynonymRuleRow,
      getScopeState
    });
  }

  function resetScopeSynonymTable(scopeEl) {
    resetScopeSynonymTableHelper({
      scopeEl,
      getScopeElement,
      updateScopeTableVisibility
    });
  }

  function rebuildScopeBulkControls(scopeEl, scopeState) {
    rebuildScopeBulkControlsHelper({
      scopeEl,
      scopeState,
      getScopeElement,
      mapCatalogAttributesToOptions,
      updateSelectOptions,
      updateScopeBulkButtonState
    });
  }

  function updateScopeBulkButtonState(scopeEl, scopeState) {
    updateScopeBulkButtonStateHelper({
      scopeEl,
      scopeState,
      getScopeElement,
      getScopeAction,
      mapCatalogValuesToOptions
    });
  }

  function handleScopeBulkAddRules(scopeEl, scopeState) {
    handleScopeBulkAddRulesHelper({
      scopeEl,
      scopeState,
      clearAlert,
      showAlert,
      getScopeElement,
      mapCatalogValuesToOptions,
      addSynonymRuleRow
    });
  }

  function refreshScopeRuleRows(scopeEl, scopeState) {
    refreshScopeRuleRowsHelper({
      scopeEl,
      scopeState,
      getScopeElement,
      refreshSynonymRuleRow
    });
  }

  function renderScopeMasterFilter(scopeEl, scopeState) {
    const selectEl = getScopeElement(scopeEl, "masterFilter");
    if (!selectEl) {
      return;
    }

    const options = [{ value: "__ALL__", label: "All Masters" }];
    if (state.masterMode) {
      options.push(...state.synonymContext.masterChoices);
      selectEl.disabled = false;
    } else {
      selectEl.disabled = true;
      scopeState.selectedMaster = "__ALL__";
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

    const useTargetCatalog = shouldUseTargetAttributeFilter({ state, scopeState, extractPair });
    const filterCatalog = buildCatalogForScope({
      state,
      scopeState,
      role: useTargetCatalog ? "target" : "source",
      options: { applyAttributeFilter: false },
      extractPair
    });

    const attributeOptions = mapCatalogAttributesToOptions(filterCatalog);
    attributeEl.disabled = attributeOptions.length === 0;

    updateSelectOptions(attributeEl, attributeOptions, "All Attributes", scopeState.selectedFilterAttribute);
    scopeState.selectedFilterAttribute = String(attributeEl.value || "");

    const optionChoices = mapCatalogValuesToOptions(filterCatalog, scopeState.selectedFilterAttribute);
    updateMultiSelectOptions(optionEl, optionChoices, scopeState.selectedFilterOptions);
    scopeState.selectedFilterOptions = readMultiSelectValues(optionEl);
    optionEl.disabled = !scopeState.selectedFilterAttribute || optionChoices.length === 0;
  }

  function rebuildScopeCatalogs(scopeState) {
    scopeState.sourceCatalog = buildCatalogForScope({
      state,
      scopeState,
      role: "source",
      options: { applyAttributeFilter: true },
      extractPair
    });
    scopeState.targetCatalog = buildCatalogForScope({
      state,
      scopeState,
      role: "target",
      options: { applyAttributeFilter: true },
      extractPair
    });
  }

  function updateScopeInfo(scopeEl, scopeState) {
    updateScopeInfoHelper({
      scopeEl,
      scopeState,
      state,
      getScopeElement,
      extractPair
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

  function refreshAllSynonymScopes() {
    const scopes = Array.from(dom.synonymScopesContainer.querySelectorAll(".synonym-scope"));
    scopes.forEach((scopeEl) => {
      const scopeState = getScopeState(scopeEl);
      if (scopeState) {
        refreshSynonymScope(scopeEl, scopeState);
      }
    });
  }

  function scopeHasConfiguredRules(scopeEl) {
    return scopeHasConfiguredRulesContext({
      scopeEl,
      getScopeElement
    });
  }

  function addSynonymMasterScope(initialScope = {}) {
    addSynonymMasterScopeContext({
      state,
      dom,
      initialScope,
      createSynonymScopeElement,
      refreshSynonymScope,
      updateSynonymGlobalSummary
    });
  }

  function ensureTransferMasterScopes() {
    ensureTransferMasterScopesContext({
      state,
      dom,
      getScopeState,
      scopeHasConfiguredRules,
      addSynonymMasterScope
    });
  }

  function rebuildSynonymContext() {
    rebuildSynonymContextContext({
      state,
      addSynonymMasterScope,
      ensureTransferMasterScopes,
      refreshAllSynonymScopes
    });
  }

  function initializeSynonymTable() {
    initializeSynonymTableContext({
      dom,
      addSynonymMasterScope,
      rebuildSynonymContext
    });
  }

  function syncScopeFilterStateFromUi() {
    syncScopeFilterStateFromUiContext({
      dom,
      getScopeState,
      getScopeElement,
      readMultiSelectValues
    });
  }

  function handleSynonymScopesClick(event) {
    handleSynonymScopesClickHelper({
      event,
      state,
      getScopeState,
      updateSynonymGlobalSummary,
      addSynonymRuleRow,
      updateScopeTableVisibility,
      handleScopeBulkAddRules
    });
  }

  function handleSynonymScopesChange(event) {
    handleSynonymScopesChangeHelper({
      event,
      getScopeState,
      refreshSynonymScope,
      resetScopeSynonymTable,
      readMultiSelectValues,
      updateScopeBulkButtonState,
      refreshSynonymRuleRow
    });
  }

  return {
    initializeSynonymTable,
    addSynonymMasterScope,
    handleSynonymScopesClick,
    handleSynonymScopesChange,
    rebuildSynonymContext,
    syncScopeFilterStateFromUi,
    getScopeState,
    getScopeElement
  };
}
