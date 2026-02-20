export function readSynonymRulesFromUi({ dom, getScopeState, getScopeElement }) {
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

export function readInputValue(row, field) {
  const node = row.querySelector(`[data-field='${field}']`);
  if (!node) {
    return "";
  }
  return String(node.value || "").trim();
}
