# Medication Validation Failure Classification Guide

| Classification | Meaning |
|----------------|---------|
| `MISSING_FAMILY` | No provider search results for the family |
| `MISSING_BRAND_ALIAS` | Brand query fails while generic may work |
| `MISSING_GENERIC_ALIAS` | Generic query fails while brand may work |
| `MISSING_STRENGTH` | Required strength substring absent from results |
| `MISSING_FORM` | Required dosage form absent |
| `MISSING_ROUTE` | Required route absent |
| `HIDDEN_BY_RANKING` | Exact match outranked (e.g. tirzepatide over `jard`) |
| `HIDDEN_BY_LIMIT` | Sibling strength present in DB but not in top results |
| `FACILITY_FILTERED` | Globally present, hidden for facility |
| `INACTIVE` | Row exists but inactive for provider search |
| `NOT_ORDERABLE` | Visible but missing strength/form/route shape |
| `DUPLICATE_RESULT` | Unexpected duplicate canonical variants |
| `WRONG_FAMILY` | Results unrelated to requested family |
| `WRONG_BRAND_DISPLAY` | Brand display incorrect |
| `WRONG_GENERIC_DISPLAY` | Generic display incorrect |
| `API_FAILURE` | Search path threw / unavailable |
| `ENVIRONMENT_DATA_MISMATCH` | Code/catalog APPLY version skew |
| `BENCHMARK_VERSION_MISMATCH` | Environment behind benchmark version |

## Example failure block

```
Medication family: Biktarvy
Facility: Wayne Urgent Care Emergency Room
Query: "Biktar"
Expected: Biktarvy family results
Actual: no results
Failure type: MISSING_FAMILY
```
