# M1.6C — Enterprise medication search & alias expansion

## Scope

**Medication program only.** Improves `CatalogMedication` + `MedicationAlias` discoverability and in-memory query expansion. Does **not** change billing engine, claims, governance rules, activation, provider-search cutover, or add new formulary waves.

## Search inventory (Part 1)

| Layer | Role |
|-------|------|
| **CatalogMedication** | Primary order-entry search (`MedicationCatalogService.search`) — `contains` on code, names, strength, `searchText`, route, class |
| **MedicationAlias** | Secondary match; distinct catalog IDs joined back to active catalog rows |
| **MedicationSearchAlias** | Canonical product/concept aliases — supplemental via `CatalogCanonicalReadService.findCatalogIdsViaCanonicalAlias` (active legacy-linked products only) |
| **Query expansion** | `expandMedicationSearchQuery` — brand/generic/typo hints before DB queries (no fuzzy cross-drug matching) |

### Resolution order (provider / pharmacy catalog search)

1. Normalize query (trim, lowercase).
2. Expand terms (`MEDICATION_SEARCH_QUERY_ALIASES` + M1.6C enterprise manifest).
3. `catalogMedication.findMany` on text fields.
4. `medicationAlias.findMany` on alias `contains`.
5. Canonical alias lookup (active `MedicationProduct` with `legacyCatalogMedicationId`).
6. Rank: exact → prefix → alias-only → contains; then essential + `sortPriority`.

Endpoints: `GET /catalog/medications/search` (same path for order and documentation `purpose`).

## Alias gap analysis (Part 2)

Prior gaps (M1.6B / data-quality audits):

| Gap | Remediation |
|-----|-------------|
| Warfarin ↔ Coumadin | Wave 1 manifest + typo `cumadin` |
| Enoxaparin ↔ Lovenox | Wave 1 + typo `lovanox` |
| Chronic ENRICH rows (amlodipine, HCTZ, levothyroxine, …) | Supplemental aliases on Haiti codes |
| ER staples (ceftriaxone, lorazepam, ondansetron, furosemide) | Supplemental manifest rows |
| Controlled (morphine, hydromorphone) | Supplemental shorthand / brand aliases |

Full gap register: computed at seed/validation time via `computeEnterpriseMedicationSearchReadiness`.

## Manifest (Part 3)

`packages/shared/src/medication/enterpriseMedicationAliasManifest.ts`

- Built from **Wave 1 formulary** aliases + **supplemental** Haiti/ER rows.
- Alias kinds: `BRAND`, `GENERIC`, `ABBREV`, `SHORTHAND`, `PATIENT_TERM`, `FR`, `MISSPELLING`.
- Typos: `ENTERPRISE_MEDICATION_SEARCH_TYPOS` — scoped per `catalogCode`.

## Misspelling support (Part 4)

`buildEnterpriseMedicationSearchQueryExpansions()` maps typo → canonical token **on the same drug only** (e.g. `cumadin` → `coumadin` → `warfarin`). No Levenshtein / cross-catalog fuzzy matching.

## Seed

`seed-enterprise-medication-search-aliases.ts` — idempotent `MedicationAlias` create + `searchText` merge.

Enable:

```bash
MEDORA_ENABLE_ENTERPRISE_MEDICATION_SEARCH_ALIASES=1 pnpm --filter @medora/api run prisma:seed-catalogs
```

**Migration:** NO  
**Seed:** YES (flag above)
