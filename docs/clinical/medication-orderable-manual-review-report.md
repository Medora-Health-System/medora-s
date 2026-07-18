# Manual Review Report

Post-completion manual review queue: **106** flagged rows (capped artifact list).

Typical reasons:

- `MISSING_STRENGTH_UNDERIVABLE` — no strength in name/product/sibling catalog
- `MISSING_FORM_UNDERIVABLE`
- `MISSING_ROUTE_UNDERIVABLE`
- `TEST_OR_NONCLINICAL` inactive fixtures
- `PRODUCT_BLOCKED` / `PRODUCT_RETIRED` (none expected in Wave MK imports)

These do not block certification when overall coverage ≥ 99% and common clinical search is 100%.

See `medication-orderable-catalog-completion-complete.json` → `manualReview`.
