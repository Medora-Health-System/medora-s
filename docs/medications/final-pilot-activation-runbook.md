# M1.6H — Final Pilot Activation Runbook (Staging)

**Scope:** Single Tranche A medication on Railway staging.  
**Out of scope:** Production, bulk activation, billing enablement, provider search cutover (M1.5F).

---

## Preconditions

- [ ] Go/No-Go decision: `final-pilot-go-no-go-decision.md` = **GO**
- [ ] Staging counts: 134 enterprise, 0 pilot markers, 0 active enterprise
- [ ] Pharmacy / clinical sign-off obtained
- [ ] Railway backup confirmed (snapshot or documented restore point)
- [ ] Operator ID known for `MEDORA_ENTERPRISE_PILOT_ACTIVATED_BY`

---

## Step 1 — Pre-flight SQL (read-only)

```sql
SELECT COUNT(*) AS pilot_markers
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M16F_TRANCHE_A_PILOT%';
-- Expect: 0

SELECT code, "isActive", "governanceStatus"
FROM "MedicationProduct"
WHERE code = '<CATALOG_CODE>';
-- Expect: isActive=false, REVIEW_REQUIRED, no pilot marker
```

---

## Step 2 — Dry-run activation (mandatory)

```bash
DATABASE_URL="<railway-staging-url>" \
MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1 \
MEDORA_ENTERPRISE_PILOT_DRY_RUN=1 \
MEDORA_ENTERPRISE_PILOT_CATALOG_CODES="AMLODIPINE_5_MG_COMPRIME_ORAL" \
MEDORA_ENTERPRISE_PILOT_NOTE="Staging pilot dry-run — amlodipine" \
MEDORA_ENTERPRISE_PILOT_ACTIVATED_BY="<operator-id>" \
pnpm --filter @medora/api run prisma:seed-catalogs
```

**Expect log:** `requested=1`, `activated=1`, `dryRun=true`, `alreadyActivated=0`.

**Do not proceed if:** fail-closed error, `activated=0` with failures, or `skippedValidation>0`.

---

## Step 3 — Live activation (staging only)

Remove `MEDORA_ENTERPRISE_PILOT_DRY_RUN=1`:

```bash
DATABASE_URL="<railway-staging-url>" \
MEDORA_ENABLE_ENTERPRISE_FORMULARY_PILOT_ACTIVATION=1 \
MEDORA_ENTERPRISE_PILOT_CATALOG_CODES="AMLODIPINE_5_MG_COMPRIME_ORAL" \
MEDORA_ENTERPRISE_PILOT_NOTE="Staging pilot live — amlodipine" \
MEDORA_ENTERPRISE_PILOT_ACTIVATED_BY="<operator-id>" \
pnpm --filter @medora/api run prisma:seed-catalogs
```

**Expect log:** `activated=1`, `dryRun=false`.

**Never set** `MEDORA_ENTERPRISE_PILOT_ROLLBACK=1` in the same command.

---

## Step 4 — Post-activation SQL verification

```sql
SELECT code, "isActive", "governanceStatus",
       ("governanceNotes" LIKE '%ENTERPRISE_M16F_TRANCHE_A_PILOT%') AS has_pilot_marker,
       ("governanceNotes" ~ '"orderSearchEnabled"\s*:\s*true') AS order_search_on,
       ("governanceNotes" ~ '"billingEnabled"\s*:\s*true') AS billing_on
FROM "MedicationProduct"
WHERE code = 'AMLODIPINE_5_MG_COMPRIME_ORAL';

-- Expect: isActive=true, ACTIVATION_APPROVED, has_pilot_marker=true,
--         order_search_on=false, billing_on=false

SELECT COUNT(*) AS pilot_marked_active
FROM "MedicationProduct"
WHERE "governanceNotes" LIKE '%ENTERPRISE_M16F_TRANCHE_A_PILOT%'
  AND "isActive" = true;
-- Expect: 1 (only the activated med)

SELECT COUNT(*) AS other_active_enterprise
FROM "MedicationProduct"
WHERE ("governanceNotes" LIKE '%ENTERPRISE_M16B_WAVE1_FORMULARY%'
    OR "governanceNotes" LIKE '%ENTERPRISE_M16D_WAVE2_FORMULARY%')
  AND "isActive" = true
  AND code <> 'AMLODIPINE_5_MG_COMPRIME_ORAL';
-- Expect: 0
```

---

## Step 5 — Clinical UAT gate

- [ ] Medication visible only as intended in staging UI (no unexpected search cutover)
- [ ] No billing charges / claims impact observed
- [ ] Rollback drill scheduled or completed if UAT fails

---

## Fail-closed reminders

| Mistake | Result |
|---------|--------|
| Omit `MEDORA_ENTERPRISE_PILOT_CATALOG_CODES` | **Hard fail** — no activation |
| Duplicate / unknown / non–Tranche-A code | **Hard fail** |
| >15 codes | **Hard fail** |
| Re-run live on already-active med | `activated=0`, `alreadyActivated=1` (idempotent) |

---

## Rollback

If UAT fails or wrong med activated → `final-pilot-rollback-runbook.md`.

---

## First medication recommendation

**`AMLODIPINE_5_MG_COMPRIME_ORAL`** — Tranche A chronic oral antihypertensive; used in M1.6G/M1.6H drills; repaired rollback verified on staging.
