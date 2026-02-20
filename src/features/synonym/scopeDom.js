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
        <div class="filter-group">
          <label>MasterCode Filter</label>
          <select class="synonym-filter-select" data-field="masterFilter"></select>
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

      <div class="synonym-action-bar">
        <div class="meta" data-field="scopeInfo"></div>
        <div style="flex-grow: 1;"></div>
        <div class="filter-group" style="min-width: 150px;">
          <select class="synonym-filter-select" data-field="bulkSourceAttr"></select>
        </div>
        <div class="filter-group" style="min-width: 150px;">
          <select class="synonym-filter-select" data-field="bulkTargetAttr"></select>
        </div>
        <button class="btn btn-secondary" data-action="bulk-add-rules" type="button">Bulk Add</button>
        <button class="btn btn-primary" data-action="add-rule-row" type="button">Add Rule</button>
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
