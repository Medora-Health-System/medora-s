# MEDUI.D4A.4.2A — Existing Data Remediation Report Template

**Safety:** READ-ONLY analysis. Do **not** auto-delete, merge, or void encounters from this report alone.

## Purpose

Identify patients with more than one **OPEN** `INPATIENT` encounter so operators can review and remediate manually. Census projection (D4A.4.2A) suppresses duplicate *display* rows but leaves durable charts intact.

## Query (PostgreSQL / Prisma-compatible)

```sql
SELECT
  e."facilityId",
  e."patientId",
  pt."globalMrn" AS mrn,
  COUNT(*)::int AS open_inpatient_count,
  array_agg(e.id ORDER BY e."createdAt") AS encounter_ids,
  array_agg(COALESCE(e."roomLabel", '<null>') ORDER BY e."createdAt") AS room_labels,
  array_agg(e."createdAt" ORDER BY e."createdAt") AS created_ats,
  array_agg(e."admittedAt" ORDER BY e."createdAt") AS admitted_ats
FROM "Encounter" e
JOIN "Patient" pt ON pt.id = e."patientId"
WHERE e.status = 'OPEN'
  AND e.type = 'INPATIENT'
  AND e."facilityId" = :facilityId
GROUP BY e."facilityId", e."patientId", pt."globalMrn"
HAVING COUNT(*) > 1
ORDER BY open_inpatient_count DESC, mrn;
```

Optional PHI-safe export (IDs only):

```sql
SELECT e."facilityId", e."patientId", e.id AS encounter_id, e."roomLabel", e."createdAt", e."admittedAt"
FROM "Encounter" e
WHERE e.status = 'OPEN'
  AND e.type = 'INPATIENT'
  AND e."patientId" IN (
    SELECT "patientId" FROM "Encounter"
    WHERE status = 'OPEN' AND type = 'INPATIENT' AND "facilityId" = :facilityId
    GROUP BY "patientId" HAVING COUNT(*) > 1
  )
  AND e."facilityId" = :facilityId
ORDER BY e."patientId", e."createdAt";
```

## Per-row operator checklist

For each duplicate group:

| Field | Value |
|---|---|
| Facility ID | |
| Patient ID | |
| MRN (optional / controlled) | |
| Encounter A ID | |
| Encounter A roomLabel | |
| Encounter B ID | |
| Encounter B roomLabel | |
| Census winner (from diagnostic / ranking) | |
| Suppressed encounterId(s) | |
| Suspected cause | [ ] Legacy ED→IP type flip keeping bare room · [ ] Dual create race · [ ] Placement + direct admission · [ ] Other |
| Clinical owner decision | [ ] Keep A close/void B · [ ] Keep B close/void A · [ ] Transfer documentation then close · [ ] Escalate |
| Action taken (manual only) | |
| Actor / timestamp | |
| Audit reference | |

## Rules

1. Never delete patient records.
2. Prefer **close** or **cancel/void** inpatient lifecycle paths over hard delete.
3. Preserve audit trail and documentation on both charts until clinical owner decides.
4. After remediation, re-run census: `activeInpatient` should match occupied beds for the unit when every active patient has a bed.
5. Log census API warnings (`hospital_census_duplicate_prevention`) until residual count is zero.

## Related tooling

- `apps/api/scripts/audit-hospital-census-lineage.ts` (read-only lineage / bed audit)
- Census diagnostics code `DUPLICATE_OPEN_INPATIENT_ON_CENSUS`
