import { normalizeHeader, canonicalHeader } from "../../core/normalize.js";

export function detectColumns(headers) {
  const used = new Set();
  const errors = [];

  const sku = pickBestHeader(headers, scoreSkuHeader, used);
  if (sku) {
    used.add(sku);
  } else {
    errors.push("SKU column not detected.");
  }

  const master = pickBestHeader(headers, scoreMasterHeader);

  const attr1 = pickBestHeader(headers, (header) => scorePairHeader(header, "attribute", 1), used);
  if (attr1) {
    used.add(attr1);
  } else {
    errors.push("Pair #1 attribute column not detected.");
  }

  const opt1 = pickBestHeader(headers, (header) => scorePairHeader(header, "option", 1), used);
  if (opt1) {
    used.add(opt1);
  } else {
    errors.push("Pair #1 option column not detected.");
  }

  const attr2 = pickBestHeader(headers, (header) => scorePairHeader(header, "attribute", 2), used);
  if (attr2) {
    used.add(attr2);
  }

  const opt2 = pickBestHeader(headers, (header) => scorePairHeader(header, "option", 2), used);
  if (opt2) {
    used.add(opt2);
  }

  if ((attr2 && !opt2) || (!attr2 && opt2)) {
    errors.push("Pair #2 is incomplete at header level (attribute/option mismatch).");
  }

  return {
    sku,
    master,
    attr1,
    opt1,
    attr2,
    opt2,
    errors
  };
}

export function pickBestHeader(headers, scorer, usedSet) {
  let bestHeader = "";
  let bestScore = 0;

  headers.forEach((header) => {
    if (usedSet && usedSet.has(header)) {
      return;
    }

    const score = scorer(header);
    if (score > bestScore) {
      bestScore = score;
      bestHeader = header;
    }
  });

  return bestScore > 0 ? bestHeader : "";
}

export function scoreSkuHeader(header) {
  const normalized = normalizeHeader(header);
  const canonical = canonicalHeader(header);

  if (canonical === "sku") {
    return 100;
  }

  if (normalized === "sku") {
    return 95;
  }

  if (canonical.endsWith("sku") || canonical.startsWith("sku")) {
    return 90;
  }

  if (normalized.includes(" sku") || normalized.includes("sku ")) {
    return 85;
  }

  if (normalized.includes("sku")) {
    return 70;
  }

  return 0;
}

export function scoreMasterHeader(header) {
  const normalized = normalizeHeader(header);
  const canonical = canonicalHeader(header);

  if (canonical === "mastercode") {
    return 100;
  }

  if (normalized === "master code") {
    return 95;
  }

  if (canonical.includes("master") && canonical.includes("code")) {
    return 90;
  }

  if (normalized.includes("master")) {
    return 75;
  }

  return 0;
}

export function scorePairHeader(header, type, number) {
  const normalized = normalizeHeader(header);
  const canonical = canonicalHeader(header);
  const num = String(number);
  const hasType = type === "attribute"
    ? normalized.includes("attribute") || canonical.includes("attr")
    : normalized.includes("option") || canonical.includes("opt") || canonical.includes("value");
  const hasNum = normalized.includes(num) || canonical.includes(num);

  if (normalized === `#${num} ${type}` || normalized === `${num} ${type}`) {
    return 100;
  }

  if (normalized.includes(`#${num}`) && hasType) {
    return 95;
  }

  if (hasType && hasNum) {
    return 85;
  }

  if (canonical.includes(num)) {
    return 70;
  }

  return 0;
}
