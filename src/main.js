import "./core/types.js";

import { state } from "./app/state.js";
import { dom } from "./app/dom.js";
import { attachEvents } from "./app/events.js";

import { parseTsv } from "./features/parser/parseTsv.js";
import { detectColumns } from "./features/parser/detectColumns.js";

import { createScopeUiController } from "./features/synonym/scopeUi.js";
import { readSynonymRulesFromUi } from "./features/synonym/ruleReader.js";
import { preprocessSynonymRules } from "./features/synonym/ruleEngine.js";

import { extractPair } from "./features/matching/targetIndex.js";
import { runMatchingRows } from "./features/matching/matcher.js";

import { renderDataset, renderResults, updateRunAvailability } from "./features/results/renderer.js";
import { copyResultsAsTsv } from "./features/results/exportTsv.js";
import { downloadResultsAsCsv } from "./features/results/exportCsv.js";

const scopeUi = createScopeUiController({
  state,
  dom,
  showAlert,
  clearAlert,
  extractPair
});

attachEvents(dom, {
  onParseDataset: parseDataset,
  onAddMasterScope: () => scopeUi.addSynonymMasterScope(),
  onSynonymScopesClick: scopeUi.handleSynonymScopesClick,
  onSynonymScopesChange: scopeUi.handleSynonymScopesChange,
  onRunMatching: runMatching,
  onCopyResultsAsTsv: () => copyResultsAsTsv({ state, showAlert }),
  onDownloadResultsAsCsv: () => downloadResultsAsCsv({ state, showAlert })
});

scopeUi.initializeSynonymTable();
updateRunAvailability({ state, dom });
renderResults({ state, dom });

function parseDataset(kind) {
  clearAlert();
  const isTransfer = kind === "transfer";
  const input = isTransfer ? dom.transferInput.value : dom.targetInput.value;
  const parseWithoutHeader = isTransfer
    ? Boolean(dom.transferNoHeader && dom.transferNoHeader.checked)
    : Boolean(dom.targetNoHeader && dom.targetNoHeader.checked);

  try {
    const parsed = parseTsv(input, { noHeader: parseWithoutHeader });
    const detected = detectColumns(parsed.headers);
    state[kind] = { ...parsed, detected, parseWithoutHeader };
    if (isTransfer) {
      state.synonymContext.autoMasterScopesApplied = false;
    }

    renderDataset(kind, { state, dom });
    updateRunAvailability({ state, dom });
    scopeUi.rebuildSynonymContext();

    if (detected.errors.length > 0) {
      showAlert(`${kind} parse completed with configuration errors: ${detected.errors.join(" | ")}`, "error");
    } else {
      showAlert(`${kind} parsed successfully (${parsed.rows.length} rows).`, "success");
    }
  } catch (error) {
    state[kind] = null;
    renderDataset(kind, { state, dom });
    updateRunAvailability({ state, dom });
    scopeUi.rebuildSynonymContext();
    showAlert(`${kind} parse failed: ${error.message}`, "error");
  }
}

function runMatching() {
  clearAlert();

  if (dom.runBtn.disabled) {
    showAlert("Run is disabled. Parse both tables and resolve detection errors first.", "error");
    return;
  }

  scopeUi.syncScopeFilterStateFromUi();

  const rawSynonymRules = readSynonymRulesFromUi({
    dom,
    getScopeState: scopeUi.getScopeState,
    getScopeElement: scopeUi.getScopeElement
  });
  const synonymMap = preprocessSynonymRules(rawSynonymRules);

  state.results = runMatchingRows({
    transfer: state.transfer,
    target: state.target,
    synonymMap,
    state,
    masterMode: state.masterMode
  });

  renderResults({ state, dom });
  showAlert(`Matching completed: ${state.results.length} rows processed.`, "success");
}

function showAlert(message, type) {
  dom.alertBox.classList.remove("hidden", "is-error", "is-warn", "is-success");
  dom.alertBox.classList.add(type === "warn" ? "is-warn" : type === "success" ? "is-success" : "is-error");
  dom.alertBox.textContent = message;
}

function clearAlert() {
  dom.alertBox.textContent = "";
  dom.alertBox.classList.add("hidden");
  dom.alertBox.classList.remove("is-error", "is-warn", "is-success");
}
