export function createSynonymScopeElement(scopeId) {
  const el = document.createElement("section");
  el.className = "synonym-scope card collapsed";
  el.dataset.scopeId = scopeId;
  el.innerHTML = `
    <div class="card-head" data-action="toggle-scope">
      <h3>Master Code: <span data-field="scopeHeaderInfo">All Masters</span></h3>
      <div class="action-row">
        <button class="btn btn-secondary btn-sm" data-action="remove-master-scope" type="button">Remove Scope</button>
      </div>
    </div>
    <div class="synonym-scope-content">
      <div class="synonym-filter-grid">
        <div class="filter-block">
          <div class="filter-block-head">1. Scope</div>
          <div class="filter-group">
            <label>MasterCode (transfer)</label>
            <select class="synonym-filter-select" data-field="masterFilter"></select>
          </div>
          <div class="filter-group">
            <label>MasterCode (new_sku)</label>
            <select class="synonym-filter-select" data-field="targetMasterFilter"></select>
          </div>
        </div>
        <div class="filter-block">
          <div class="filter-block-head">2. Filter Candidates</div>
          <div class="filter-group">
            <label>Filter Source</label>
            <select class="synonym-filter-select" data-field="filterDataset"></select>
          </div>
          <div class="filter-group">
            <label>Attribute Filter</label>
            <select class="synonym-filter-select" data-field="attributeFilter"></select>
          </div>
          <div class="filter-group">
            <label>Options (Multi-select)</label>
            <select class="synonym-filter-select" data-field="optionFilter" multiple size="4"></select>
          </div>
        </div>
        <div class="filter-block">
          <div class="filter-block-head">3. Extra Target Filter</div>
          <div class="filter-group">
            <label>Attribute Filter 2 (Target)</label>
            <select class="synonym-filter-select" data-field="attributeFilter2"></select>
          </div>
          <div class="filter-group">
            <label>Options 2 (Multi-select)</label>
            <select class="synonym-filter-select" data-field="optionFilter2" multiple size="4"></select>
          </div>
        </div>
      </div>

      <div class="synonym-action-bar">
        <div class="synonym-action-info">
          <div class="scope-info-card" data-field="scopeInfo"></div>
          <div class="action-hint">
            <span class="action-step">Step 4</span>
            <span>Build synonym rules or bulk map options.</span>
          </div>
        </div>
        <div class="synonym-action-controls">
          <div class="filter-group">
            <label>Bulk Source Attr</label>
            <select class="synonym-filter-select" data-field="bulkSourceAttr"></select>
          </div>
          <div class="filter-group">
            <label>Bulk Target Attr</label>
            <select class="synonym-filter-select" data-field="bulkTargetAttr"></select>
          </div>
          <button class="btn btn-secondary" data-action="bulk-add-rules" type="button">Bulk Add</button>
          <button class="btn btn-primary" data-action="add-rule-row" type="button">Add Rule</button>
        </div>
      </div>

      <div class="synonym-table-wrap empty">
        <table class="synonym-table">
          <thead>
            <tr>
              <th>Source Attribute</th>
              <th>Source Pattern</th>
              <th>Target Attribute</th>
              <th>Target Value</th>
              <th>Match Type</th>
              <th style="width: 50px;"></th>
            </tr>
          </thead>
          <tbody data-field="synonymTbody"></tbody>
        </table>
      </div>
    </div>
  `;
  return el;
}

export function getScopeElement(scopeEl, field) {
  return scopeEl.querySelector(`[data-field='${field}']`);
}

export function getScopeAction(scopeEl, action) {
  return scopeEl.querySelector(`[data-action='${action}']`);
}

export function updateScopeTableVisibility(scopeEl, getScopeElementFn = getScopeElement) {
  const tableWrap = scopeEl.querySelector(".synonym-table-wrap");
  const tbody = getScopeElementFn(scopeEl, "synonymTbody");
  if (!tableWrap || !tbody) {
    return;
  }
  tableWrap.classList.toggle("empty", tbody.children.length === 0);
}

export function readMultiSelectValues(selectEl) {
  const values = new Set();
  Array.from(selectEl.selectedOptions).forEach((option) => {
    const value = String(option.value || "");
    if (value) {
      values.add(value);
    }
  });
  return values;
}

export function updateSelectOptions(selectEl, options, placeholder, preferredValue) {
  const normalizedPreferred = preferredValue == null ? "" : String(preferredValue).trim();
  const normalizedOptions = options || [];

  while (selectEl.firstChild) {
    selectEl.removeChild(selectEl.firstChild);
  }

  if (placeholder) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = placeholder;
    selectEl.appendChild(emptyOption);
  }

  normalizedOptions.forEach((option) => {
    const optionEl = document.createElement("option");
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    selectEl.appendChild(optionEl);
  });

  const optionValues = new Set(normalizedOptions.map((option) => option.value));
  if (normalizedPreferred && optionValues.has(normalizedPreferred)) {
    selectEl.value = normalizedPreferred;
    return;
  }

  if (placeholder) {
    selectEl.value = "";
    return;
  }

  if (normalizedOptions.length > 0) {
    selectEl.value = normalizedOptions[0].value;
  } else {
    selectEl.value = "";
  }
}

export function updateMultiSelectOptions(selectEl, options, preferredValues) {
  const preferred = preferredValues || new Set();
  while (selectEl.firstChild) {
    selectEl.removeChild(selectEl.firstChild);
  }

  options.forEach((option) => {
    const optionEl = document.createElement("option");
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    if (preferred.has(option.value)) {
      optionEl.selected = true;
    }
    selectEl.appendChild(optionEl);
  });
}
