import { GLOBAL_GROUP_KEY } from "../../core/constants.js";
import { normalizeValue, readCell } from "../../core/normalize.js";

export function extractPair(row, attrHeader, optHeader) {
  const attrRaw = readCell(row, attrHeader);
  const optRaw = readCell(row, optHeader);
  const attrNorm = normalizeValue(attrRaw);
  const optNorm = normalizeValue(optRaw);

  const complete = Boolean(attrNorm && optNorm);
  const incomplete = (!attrNorm && optNorm) || (attrNorm && !optNorm);
  const display = complete ? `${attrRaw}=${optRaw}` : "";

  return {
    attrRaw,
    optRaw,
    attrNorm,
    optNorm,
    complete,
    incomplete,
    display
  };
}

export function buildTargetIndex(target, masterMode) {
  const index = new Map();
  const allByGroup = new Map();
  const skuMeta = new Map();
  const d = target.detected;

  target.rows.forEach((row) => {
    const skuRaw = readCell(row, d.sku);
    const skuNorm = normalizeValue(skuRaw);
    if (!skuNorm) {
      return;
    }

    const rowMasterRaw = d.master ? readCell(row, d.master) : "";
    const groupKey = masterMode ? normalizeValue(rowMasterRaw) : GLOBAL_GROUP_KEY;

    if (!allByGroup.has(groupKey)) {
      allByGroup.set(groupKey, new Set());
    }
    allByGroup.get(groupKey).add(skuNorm);

    const pair1 = extractPair(row, d.attr1, d.opt1);
    const pair2 = extractPair(row, d.attr2, d.opt2);
    const attributeMap = new Map();
    [pair1, pair2]
      .filter((pair) => pair.complete)
      .forEach((pair) => {
        if (attributeMap.has(pair.attrNorm)) {
          return;
        }
        attributeMap.set(pair.attrNorm, {
          attrNorm: pair.attrNorm,
          attrRaw: pair.attrRaw,
          optNorm: pair.optNorm,
          optRaw: pair.optRaw
        });
      });

    if (!skuMeta.has(skuNorm)) {
      skuMeta.set(skuNorm, {
        sku: skuRaw,
        master: rowMasterRaw,
        attr1Display: pair1.display || "",
        attr2Display: pair2.display || "",
        attributeMap
      });
    }

    const usablePairs = [pair1, pair2].filter((pair) => pair.complete);

    if (!index.has(groupKey)) {
      index.set(groupKey, new Map());
    }

    const groupIndex = index.get(groupKey);
    usablePairs.forEach((pair) => {
      if (!groupIndex.has(pair.attrNorm)) {
        groupIndex.set(pair.attrNorm, new Map());
      }
      const attrIndex = groupIndex.get(pair.attrNorm);
      if (!attrIndex.has(pair.optNorm)) {
        attrIndex.set(pair.optNorm, new Set());
      }
      attrIndex.get(pair.optNorm).add(skuNorm);
    });
  });

  if (!allByGroup.has(GLOBAL_GROUP_KEY)) {
    allByGroup.set(GLOBAL_GROUP_KEY, new Set());
  }

  return { index, allByGroup, skuMeta };
}
