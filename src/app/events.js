export function attachEvents(dom, handlers) {
  dom.parseTransferBtn.addEventListener("click", () => handlers.onParseDataset("transfer"));
  dom.parseTargetBtn.addEventListener("click", () => handlers.onParseDataset("target"));
  dom.addMasterScopeBtn.addEventListener("click", () => handlers.onAddMasterScope());
  dom.synonymScopesContainer.addEventListener("click", handlers.onSynonymScopesClick);
  dom.synonymScopesContainer.addEventListener("change", handlers.onSynonymScopesChange);
  dom.runBtn.addEventListener("click", handlers.onRunMatching);
  dom.copyBtn.addEventListener("click", handlers.onCopyResultsAsTsv);
  dom.downloadCsvBtn.addEventListener("click", handlers.onDownloadResultsAsCsv);
}
