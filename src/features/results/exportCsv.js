export function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export function generateExportCode() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const timestamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${timestamp}_${randomSuffix}`;
}

export function downloadResultsAsCsv({ state, showAlert }) {
  if (state.results.length === 0) {
    showAlert("No results available to download.", "error");
    return;
  }

  const headers = ["transfer_sku", "new_sku", "scope"];
  const rows = state.results
    .filter((row) => String(row.TargetSku || "").trim() !== "")
    .map((row) => [
      String(row.SourceSku || "").trim(),
      String(row.TargetSku || "").trim(),
      "Sales, Catalog"
    ]);

  if (rows.length === 0) {
    showAlert("No matched rows with target SKU available for CSV download.", "error");
    return;
  }

  const csvLines = [headers.map(csvEscape).join(",")];
  rows.forEach((line) => {
    csvLines.push(line.map(csvEscape).join(","));
  });

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `sku_transfer_${generateExportCode()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showAlert(`CSV downloaded with ${rows.length} rows.`, "success");
}
