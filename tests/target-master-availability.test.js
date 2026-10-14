import assert from "node:assert/strict";
import { createEmptySynonymContext, buildTargetMasterOptionsForScope } from "../src/features/synonym/scopeState.js";

const ctx = createEmptySynonymContext();
ctx.targetMasterChoices = [
  { value: "aaa", label: "AAA" },
  { value: "bbb", label: "BBB" },
  { value: "ccc", label: "CCC" }
];
ctx.scopes.set("one", { id: "one", selectedTargetMaster: "aaa" });
ctx.scopes.set("two", { id: "two", selectedTargetMaster: "" });

function option(scopeId, code) {
  return buildTargetMasterOptionsForScope(ctx, scopeId).find((item) => item.value === code);
}
assert.equal(option("one", "aaa").disabled, false);
assert.equal(option("two", "aaa").disabled, true);
assert.match(option("two", "aaa").label, /Already selected/);
assert.equal(option("two", "bbb").disabled, false);

ctx.scopes.get("one").selectedTargetMaster = "bbb";
assert.equal(option("two", "aaa").disabled, false);
assert.equal(option("two", "bbb").disabled, true);
assert.equal(option("one", "bbb").disabled, false);

ctx.scopes.delete("one");
assert.equal(option("two", "bbb").disabled, false);
ctx.scopes.set("three", { id: "three", selectedTargetMaster: "ccc" });
assert.equal(option("two", "ccc").disabled, true);
ctx.scopes.clear();
assert.ok(buildTargetMasterOptionsForScope(ctx, "two").every((item) => !item.disabled));
console.log("target-master-availability.test.js passed");
