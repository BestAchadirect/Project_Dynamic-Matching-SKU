import test from "node:test";
import assert from "node:assert/strict";

import { runMatchingRows } from "../src/features/matching/matcher.js";
import { preprocessSynonymRules } from "../src/features/synonym/ruleEngine.js";
import { csvEscape } from "../src/features/results/exportCsv.js";
import { sanitizeTsvCell } from "../src/features/results/exportTsv.js";
import { createDataset, createStateWithScope } from "./fixtures.js";

test("single complete pair can produce ambiguous result with sorted candidates", () => {
  const transfer = createDataset([
    {
      "Master Code": "M1",
      Sku: "SRC-1",
      "#1 Attribute": "Length",
      "#1 Option": "10 cm",
      "#2 Attribute": "",
      "#2 Option": ""
    }
  ]);

  const target = createDataset([
    {
      "Master Code": "M1",
      Sku: "T-B",
      "#1 Attribute": "Length",
      "#1 Option": "10 cm",
      "#2 Attribute": "",
      "#2 Option": ""
    },
    {
      "Master Code": "M1",
      Sku: "T-A",
      "#1 Attribute": "Length",
      "#1 Option": "10 cm",
      "#2 Attribute": "",
      "#2 Option": ""
    }
  ]);

  const state = createStateWithScope({ selectedMaster: "m1" });

  const rows = runMatchingRows({
    transfer,
    target,
    synonymMap: preprocessSynonymRules([]),
    state,
    masterMode: true
  });

  assert.equal(rows[0].Status, "AMBIGUOUS");
  assert.equal(rows[0].Candidates, "T-A, T-B");
});

test("two complete pairs narrow to a single match", () => {
  const transfer = createDataset([
    {
      "Master Code": "M1",
      Sku: "SRC-2",
      "#1 Attribute": "Length",
      "#1 Option": "10 cm",
      "#2 Attribute": "Color",
      "#2 Option": "Red"
    }
  ]);

  const target = createDataset([
    {
      "Master Code": "M1",
      Sku: "T-RED",
      "#1 Attribute": "Length",
      "#1 Option": "10 cm",
      "#2 Attribute": "Color",
      "#2 Option": "Red"
    },
    {
      "Master Code": "M1",
      Sku: "T-BLUE",
      "#1 Attribute": "Length",
      "#1 Option": "10 cm",
      "#2 Attribute": "Color",
      "#2 Option": "Blue"
    }
  ]);

  const state = createStateWithScope({ selectedMaster: "m1" });

  const rows = runMatchingRows({
    transfer,
    target,
    synonymMap: preprocessSynonymRules([]),
    state,
    masterMode: true
  });

  assert.equal(rows[0].Status, "MATCHED");
  assert.equal(rows[0].TargetSku, "T-RED");
});

test("synonym priority applies EXACT before CONTAINS", () => {
  const transfer = createDataset([
    {
      "Master Code": "M1",
      Sku: "SRC-3",
      "#1 Attribute": "Length",
      "#1 Option": "10 cm",
      "#2 Attribute": "",
      "#2 Option": ""
    }
  ]);

  const target = createDataset([
    {
      "Master Code": "M1",
      Sku: "T-10CM",
      "#1 Attribute": "Length",
      "#1 Option": "10cm",
      "#2 Attribute": "",
      "#2 Option": ""
    },
    {
      "Master Code": "M1",
      Sku: "T-10",
      "#1 Attribute": "Length",
      "#1 Option": "10",
      "#2 Attribute": "",
      "#2 Option": ""
    }
  ]);

  const state = createStateWithScope({ selectedMaster: "m1" });
  const synonymMap = preprocessSynonymRules([
    {
      attributeName: "Length",
      sourcePattern: "10",
      targetAttributeName: "Length",
      targetValue: "10",
      matchType: "CONTAINS",
      masterScope: "M1",
      rowNumber: 1
    },
    {
      attributeName: "Length",
      sourcePattern: "10 cm",
      targetAttributeName: "Length",
      targetValue: "10cm",
      matchType: "EXACT",
      masterScope: "M1",
      rowNumber: 2
    }
  ]);

  const rows = runMatchingRows({ transfer, target, synonymMap, state, masterMode: true });

  assert.equal(rows[0].Status, "MATCHED");
  assert.equal(rows[0].TargetSku, "T-10CM");
});

test("export format helpers preserve expected escaping", () => {
  assert.equal(csvEscape("Sales, Catalog"), '"Sales, Catalog"');
  assert.equal(sanitizeTsvCell("A\tB\nC"), "A B C");
});
