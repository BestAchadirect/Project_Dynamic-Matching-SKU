import { NO_HEADER_DEFAULT_HEADERS } from "../../core/constants.js";

export function parseTsv(rawText, options = {}) {
  const parseWithoutHeader = Boolean(options.noHeader);
  const text = String(rawText || "").replace(/\r/g, "");
  const lines = text.split("\n");

  let firstContentIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() !== "") {
      firstContentIndex = i;
      break;
    }
  }

  if (firstContentIndex < 0) {
    throw new Error("No content found.");
  }

  let headers = [];
  let dataStartIndex = firstContentIndex + 1;
  if (parseWithoutHeader) {
    let maxCols = 0;
    for (let i = firstContentIndex; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.trim() === "") {
        continue;
      }
      const cells = splitTsvLine(line);
      if (cells.length > maxCols) {
        maxCols = cells.length;
      }
    }

    if (maxCols === 0) {
      throw new Error("No tabular rows found.");
    }

    headers = Array.from(
      { length: maxCols },
      (_, idx) => NO_HEADER_DEFAULT_HEADERS[idx] || `Column${idx + 1}`
    );
    dataStartIndex = firstContentIndex;
  } else {
    headers = splitTsvLine(lines[firstContentIndex]);
    if (headers.length === 0) {
      throw new Error("Header row is empty.");
    }

    headers = headers.map((header, idx) => {
      const clean = String(header || "").trim();
      return clean === "" ? `Column${idx + 1}` : clean;
    });
  }

  const rows = [];
  for (let i = dataStartIndex; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "") {
      continue;
    }

    const cells = splitTsvLine(line);
    const row = {};
    for (let col = 0; col < headers.length; col += 1) {
      row[headers[col]] = (cells[col] ?? "").trim();
    }
    rows.push(row);
  }

  return { headers, rows };
}

export function splitTsvLine(line) {
  const cells = String(line || "").split("\t");
  while (cells.length > 0 && String(cells[cells.length - 1]).trim() === "") {
    cells.pop();
  }
  return cells.map((cell) => String(cell || "").trim());
}
