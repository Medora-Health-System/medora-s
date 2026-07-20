# Facility-Specific Medication Validation Guide

## Facilities

| Facility | Role |
|----------|------|
| Wayne Urgent Care Emergency Room | Preferred production probe facility |
| First active facility | Fallback for local/CI |

## Distinctions

| State | Meaning |
|-------|---------|
| Globally absent | No active CatalogMedication / alias |
| Facility-hidden | Present globally, filtered for facility |
| Facility-present non-orderable | Visible but missing orderable shape |
| Intentional formulary exclusion | Documented `intentionalExclusion` |

Runner prefers Wayne when `preferWayne` is enabled (default).
