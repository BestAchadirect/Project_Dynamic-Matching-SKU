import test from "node:test";
import assert from "node:assert/strict";

import { runMatchingRows } from "../src/features/matching/matcher.js";
import { preprocessSynonymRules } from "../src/features/synonym/ruleEngine.js";
import { extractPair } from "../src/features/matching/targetIndex.js";
import { buildCatalogForScope, mapCatalogValuesToOptions } from "../src/features/synonym/scopeCatalog.js";
import { createFilterFixture, createStateWithScope } from "./fixtures.js";

test("multi-select option filter excludes unselected target options", () => {
  const { transfer, target, state } = createFilterFixture();

  const rows = runMatchingRows({
    transfer,
    target,
    synonymMap: preprocessSynonymRules([]),
    state,
    masterMode: true
  });

  assert.equal(rows[0].Status, "AMBIGUOUS");
  assert.ok(rows[0].Candidates.includes("T-RED"));
  assert.ok(rows[0].Candidates.includes("T-BLUE"));
  assert.ok(rows[0].Candidates.includes("T-GREEN"));
  assert.ok(!rows[0].Candidates.includes("T-BLACK"));
});

test("transfer_sku filter source does not constrain target candidates", () => {
  const { transfer, target, state } = createFilterFixture();
  const scope = state.synonymContext.scopes.get("scope_1");
  scope.selectedFilterDataset = "source";

  const rows = runMatchingRows({
    transfer,
    target,
    synonymMap: preprocessSynonymRules([]),
    state,
    masterMode: true
  });

  assert.equal(rows[0].Status, "AMBIGUOUS");
  assert.ok(rows[0].Candidates.includes("T-RED"));
  assert.ok(rows[0].Candidates.includes("T-BLUE"));
  assert.ok(rows[0].Candidates.includes("T-GREEN"));
  assert.ok(rows[0].Candidates.includes("T-BLACK"));
});

test("attribute filter options are read from selected filter source dataset", () => {
  const { transfer, target, state } = createFilterFixture();
  state.transfer = transfer;
  state.target = target;
  const scope = state.synonymContext.scopes.get("scope_1");

  scope.selectedFilterDataset = "target";
  let catalog = buildCatalogForScope({
    state,
    scopeState: scope,
    role: "target",
    options: { applyAttributeFilter: false },
    extractPair
  });
  let colorOptions = mapCatalogValuesToOptions(catalog, "color");
  assert.ok(colorOptions.some((option) => option.value === "black"));

  scope.selectedFilterDataset = "source";
  catalog = buildCatalogForScope({
    state,
    scopeState: scope,
    role: "source",
    options: { applyAttributeFilter: false },
    extractPair
  });
  colorOptions = mapCatalogValuesToOptions(catalog, "color");
  assert.equal(colorOptions.length, 0);
});

test("unfiltered target catalog keeps all options even when attribute filter is active", () => {
  const { transfer, target, state } = createFilterFixture();
  state.transfer = transfer;
  state.target = target;
  const scope = state.synonymContext.scopes.get("scope_1");

  scope.selectedFilterDataset = "target";
  scope.selectedFilterAttribute = "color";
  scope.selectedFilterOptions = new Set(["red"]);

  const filteredCatalog = buildCatalogForScope({
    state,
    scopeState: scope,
    role: "target",
    options: { applyAttributeFilter: true },
    extractPair
  });
  const filteredColor = mapCatalogValuesToOptions(filteredCatalog, "color");
  assert.deepEqual(filteredColor.map((option) => option.value), ["red"]);

  const unfilteredCatalog = buildCatalogForScope({
    state,
    scopeState: scope,
    role: "target",
    options: { applyAttributeFilter: false },
    extractPair
  });
  const unfilteredColor = mapCatalogValuesToOptions(unfilteredCatalog, "color");
  assert.ok(unfilteredColor.some((option) => option.value === "black"));
});

test("multiple target filters narrow candidates with AND logic", () => {
  const { transfer, target } = createFilterFixture();
  const state = createStateWithScope({
    selectedMaster: "m1",
    selectedFilterDataset: "target",
    selectedFilterAttribute: "color",
    selectedFilterOptions: ["red", "blue"],
    selectedFilterAttribute2: "length",
    selectedFilterOptions2: ["10 cm"]
  });

  const rows = runMatchingRows({
    transfer,
    target,
    synonymMap: preprocessSynonymRules([]),
    state,
    masterMode: true
  });

  assert.equal(rows[0].Status, "AMBIGUOUS");
  assert.ok(rows[0].Candidates.includes("T-RED"));
  assert.ok(rows[0].Candidates.includes("T-BLUE"));
  assert.ok(!rows[0].Candidates.includes("T-GREEN"));
  assert.ok(!rows[0].Candidates.includes("T-BLACK"));
});
