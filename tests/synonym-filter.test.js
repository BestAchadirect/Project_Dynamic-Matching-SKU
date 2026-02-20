import test from "node:test";
import assert from "node:assert/strict";

import { runMatchingRows } from "../src/features/matching/matcher.js";
import { preprocessSynonymRules } from "../src/features/synonym/ruleEngine.js";
import { createFilterFixture } from "./fixtures.js";

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
