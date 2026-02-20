export function sanitizeTsvCell(value) {
  return String(value || "")
    .replace(/\t/g, " ")
    .replace(/\r?\n/g, " ")
    .trim();
}

export async function copyResultsAsTsv({ state, showAlert }) {
  if (state.results.length === 0) {
    showAlert("No results available to copy.", "error");
    return;
  }

  const headers = [
    "SourceSku",
    "SourceAttributes1",
    "SourceAttributes2",
    "TargetSku",
    "TargetAttributes1",
    "TargetAttributes2"
  ];

  const lines = [headers.join("\t")];
  state.results.forEach((row) => {
    const cells = headers.map((header) => sanitizeTsvCell(row[header] || ""));
    lines.push(cells.join("\t"));
  });

  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    showAlert("Results copied to clipboard as TSV.", "success");
  } catch (error) {
    showAlert(`Clipboard copy failed: ${error.message}`, "error");
  }
}
