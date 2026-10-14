import assert from "node:assert/strict";
import { createEmptySynonymContext } from "../src/features/synonym/scopeState.js";
import { removeAllSynonymMasterScopes, rebuildSynonymContext } from "../src/features/synonym/scopeContext.js";

function fixture() {
  const state = { transfer: null, target: null, masterMode: false, synonymContext: createEmptySynonymContext() };
  state.synonymContext.scopes.set("scope_1", { id: "scope_1" });
  state.synonymContext.scopes.set("scope_2", { id: "scope_2" });
  let clears = 0;
  let updates = 0;
  return {
    state,
    dom: { synonymScopesContainer: { replaceChildren() { clears += 1; } } },
    updateSynonymGlobalSummary() { updates += 1; },
    getClears() { return clears; },
    getUpdates() { return updates; }
  };
}

{
  const ctx = fixture();
  assert.equal(removeAllSynonymMasterScopes({ ...ctx, confirmRemoval: () => false }), 0);
  assert.equal(ctx.state.synonymContext.scopes.size, 2);
  assert.equal(ctx.getClears(), 0);
}
{
  const ctx = fixture();
  assert.equal(removeAllSynonymMasterScopes({ ...ctx, confirmRemoval: n => n === 2 }), 2);
  assert.equal(ctx.state.synonymContext.scopes.size, 0);
  assert.equal(ctx.getClears(), 1);
  assert.equal(ctx.getUpdates(), 1);
  assert.equal(ctx.state.synonymContext.autoMasterScopesApplied, true);
  let additions = 0;
  rebuildSynonymContext({
    state: ctx.state,
    addSynonymMasterScope() { additions += 1; },
    ensureTransferMasterScopes() {},
    refreshAllSynonymScopes() {}
  });
  assert.equal(additions, 0);
  ctx.state.synonymContext.autoMasterScopesApplied = false;
  rebuildSynonymContext({
    state: ctx.state,
    addSynonymMasterScope() { additions += 1; },
    ensureTransferMasterScopes() {},
    refreshAllSynonymScopes() {}
  });
  assert.equal(additions, 1);
}
console.log("scope-clear.test.js passed");
