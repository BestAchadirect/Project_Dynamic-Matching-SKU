# Dynamic SKU Matching Tool

A browser-based tool to match SKU rows from `transfer_sku` to `new_sku` using Master Code grouping and attribute-based matching.

No install is required.
- Open `index.html` directly in your browser.
- Works offline.
- No backend, no database.

## Who This Is For
This tool is for business users who need to map old/source SKUs to new/target SKUs using Excel/Google Sheets data.

## What You Need
Prepare 2 TSV (tab-separated) tables copied from Excel/Google Sheets:
1. `transfer_sku`
2. `new_sku`

Each table must include headers in the first row.

## Required Columns (Auto-Detected)
The app auto-detects:
- SKU column (header containing `sku`)
- Master Code column (header containing `master`)
- Pair #1: Attribute + Option
- Pair #2: Attribute + Option

If required columns are missing, `Run Matching` stays disabled.

## Quick Start
1. Open `index.html`.
2. Paste `transfer_sku` TSV and click `Parse`.
3. Paste `new_sku` TSV and click `Parse`.
4. (Optional) Configure `Synonym Rules` by Master Code scope.
5. Click `Run Matching`.
6. Export results:
- `Copy Results as TSV`
- `Download as CSV`

## Synonym Rules (Optional)
Use synonym rules when source option text is different from target option text.

Each rule contains:
- Source Attribute
- Source Pattern
- Target Attribute
- Target Value
- Match Type (`EXACT`, `CONTAINS`, `REGEX`)

Priority order:
1. `EXACT`
2. `CONTAINS`
3. `REGEX`

If multiple rules match in the same priority, the first rule is used.

## Matching Behavior
- Matching is normalized (trim, lowercase, normalized spacing).
- Matching is restricted within the same Master Code group when Master Code is detected in both tables.
- Rows can end as `MATCHED`, `NO_MATCH`, `AMBIGUOUS`, or `BLOCKED`.

## Result Output
### On-screen result columns
- `SourceSku`
- `SourceAttributes1`
- `SourceAttributes2`
- `TargetSku`
- `TargetAttributes1`
- `TargetAttributes2`

### Copy Results as TSV
Copies the same 6 columns above.

### Download as CSV
- File contains columns:
  - `transfer_sku`
  - `new_sku`
  - `scope`
- `scope` is fixed to `Sales, Catalog`.
- File name format:
  - `sku_transfer_{generated-code}.csv`

## Notes and Limitations
- Supports only 2 attribute pairs.
- Input must be TSV (tab-separated), not comma-separated.
- Empty trailing rows/cells are handled.
- Duplicate/ambiguous matches are reported as `AMBIGUOUS`.

## Common Troubleshooting
- `Run Matching` is disabled:
  - Re-check parsed headers and required columns.
- No CSV rows downloaded:
  - CSV includes only rows with a non-empty matched `TargetSku`.
- Unexpected `NO_MATCH`:
  - Check Master Code values and synonym rules.

## Files
- `index.html`
- `style.css`
- `script.js`
