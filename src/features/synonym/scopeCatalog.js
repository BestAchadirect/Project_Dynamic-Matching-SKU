import { resolveSynonymGroupKey, shouldUseTargetAttributeFilter } from "./scopeState.js";

export function buildCatalogForScope({ state, scopeState, role, options = {}, extractPair }) {
  const catalog = new Map();
  if (!state.transfer || !state.target) {
    return catalog;
  }

  const dataset = role === "source" ? state.transfer : state.target;
  const applyAttributeFilter = options.applyAttributeFilter !== false;
  const useTargetFilterMode = shouldUseTargetAttributeFilter({ state, scopeState, extractPair });
  const shouldApplyFilterForRole = applyAttributeFilter && (!useTargetFilterMode || role === "target");
  const selectedMaster = scopeState.selectedMaster || "__ALL__";
  const filterAttrNorm = shouldApplyFilterForRole ? scopeState.selectedFilterAttribute : "";
  const filterOptionSet = shouldApplyFilterForRole ? scopeState.selectedFilterOptions : new Set();

  dataset.rows.forEach((row) => {
    const groupKey = resolveSynonymGroupKey(state, dataset, row);
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

export function mapCatalogAttributesToOptions(catalog) {
  return Array.from(catalog.entries())
    .map(([attrNorm, data]) => ({
      value: attrNorm,
      label: data.label || attrNorm
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function mapCatalogValuesToOptions(catalog, attrNorm) {
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
