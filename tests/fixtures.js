export const DETECTED_COLUMNS = {
  sku: "Sku",
  master: "Master Code",
  attr1: "#1 Attribute",
  opt1: "#1 Option",
  attr2: "#2 Attribute",
  opt2: "#2 Option",
  errors: []
};

export function createDataset(rows, detected = DETECTED_COLUMNS) {
  return {
    headers: ["Master Code", "Sku", "#1 Attribute", "#1 Option", "#2 Attribute", "#2 Option"],
    rows,
    detected,
    parseWithoutHeader: false
  };
}

export function createStateWithScope({
  selectedMaster = "m1",
  selectedFilterAttribute = "",
  selectedFilterOptions = []
} = {}) {
  const scope = {
    id: "scope_1",
    selectedMaster,
    selectedFilterAttribute,
    selectedFilterOptions: new Set(selectedFilterOptions),
    sourceCatalog: new Map(),
    targetCatalog: new Map()
  };

  return {
    transfer: null,
    target: null,
    masterMode: true,
    results: [],
    synonymContext: {
      masterChoices: [{ value: "m1", label: "M1" }],
      scopes: new Map([[scope.id, scope]]),
      nextScopeId: 2,
      autoMasterScopesApplied: true
    }
  };
}

export function createFilterFixture() {
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
    },
    {
      "Master Code": "M1",
      Sku: "T-GREEN",
      "#1 Attribute": "Length",
      "#1 Option": "10 cm",
      "#2 Attribute": "Color",
      "#2 Option": "Green"
    },
    {
      "Master Code": "M1",
      Sku: "T-BLACK",
      "#1 Attribute": "Length",
      "#1 Option": "10 cm",
      "#2 Attribute": "Color",
      "#2 Option": "Black"
    }
  ]);

  const state = createStateWithScope({
    selectedMaster: "m1",
    selectedFilterAttribute: "color",
    selectedFilterOptions: ["red", "blue", "green"]
  });

  return { transfer, target, state };
}
