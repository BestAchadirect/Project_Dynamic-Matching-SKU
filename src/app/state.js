import { createEmptySynonymContext } from "../features/synonym/scopeState.js";

export const state = {
  transfer: null,
  target: null,
  masterMode: false,
  results: [],
  synonymContext: createEmptySynonymContext()
};
