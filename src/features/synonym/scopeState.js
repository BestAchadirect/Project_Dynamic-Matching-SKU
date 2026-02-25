import { GLOBAL_GROUP_KEY } from "../../core/constants.js";
import { normalizeValue, readCell } from "../../core/normalize.js";

export function createEmptySynonymContext() {
  return {
    masterChoices: [],
    targetMasterChoices: [],
    scopes: new Map(),
    nextScopeId: 1,
    autoMasterScopesApplied: false
  };
}

export function buildMasterChoices(state) {
  const hasTransferMaster = Boolean(state.transfer && state.transfer.detected.master);
  const hasTargetMaster = Boolean(state.target && state.target.detected.master);
  if (!hasTransferMaster && !hasTargetMaster) {
    return [];
  }

  const seen = new Map();

  // Synonym rule source is transfer_sku, so prioritize transfer masters for scope selection.
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
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }));

  }

  // Fallback only when transfer master is unavailable.
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
    .map(([value, label]) => ({ value, label }));

}

export function collectTransferMasterValues(state) {
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

export function resolveSynonymGroupKey(state, dataset, row) {
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

export function resolveScopeForMaster(state, sourceMasterNorm) {
  const scopes = Array.from(state.synonymContext.scopes.values());
  if (scopes.length === 0) {
    return null;
  }

  if (sourceMasterNorm) {
    const exactScope = scopes.find(
      (scopeState) => normalizeValue(scopeState.selectedMaster || "__ALL__") === sourceMasterNorm
    );
    if (exactScope) {
      return exactScope;
    }
  }

  const globalScope = scopes.find((scopeState) => String(scopeState.selectedMaster || "__ALL__") === "__ALL__");
  return globalScope || null;
}

export function buildTargetMasterChoices(state) {
  if (!state.target || !state.target.detected.master) {
    return [];
  }

  const seen = new Map();
  state.target.rows.forEach((row) => {
    const targetRaw = readCell(row, state.target.detected.master);
    const targetNorm = normalizeValue(targetRaw);
    if (!targetNorm) {
      return;
    }
    if (!seen.has(targetNorm)) {
      seen.set(targetNorm, targetRaw);
    }
  });

  return Array.from(seen.entries())
    .map(([value, label]) => ({ value, label }));

}

export function normalizeFilterDataset(value) {
  const raw = String(value || "target").trim().toLowerCase();
  return raw === "source" ? "source" : "target";
}

export function getFilterDatasetLabel(value) {
  return normalizeFilterDataset(value) === "source" ? "transfer_sku" : "new_sku";
}

export function shouldUseTargetAttributeFilter({ state, scopeState, extractPair }) {
  if (!scopeState || !state.transfer) {
    return false;
  }

  const selectedMaster = scopeState.selectedMaster || "__ALL__";
  let hasAtLeastOneSourcePair = false;

  for (let i = 0; i < state.transfer.rows.length; i += 1) {
    const row = state.transfer.rows[i];
    const groupKey = resolveSynonymGroupKey(state, state.transfer, row);
    if (!groupKey) {
      continue;
    }

    if (state.masterMode && selectedMaster !== "__ALL__" && groupKey !== selectedMaster) {
      continue;
    }

    const pair1 = extractPair(row, state.transfer.detected.attr1, state.transfer.detected.opt1);
    const pair2 = extractPair(row, state.transfer.detected.attr2, state.transfer.detected.opt2);

    if (pair1.complete) {
      hasAtLeastOneSourcePair = true;
    }

    if (pair2.complete) {
      return false;
    }
  }

  return hasAtLeastOneSourcePair;
}

