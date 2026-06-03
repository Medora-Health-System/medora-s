# M1.6G — Pilot Stabilization Rollout Decision

**Date:** 2026-06-02  
**Decision authority:** M1.6G stabilization audit  
**Medications activated during audit:** **0**

---

## Decision

| Question | Answer |
|----------|--------|
| **READY TO ACTIVATE FIRST MEDICATION?** | **YES (conditional)** |
| **SAFE / NOT SAFE** | **SAFE (conditional)** |
| Target environment for first live activate | **Railway staging** |
| First medication | `AMLODIPINE_5_MG_COMPRIME_ORAL` |

---

## Conditions (all required)

1. **Single catalog code** in `MEDORA_ENTERPRISE_PILOT_CATALOG_CODES` — never omit.
2. **Dry-run first** with `MEDORA_ENTERPRISE_PILOT_DRY_RUN=1`.
3. **Operator attribution** via `MEDORA_ENTERPRISE_PILOT_ACTIVATED_BY`.
4. **Pilot note** via `MEDORA_ENTERPRISE_PILOT_NOTE`.
5. **Pharmacy sign-off** before removing dry-run flag.
6. **Post-activate verification** SQL (see below).
7. **Rollback drill** on staging before production.

---

## Approved rollout sequence

### Stage 0 — Stabilization (complete)

- M1.6G audit ✅
- Staging: 134 enterprise, 12 Tranche A pending, 0 active ✅

### Stage 1 — First medication (staging)

| Step | Action |
|------|--------|
| 1 | Dry-run amlodipine |
| 2 | Live activate amlodipine |
| 3 | Verify counts (1 active pilot, 11 pending) |
| 4 | Rollback amlodipine (drill) |
| 5 | Re-verify (0 active pilot, 12 pending) |

### Stage 2 — Staging tranche expansion

One medication per run, recommended order:

1. Amlodipine  
2. Metformin  
3. Omeprazole  
4. Losartan  
5. Lisinopril  
6. Pantoprazole  
7. Simvastatin  
8. Atorvastatin  
9. Hydrochlorothiazide  
10. Famotidine  
11. Finasteride  
12. Tamsulosin  

### Stage 3 — Production (deferred)

Not approved until Stage 1–2 complete with rollback drill and clinician UAT.

---

## Post-activate verification SQL

```sql
-- Expect 1 after first live activate
SELECT code, "isActive", "governanceStatus"
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M16F_TRANCHE_A_PILOT%';

-- Expect 0 — no provider search cutover
SELECT COUNT(*) FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M16F_TRANCHE_A_PILOT%'
  AND "governanceNotes" LIKE '%"orderSearchEnabled":true%';

-- Expect requiresManualReview still true
SELECT bp."requiresManualReview"
FROM "MedicationBillingProfile" bp
JOIN "MedicationPackage" pkg ON pkg.id = bp."packageId"
JOIN "MedicationProduct" p ON p.id = pkg."productId"
WHERE p.code = 'AMLODIPINE_5_MG_COMPRIME_ORAL';
```

---

## Not approved

- Bulk activation (all 12 via omitted catalog codes)
- Production first activation without staging rollback drill
- Enabling billing or order search during pilot activate
- Wave 2 medications in Tranche A scope
- Provider search cutover (M1.5F)

---

## Next phase

**M1.6H — First Pilot Medication Activation (Staging)** — execute Stage 1 with dry-run → live → rollback drill.
