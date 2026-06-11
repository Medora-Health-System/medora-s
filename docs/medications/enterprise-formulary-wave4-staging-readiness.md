# Enterprise Formulary Wave 4 — Staging Readiness (M1.7C.2)

**Phase:** Staging seed readiness audit only — **no seed executed**  
**Date:** 2026-06-03  
**Manifest version:** M1.7C (227 entries post-remediation)

---

## Readiness Scores

| Dimension | Score | Verdict |
|-----------|-------|---------|
| **Seed Readiness** | **95 / 100** | SAFE to run Railway staging seed with `MEDORA_ENABLE_ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY=1` |
| **Activation Readiness** | **NOT READY** | All entries inactive + REVIEW_REQUIRED — intentional |
| **Search Readiness** | **NOT READY** | `orderSearchEnabled: false` on all Wave 4 products |
| **Governance Readiness** | **92 / 100** | Double RN 11/11 correct; pharmacy non-blocking; 12 high-alert flags flagged for pharmacy review at activation |

---

## Pre-Seed Checklist

| Check | Status |
|-------|--------|
| Manifest validation errors | **0** |
| Billing coverage | **227 / 227 (100%)** |
| Localization blocking issues | **0** |
| Duplicate catalog codes | **0** |
| Double RN policy violations | **0** |
| Hydromorphone IV push double RN | **None (correct)** |
| Search hardening validation | **Pass** |
| `isEssential` on Wave 4 entries | **All false** |
| Seed sets `isActive: false` | **Yes** (seed helper verified) |
| Seed sets `governanceStatus: REVIEW_REQUIRED` | **Yes** |
| Seed sets `requiresManualReview: true` | **Yes** |
| Seed sets `orderSearchEnabled: false` | **Yes** |
| Seed sets `billingEnabled: false` | **Yes** |
| Activation paths in seed | **None** |

---

## Staging Seed Command (do not run until approved)

```bash
MEDORA_ENABLE_ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY=1 \
  pnpm --filter @medora/api exec prisma db seed
```

Or targeted helper via catalog seed wiring in `seed-catalogs.ts`.

---

## Post-Seed SQL Validation (Part 9 — do not execute until after seed)

### 1. Wave 4 count

```sql
SELECT COUNT(*)
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%';
```

**Expected after seed:** 227 (or count of CREATE products + ENRICH markers on existing products)

### 2. Inactive validation

```sql
SELECT COUNT(*)
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%'
  AND "isActive" = true;
```

**Expected:** `0`

### 3. Blood product audit

```sql
SELECT code, "requiresDoubleSign", "isBloodProduct"
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M17C_WAVE4_ED_HOSPITAL%'
  AND "isBloodProduct" = true;
```

**Expected:** 5 rows — PRBC, FFP, platelets, cryoprecipitate, whole blood — all `requiresDoubleSign = true`

---

## Migration / Seed / SQL Required

| Action | Required? |
|--------|-------------|
| **Prisma migration** | **NO** — manifest-only + existing seed helper |
| **Staging seed** | **YES** — when approved, to load 227 entries on Railway |
| **Post-seed SQL** | **YES** — validation queries above (read-only) |

---

## Remaining Risks Before Production

1. **12 questionable high-alert flags** — pharmacy review at activation (see governance reconciliation doc)
2. **Search cutover** — requires separate activation phase; Levofloxacin generic substring still contains "levo" (mitigated: no bare `levo` alias, required pair uses `levophed`)
3. **Pediatric CREATE SKUs** (ondansetron ODT/solution) — no Haiti catalog row; seed creates new inactive catalog medications
4. **Clinical pharmacy sign-off** — Wave 4 remains REVIEW_REQUIRED until explicit activation workflow

---

## Verdict

**SAFE for Railway staging seed** (inactive, review-required, non-orderable).  
**NOT SAFE for provider ordering, search cutover, or production activation.**
