import { GLOBAL_GROUP_KEY, STRICT_SYNONYM_MODE } from "../../core/constants.js";
import { normalizeValue, readCell } from "../../core/normalize.js";
import { intersectSets } from "../../core/collections.js";
import { buildTargetIndex, extractPair } from "./targetIndex.js";
import { applySynonymRuleToPair } from "../synonym/ruleEngine.js";
import { applyTargetAttributeFilter } from "./attributeFilter.js";
import { resolveScopeForMaster } from "../synonym/scopeState.js";

export function createBaseResult() {
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

export function runMatchingRows({ transfer, target, synonymMap, state, masterMode }) {
  const targetIndex = buildTargetIndex(target, masterMode);
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

    const sourceMasterNormForSynonym = normalizeValue(transferMasterRaw);
    const synonymMasterKey = masterMode
      ? (sourceMasterNormForSynonym || "__ALL__")
      : "__ALL__";

    let groupKey = GLOBAL_GROUP_KEY;
    if (masterMode) {
      const sourceMasterNorm = normalizeValue(transferMasterRaw);
      if (!sourceMasterNorm) {
        result.Status = "BLOCKED";
        result.Reason = "Master matching is enabled but source MasterCode is missing.";
        results.push(result);
        return;
      }

      const scopeState = resolveScopeForMaster(state, sourceMasterNorm);
      const mappedTargetMaster = scopeState?.selectedTargetMaster
        ? normalizeValue(scopeState.selectedTargetMaster)
        : "";
      const mappingApplied = Boolean(mappedTargetMaster && mappedTargetMaster !== sourceMasterNorm);
      groupKey = mappedTargetMaster || sourceMasterNorm;

      if (!targetIndex.allByGroup.has(groupKey)) {
        result.Status = "NO_MATCH";
        result.Reason = mappingApplied
          ? "Selected Target MasterCode does not exist in target table."
          : "Source MasterCode does not exist in target table.";
        results.push(result);
        return;
      }
    }

    const completePairs = [pair1, pair2].filter((pair) => pair.complete);
    const noSourcePairs = completePairs.length === 0;

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

    let candidateSet = null;
    if (noSourcePairs) {
      candidateSet = new Set(targetIndex.allByGroup.get(groupKey) || []);
    } else {
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
    }

    if (!candidateSet || candidateSet.size === 0) {
      result.Status = "NO_MATCH";
      if (noSourcePairs) {
        result.Reason = masterMode
          ? "No candidates available in selected MasterCode group."
          : "No candidates available in target table.";
      } else {
        result.Reason = masterMode
          ? "No attribute match inside the selected MasterCode group."
          : "No attribute match in target table.";
      }
      results.push(result);
      return;
    }

    const attributeFilterOutcome = applyTargetAttributeFilter({
      candidateSet,
      sourceMasterRaw: transferMasterRaw,
      targetIndex,
      state
    });

    if (attributeFilterOutcome.applied) {
      candidateSet = attributeFilterOutcome.filteredSet;
      if (candidateSet.size === 0) {
        result.Status = "NO_MATCH";
        result.Reason = "No candidate matched the selected Attribute Filter.";
        results.push(result);
        return;
      }
    }

    let matchedReason = "Single candidate found.";
    if (attributeFilterOutcome.applied && candidateSet.size === 1) {
      matchedReason = "Single candidate found after applying Attribute Filter.";
    } else if (noSourcePairs && candidateSet.size === 1) {
      matchedReason = "Single candidate found without source attributes.";
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
      result.Reason = matchedReason;
      results.push(result);
      return;
    }

    const candidateSkus = Array.from(candidateSet)
      .map((skuKey) => (targetIndex.skuMeta.get(skuKey)?.sku || skuKey))
      .sort((a, b) => a.localeCompare(b));

    result.Status = "AMBIGUOUS";
    result.Reason = noSourcePairs
      ? `Multiple candidates found without source attributes in same ${masterMode ? "MasterCode" : "global"} scope.`
      : `Multiple candidates found in same ${masterMode ? "MasterCode" : "global"} scope.`;
    result.Candidates = candidateSkus.join(", ");
    results.push(result);
  });

  return results;
}
