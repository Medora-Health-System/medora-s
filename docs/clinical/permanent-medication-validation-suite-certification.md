# Permanent Medication Validation Suite Certification

**Certification ID:** `MEDUI.PERMANENT_MEDICATION_VALIDATION_SUITE`

## Allowed decisions

- `PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFIED`
- `PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFIED_WITH_REVIEW_ITEMS`
- `PERMANENT_MEDICATION_VALIDATION_SUITE_NOT_CERTIFIED`

## Requirements

- Critical + full + deployment runners implemented
- Real `MedicationCatalogService.search` path (no snapshot gate)
- Actionable failure classifications
- Machine-readable JSON + Markdown reports
- Controlled negative regression (isolated fixture)
- CI workflow integrated
- No patient/order/MAR/chart mutations
- Migration required: **NO**

## Command

```bash
pnpm medication:validate:unit
pnpm medication:validate:certify
```
