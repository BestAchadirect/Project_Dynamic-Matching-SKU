import { getFilterDatasetLabel } from "./scopeState.js";

export function getScopeMasterLabel(scopeState, state) {
  const selectedMaster = scopeState.selectedMaster || "__ALL__";
  if (selectedMaster === "__ALL__") {
    return "All Masters";
  }

  const choice = state.synonymContext.masterChoices.find((item) => item.value === selectedMaster);
  return choice ? choice.label : selectedMaster;
}

export function updateScopeInfo({
  scopeEl,
  scopeState,
  state,
  getScopeElement
}) {
  const infoEl = getScopeElement(scopeEl, "scopeInfo");
  const headerInfoEl = getScopeElement(scopeEl, "scopeHeaderInfo");
  const selectedMaster = scopeState.selectedMaster || "__ALL__";
  const masterLabel = getScopeMasterLabel(scopeState, state);

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

  const filterSourceLabel = getFilterDatasetLabel(scopeState.selectedFilterDataset);
  const selectedAttribute = scopeState.selectedFilterAttribute || "";
  const optionCount = scopeState.selectedFilterOptions.size;
  const sourceAttrCount = scopeState.sourceCatalog?.size || 0;
  const targetAttrCount = scopeState.targetCatalog?.size || 0;
  const targetMasterLabel = scopeState.selectedTargetMaster
    ? ` | Target MasterCode: ${scopeState.selectedTargetMaster}`
    : "";
  const availabilityText = ` | Source attrs: ${sourceAttrCount} | Target attrs: ${targetAttrCount}${targetMasterLabel}`;
  const sourceEmptyHint = sourceAttrCount === 0
    ? " | Warning: no transfer_sku attributes/options detected; Synonym Rules disabled."
    : "";
  const filterText = selectedAttribute
    ? ` | Attribute filter (${filterSourceLabel}): ${selectedAttribute}${optionCount > 0 ? ` (${optionCount} selected)` : " (all options)"}`
    : "";
  const selectedAttribute2 = scopeState.selectedFilterAttribute2 || "";
  const optionCount2 = scopeState.selectedFilterOptions2.size;
  const filterText2 = selectedAttribute2
    ? ` | Attribute filter 2 (new_sku): ${selectedAttribute2}${optionCount2 > 0 ? ` (${optionCount2} selected)` : " (all options)"}`
    : "";
  const detailText = `${filterText}${filterText2}${availabilityText}${sourceEmptyHint}`;

  if (!state.masterMode) {
    infoEl.textContent = `MasterCode filter disabled.${detailText}`;
    return;
  }

  if (selectedMaster === "__ALL__") {
    infoEl.textContent = `All master groups${detailText}.`;
    return;
  }

  const choice = state.synonymContext.masterChoices.find((item) => item.value === selectedMaster);
  const infoText = choice
    ? `MasterCode: ${choice.label}${detailText}.`
    : `MasterCode: ${selectedMaster}${detailText}.`;

  infoEl.textContent = infoText;
}

export function updateSynonymGlobalSummary({ state, dom }) {
  const bar = dom.synonymSummaryBar;
  if (!bar) {
    return;
  }

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
