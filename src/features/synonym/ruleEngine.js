import { normalizeValue, normalizeSynonymValue } from "../../core/normalize.js";

export function preprocessSynonymRules(rawRules) {
  const synonymMap = new Map();

  rawRules.forEach((rule, order) => {
    const masterKey = normalizeValue(rule.masterScope || "__ALL__") || "__all__";
    const attrNorm = normalizeValue(rule.attributeName);
    const patternNorm = normalizeSynonymValue(rule.sourcePattern);
    const targetAttrNorm = normalizeValue(rule.targetAttributeName);
    const targetValueNorm = normalizeValue(rule.targetValue);

    if (!attrNorm || !patternNorm || !targetAttrNorm || !targetValueNorm) {
      console.warn(`[Synonym] Invalid normalized values on row ${rule.rowNumber}.`);
      return;
    }

    if (!synonymMap.has(masterKey)) {
      synonymMap.set(masterKey, new Map());
    }

    const masterMap = synonymMap.get(masterKey);
    if (!masterMap.has(attrNorm)) {
      masterMap.set(attrNorm, {
        exact: [],
        contains: [],
        regex: [],
        exactPatternMap: new Map()
      });
    }

    const grouped = masterMap.get(attrNorm);
    const compiledRule = {
      order,
      rowNumber: rule.rowNumber,
      sourcePatternRaw: rule.sourcePattern,
      patternNorm,
      targetAttributeRaw: rule.targetAttributeName,
      targetValueRaw: rule.targetValue,
      targetAttrNorm,
      targetValueNorm
    };

    if (rule.matchType === "EXACT") {
      if (grouped.exactPatternMap.has(patternNorm)) {
        const existing = grouped.exactPatternMap.get(patternNorm);
        const sameTarget =
          existing.targetAttrNorm === compiledRule.targetAttrNorm &&
          existing.targetValueNorm === compiledRule.targetValueNorm;

        if (!sameTarget) {
          console.warn(
            `[Synonym] EXACT conflict for master "${masterKey}", attribute "${rule.attributeName}" and pattern "${rule.sourcePattern}" on row ${rule.rowNumber}. Using first match from row ${existing.rowNumber}.`
          );
        } else {
          console.warn(
            `[Synonym] Duplicate EXACT rule for master "${masterKey}", attribute "${rule.attributeName}" and pattern "${rule.sourcePattern}" on row ${rule.rowNumber}. Using first match from row ${existing.rowNumber}.`
          );
        }
        return;
      }

      grouped.exact.push(compiledRule);
      grouped.exactPatternMap.set(patternNorm, compiledRule);
      return;
    }

    if (rule.matchType === "CONTAINS") {
      grouped.contains.push(compiledRule);
      return;
    }

    try {
      compiledRule.regex = new RegExp(rule.sourcePattern, "i");
      grouped.regex.push(compiledRule);
    } catch (error) {
      console.warn(`[Synonym] Invalid REGEX on row ${rule.rowNumber}: ${error.message}`);
    }
  });

  return synonymMap;
}

export function applySynonymRuleToPair(pair, synonymMap, masterKey) {
  const normalizedMasterKey = normalizeValue(masterKey || "__ALL__") || "__all__";
  const searchKeys = normalizedMasterKey === "__all__"
    ? ["__all__"]
    : [normalizedMasterKey, "__all__"];

  let attributeHasRules = false;
  for (let i = 0; i < searchKeys.length; i += 1) {
    const masterMap = synonymMap.get(searchKeys[i]);
    if (!masterMap) {
      continue;
    }
    const grouped = masterMap.get(pair.attrNorm);
    if (!grouped) {
      continue;
    }

    attributeHasRules = true;
    const matchedRule = findMatchingRule(grouped, pair.optRaw);
    if (!matchedRule) {
      continue;
    }

    return {
      pairForLookup: {
        ...pair,
        attrNorm: matchedRule.targetAttrNorm,
        optNorm: matchedRule.targetValueNorm
      },
      matched: true,
      attributeHasRules: true
    };
  }

  return {
    pairForLookup: pair,
    matched: false,
    attributeHasRules
  };
}

export function findMatchingRule(grouped, sourceRawValue) {
  const sourceValueNorm = normalizeSynonymValue(sourceRawValue);
  const sourceValueRaw = String(sourceRawValue || "");

  for (let i = 0; i < grouped.exact.length; i += 1) {
    if (sourceValueNorm === grouped.exact[i].patternNorm) {
      return grouped.exact[i];
    }
  }

  for (let i = 0; i < grouped.contains.length; i += 1) {
    if (sourceValueNorm.includes(grouped.contains[i].patternNorm)) {
      return grouped.contains[i];
    }
  }

  for (let i = 0; i < grouped.regex.length; i += 1) {
    if (grouped.regex[i].regex.test(sourceValueRaw)) {
      return grouped.regex[i];
    }
  }

  return null;
}
