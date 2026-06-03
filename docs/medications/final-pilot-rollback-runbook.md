# M1.6H — Final Pilot Rollback Runbook (Staging)

**Scope:** Revert Tranche A pilot activation on Railway staging.  
**Preserves:** Enterprise Wave 1/2 markers, billing profiles, aliases, catalog linkage.

---

## When to rollback

- Staging UAT failure
- Wrong medication activated
- Pharmacy requests pause before search/billing phases
- End of pilot test — return to `REVIEW_REQUIRED`

---

## Preconditions

- [ ] Know the activated `CATALOG_CODE` (e.g. `AMLODIPINE_5_MG_COMPRIME_ORAL`)
- [ ] **Do not** set `MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1` with rollback

---

## Step 1 — Pre-rollback SQL

```sql
SELECT code, "isActive", "governanceStatus",
       ("governanceNotes" LIKE '%ENTERPRISE_M16F_TRANCHE_A_PILOT%') AS has_pilot_marker
FROM "MedicationProduct"
WHERE code = '<CATALOG_CODE>';

SELECT COUNT(*) AS pilot_marked_any
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M16F_TRANCHE_A_PILOT%';
```

---

## Step 2 — Dry-run rollback (mandatory)

```bash
DATABASE_URL="<railway-staging-url>" \
MEDORA_ENTERPRISE_PILOT_ROLLBACK=1 \
MEDORA_ENTERPRISE_PILOT_DRY_RUN=1 \
MEDORA_ENTERPRISE_PILOT_CATALOG_CODES="AMLODIPINE_5_MG_COMPRIME_ORAL" \
pnpm --filter @medora/api run prisma:seed-catalogs
```

**Expect:** `rolledBack=1`, `dryRun=true`, `failures=0`.

---

## Step 3 — Live rollback

```bash
DATABASE_URL="<railway-staging-url>" \
MEDORA_ENTERPRISE_PILOT_ROLLBACK=1 \
MEDORA_ENTERPRISE_PILOT_CATALOG_CODES="AMLODIPINE_5_MG_COMPRIME_ORAL" \
pnpm --filter @medora/api run prisma:seed-catalogs
```

**Expect:** `rolledBack=1`, `dryRun=false`.

**Fail-closed:** If wrong `CATALOG_CODE` but pilot markers remain → seed throws; **no partial silent failure**.

---

## Step 4 — Post-rollback SQL verification

```sql
SELECT code, "isActive", "governanceStatus",
       ("governanceNotes" LIKE '%ENTERPRISE_M16F_TRANCHE_A_PILOT%') AS has_pilot_marker,
       ("governanceNotes" ~ '"orderSearchEnabled"\s*:\s*true') AS order_search_on,
       ("governanceNotes" ~ '"billingEnabled"\s*:\s*true') AS billing_on
FROM "MedicationProduct"
WHERE code = 'AMLODIPINE_5_MG_COMPRIME_ORAL';
-- Expect: isActive=false, REVIEW_REQUIRED, has_pilot_marker=false,
--         order_search_on=false, billing_on=false

SELECT COUNT(*) AS pilot_marked_any
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M16F_TRANCHE_A_PILOT%';
-- Expect: 0

SELECT COUNT(*) AS pilot_marked_active
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M16F_TRANCHE_A_PILOT%'
  AND "isActive" = true;
-- Expect: 0

SELECT mp.code, mp."isActive" AS product_active, mc."isActive" AS concept_active,
       mpack."isActive" AS package_active
FROM "MedicationProduct" mp
JOIN "MedicationConcept" mc ON mc.id = mp."conceptId"
LEFT JOIN "MedicationPackage" mpack ON mpack."productId" = mp.id AND mpack."isDefaultForProduct" = true
WHERE mp.code = 'AMLODIPINE_5_MG_COMPRIME_ORAL';
-- Expect: all false
```

---

## Step 5 — Idempotent re-run

Second rollback with no pilot markers:

**Expect:** `rolledBack=0`, no error (no markers remain).

---

## Rollback all pilot-marked products (omit catalog code)

Only when multiple pilots were activated (not recommended):

```bash
MEDORA_ENTERPRISE_PILOT_ROLLBACK=1 \
pnpm --filter @medora/api run prisma:seed-catalogs
```

Prefer **explicit `MEDORA_ENTERPRISE_PILOT_CATALOG_CODES`** for one-med-at-a-time discipline.

---

## M1.6H.1 lesson

`MEDORA_ENTERPRISE_PILOT_ROLLBACK=1` must be used — rollback function is only invoked via `seed-catalogs.ts`. See `pilot-rollback-ops-fix-m1.6h.md`.
