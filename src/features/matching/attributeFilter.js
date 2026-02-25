import { normalizeValue } from "../../core/normalize.js";
import { normalizeFilterDataset, resolveScopeForMaster } from "../synonym/scopeState.js";

export function applyTargetAttributeFilter({ candidateSet, sourceMasterRaw, targetIndex, state }) {
  if (!candidateSet || candidateSet.size === 0) {
    return {
      applied: false,
      filteredSet: candidateSet || new Set()
    };
  }

  const sourceMasterNorm = normalizeValue(sourceMasterRaw);
  const scopeState = resolveScopeForMaster(state, sourceMasterNorm);
  if (!scopeState) {
    return {
      applied: false,
      filteredSet: candidateSet
    };
  }

  const selectedFilterDataset = normalizeFilterDataset(scopeState.selectedFilterDataset);
  if (selectedFilterDataset !== "target") {
    return {
      applied: false,
      filteredSet: candidateSet
    };
  }

  const filterAttrNorm = normalizeValue(scopeState.selectedFilterAttribute);
  const filterAttrNorm2 = normalizeValue(scopeState.selectedFilterAttribute2);
  if (!filterAttrNorm && !filterAttrNorm2) {
    return {
      applied: false,
      filteredSet: candidateSet
    };
  }

  const filterOptionSet = scopeState.selectedFilterOptions || new Set();
  const filterOptionSet2 = scopeState.selectedFilterOptions2 || new Set();
  const filteredSet = new Set();

  candidateSet.forEach((skuKey) => {
    const skuMeta = targetIndex?.skuMeta?.get(skuKey);
    if (!passesAttributeFilter(skuMeta, filterAttrNorm, filterOptionSet)) {
      return;
    }
    if (!passesAttributeFilter(skuMeta, filterAttrNorm2, filterOptionSet2)) {
      return;
    }
    filteredSet.add(skuKey);
  });

  return {
    applied: true,
    filteredSet
  };
}

function passesAttributeFilter(skuMeta, filterAttrNorm, filterOptionSet) {
  if (!filterAttrNorm) {
    return true;
  }

  const pair = skuMeta?.attributeMap?.get(filterAttrNorm);
  if (!pair) {
    return false;
  }

  if (filterOptionSet.size === 0) {
    return true;
  }
  return filterOptionSet.has(pair.optNorm);
}
