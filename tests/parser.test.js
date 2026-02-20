import test from "node:test";
import assert from "node:assert/strict";

import { parseTsv } from "../src/features/parser/parseTsv.js";
import { detectColumns } from "../src/features/parser/detectColumns.js";

test("parse with header mode and detect required columns", () => {
  const raw = [
    "Master Code\tSku\t#1 Attribute\t#1 Option\t#2 Attribute\t#2 Option",
    "M1\tSKU-1\tLength\t10 cm\tColor\tRed"
  ].join("\n");

  const parsed = parseTsv(raw, { noHeader: false });
  const detected = detectColumns(parsed.headers);

  assert.equal(parsed.rows.length, 1);
  assert.equal(detected.sku, "Sku");
  assert.equal(detected.master, "Master Code");
  assert.equal(detected.attr1, "#1 Attribute");
  assert.equal(detected.opt1, "#1 Option");
  assert.equal(detected.errors.length, 0);
});

test("parse without header mode applies default template", () => {
  const raw = [
    "M1\tSKU-1\tLength\t10 cm\tColor\tRed",
    "M1\tSKU-2\tLength\t20 cm\tColor\tBlue"
  ].join("\n");

  const parsed = parseTsv(raw, { noHeader: true });

  assert.equal(parsed.headers[0], "Master Code");
  assert.equal(parsed.headers[2], "Sku");
  assert.equal(parsed.rows.length, 2);
});

test("detectColumns flags pair #2 mismatch", () => {
  const headers = ["Master Code", "Sku", "#1 Attribute", "#1 Option", "#2 Attribute"];
  const detected = detectColumns(headers);

  assert.ok(detected.errors.includes("Pair #2 is incomplete at header level (attribute/option mismatch)."));
});
