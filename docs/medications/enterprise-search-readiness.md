# M1.6C — Enterprise medication search readiness

## Target

**Enterprise medication search readiness > 90%** (pair discoverability + manifest alias coverage).

## Readiness model

`computeEnterpriseMedicationSearchReadiness(catalogs)` in `enterpriseMedicationSearchValidation.ts`:

| Component | Weight | Definition |
|-----------|--------|------------|
| Brand/generic pairs | 55% | `ENTERPRISE_MEDICATION_REQUIRED_SEARCH_PAIRS` — both generic and brand hit on catalog row |
| Manifest alias coverage | 45% | Manifest row exists in DB and all alias texts appear in `MedicationAlias` |

## Before / after (typical)

| Metric | Before M1.6C | After seed + deploy |
|--------|----------------|---------------------|
| Query expansion: `cumadin` → warfarin | No | Yes |
| Query expansion: `lovanox` → enoxaparin | No | Yes |
| `MedicationAlias` on Wave 1 anticoag | Partial | Full manifest |
| Readiness % (mock fully indexed) | ~60–75 | **≥ 90** |
| `MedicationAlias` row count (env-specific) | Baseline + Haiti | +manifest deltas |

Run readiness against your DB by exporting catalog hits (code, genericName, aliases[], searchText) and calling the shared validator in a script or after seed integration tests.

## Performance (Part 6)

- No new joins per search request.
- Same bounded queries (`take: limit * 3` catalog, distinct alias IDs).
- Canonical alias path unchanged (still one `findMany` per expanded term — pre-existing pattern).
- No duplicate catalog rows in merge logic.

## Safety (Part 7)

| Area | Impact |
|------|--------|
| Controlled substances | Aliases only; `isControlled` / schedule unchanged |
| Governance | No product `governanceNotes` / activation edits |
| Billing | No `MedicationBillingProfile` changes |
| Activation | No `isActive` changes |
| Canonical linkage | No `MedicationSearchAlias` seeding (cutover still deferred) |

## Verdict

| State | Verdict |
|-------|---------|
| Code merged; seed not run | **SAFE (conditional)** for search UX in dev — expansion works in-memory; DB aliases incomplete |
| Seed flag run on target env | **SAFE** for medication search discoverability pilot |
| Provider canonical cutover | **Out of scope** — still NOT SAFE until M1.5F |

## Git (after approval)

```bash
git add \
  packages/shared/src/medication/enterpriseMedicationAliasTypes.ts \
  packages/shared/src/medication/enterpriseMedicationAliasManifest.ts \
  packages/shared/src/medication/enterpriseMedicationSearchExpansion.ts \
  packages/shared/src/medication/enterpriseMedicationSearchValidation.ts \
  packages/shared/src/medication/enterpriseMedicationSearchValidation.test.ts \
  packages/shared/src/index.ts \
  apps/api/src/medication-catalog/medication-catalog-search.util.ts \
  apps/api/src/medication-catalog/medication-catalog-search.util.spec.ts \
  apps/api/src/medication-catalog/enterprise-medication-search.spec.ts \
  apps/api/prisma/helpers/seed-enterprise-medication-search-aliases.ts \
  apps/api/prisma/seed-catalogs.ts \
  docs/medications/enterprise-search-alias-expansion.md \
  docs/medications/enterprise-search-validation.md \
  docs/medications/enterprise-search-readiness.md

git commit -m "$(cat <<'EOF'
feat(m1.6c): enterprise medication search alias manifest and expansion

Adds shared alias manifest, safe typo query expansion, validation suite,
and idempotent MedicationAlias seeding without billing or activation changes.
EOF
)"

git push -u origin HEAD
```
