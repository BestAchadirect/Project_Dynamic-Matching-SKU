import { normalizeValue } from "../../core/normalize.js";
import { resolveScopeForMaster } from "../synonym/scopeState.js";

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

  const filterAttrNorm = normalizeValue(scopeState.selectedFilterAttribute);
  if (!filterAttrNorm) {
    return {
      applied: false,
      filteredSet: candidateSet
    };
  }

  const filterOptionSet = scopeState.selectedFilterOptions || new Set();
  const filteredSet = new Set();

  candidateSet.forEach((skuKey) => {
    const skuMeta = targetIndex?.skuMeta?.get(skuKey);
    const pair = skuMeta?.attributeMap?.get(filterAttrNorm);
    if (!pair) {
      return;
    }

    if (filterOptionSet.size === 0 || filterOptionSet.has(pair.optNorm)) {
      filteredSet.add(skuKey);
    }
  });

  return {
    applied: true,
    filteredSet
  };
}
