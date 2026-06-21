# ED Discharge — Real-World Pilot Validation Runbook

**Ticket:** `MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.3`  
**Purpose:** Obtain ≥500 real ED diagnosis rows for limited pilot qualification without synthetic data.

**Out of scope for this workflow:**
- Enabling `ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER`
- Changing production discharge routing
- Creating fake or synthetic pilot-qualification exports

---

## Phase 1 — RealDataSourceRecommendationReport

| Option | Pros | Cons | Pilot-valid? | Recommendation |
|--------|------|------|--------------|----------------|
| **1. Staging/production read-only database** | Real clinical traffic; repeatable; no local restore; reflects live encounter mix | Requires read-only credentials; network access; volume depends on environment maturity | **Yes** | **Preferred** when staging/production has ≥500 ACTIVE `EMERGENCY` diagnoses |
| **2. Restore staging/production dump locally** | Full offline control; no live DB dependency during validation; same real traffic as source | Dump handling policy; disk space; restore time; must not run migrations/seeds against restored copy used for audit | **Yes** | **Preferred fallback** when read-only remote access is unavailable or current remote DB has insufficient volume (e.g. 36 rows) |
| **3. Manual ED encounter entry** | Can increase row count quickly | Not representative bulk traffic; labor-intensive; selection bias; does not prove resolver at scale | **No** (unless entries are real ongoing clinic documentation, not certification fixtures) | **Not acceptable** for pilot qualification |

**Current baseline (local export artifact):**
- `exportSource`: `database`
- `totalRows`: **36**
- `uniqueIcdCodes`: **25**
- `requiredRows`: **500**
- `decision`: **NOT_READY_FOR_LIMITED_PILOT**

**Recommendation:** Use **staging/production read-only** if that environment eventually reaches ≥500 ED diagnoses. Until then, **restore a larger staging dump locally** (or wait for natural ED volume on the connected Railway staging DB). Do not substitute synthetic fallback exports.

---

## Phase 2 — ReadOnlyDatabaseSafetyChecklist

Use this checklist before every real-data connection or export.

### Credentials & connection

- [ ] Use **read-only** database user when connecting to staging/production (SELECT-only grants).
- [ ] Set `DATABASE_URL` inline or in `apps/api/.env` — never commit credentials.
- [ ] Confirm target host/database name matches intended environment (staging vs production).
- [ ] Prefer VPN/bastion or provider read-replica URL over writable primary when available.

### Forbidden operations (do not run against audit DB)

- [ ] **No** `prisma migrate dev` / `prisma migrate deploy`
- [ ] **No** `prisma db push`
- [ ] **No** `prisma db seed` / `pnpm prisma:seed`
- [ ] **No** write scripts (`create-admin`, `db:clear:patients`, backfills, imports)
- [ ] **No** application writes while connected to production read-only audit session

### Export safety (PHI minimization)

- [ ] Export only these fields per row:
  - diagnosis code (ICD)
  - diagnosis description
  - encounter type
  - patient age (derived from DOB at encounter time)
  - patient sex
  - encounter date (diagnosis `createdAt` date)
- [ ] **No** patient names, MRNs, addresses, phone, notes, provider names, or encounter IDs in export JSON
- [ ] Write output only to `exports/ed-diagnosis-shadow-audit.json` (gitignored / local artifact)
- [ ] Do not paste export rows into tickets, chat, or commits

### Pre-flight diagnostic

- [ ] Run read-only diagnostic before export:

```bash
DATABASE_URL="READ_ONLY_DATABASE_URL" pnpm --filter @medora/api run diagnose:ed-diagnosis-export
```

- [ ] Confirm `meetsPilotThreshold: true` before running full export

---

## Phase 3 — RealExportCommandRunbook

### Step 1 — Diagnose volume (read-only)

From repo root:

```bash
DATABASE_URL="READ_ONLY_DATABASE_URL" pnpm --filter @medora/api run diagnose:ed-diagnosis-export
```

Expected success signals:
- `databaseReachable: true`
- `edDiagnosesExportable` ≥ 500
- `meetsPilotThreshold: true`

### Step 2 — Export PHI-safe rows

```bash
DATABASE_URL="READ_ONLY_DATABASE_URL" pnpm --filter @medora/api run export:ed-diagnosis-shadow
```

Optional custom output path:

```bash
DATABASE_URL="READ_ONLY_DATABASE_URL" pnpm --filter @medora/api run export:ed-diagnosis-shadow /path/to/ed-diagnosis-shadow-audit.json
```

**Query behavior:**
- Filter: `Diagnosis.status = ACTIVE`, `Encounter.type = EMERGENCY`
- Built via `buildDiagnosisResolverShadowAuditQuery()` in `apps/api/src/encounters/diagnosis-resolver-shadow-audit.util.ts`
- Default `take`: up to 5000 rows (newest first)

### Step 3 — Verify export artifact

```bash
grep -E '"exportSource"|"totalRows"|"uniqueIcdCodes"' exports/ed-diagnosis-shadow-audit.json
```

**Required:**
| Field | Requirement |
|-------|-------------|
| `exportSource` | `"database"` |
| `totalRows` | ≥ 500 |
| `uniqueIcdCodes` | > current baseline (**25**) |

Example success:

```json
"exportSource": "database",
"totalRows": 842,
"uniqueIcdCodes": 118,
```

### Step 4 — Local restored dump (alternative)

1. Obtain approved staging dump (policy-compliant storage).
2. Start local Postgres (e.g. `infra/docker/docker-compose.yml`).
3. Restore dump to a **dedicated local database** used only for audit.
4. Point `DATABASE_URL` at local restored DB.
5. Run Steps 1–3 above.

---

## Phase 4 — ValidationRunbook

### LimitedPilotQualificationRecheck

After a qualifying export exists at `exports/ed-diagnosis-shadow-audit.json`:

#### 1. Regression test suite

```bash
pnpm --filter @medora/web exec vitest run src/features/emergency/providerDischargeRealWorldPilotQualification.test.ts
```

#### 2. Programmatic recheck (optional)

Load export in application code:

```typescript
import { readFileSync } from "node:fs";
import {
  loadEdDiagnosisShadowAuditExport,
  certifyLimitedPilotQualification,
} from "./providerDischargeRealWorldPilotQualification";

const file = loadEdDiagnosisShadowAuditExport(
  JSON.parse(readFileSync("exports/ed-diagnosis-shadow-audit.json", "utf8"))
);
const recheck = certifyLimitedPilotQualification(file);
```

#### Required thresholds (`certifyLimitedPilotQualification`)

| Threshold | Required |
|-----------|----------|
| `exportSource` | `database` |
| `totalRows` | ≥ 500 |
| Parity | ≥ 95% |
| Gated safe parity | 100% |
| Regression count | 0 |
| Unsafe routed | 0 |
| Adult→pediatric hard unsafe | 0 |
| OB/GYN sex violations | 0 |
| High-risk audit | passes |

**Decision outputs:** `READY_FOR_LIMITED_PILOT` or `NOT_READY` with explicit `blockers[]`.

#### 3. Release gate (before any pilot flag discussion)

```bash
pnpm --filter @medora/shared build
pnpm --filter @medora/api run build
pnpm --filter @medora/web exec tsc --noEmit
pnpm --filter @medora/web run build
pnpm --filter @medora/web exec vitest run \
  src/features/emergency/providerDischargeRealWorldParityValidation.test.ts \
  src/features/emergency/providerDischargeRealWorldPilotQualification.test.ts \
  src/features/emergency/providerDischargeEnterpriseCertification.test.ts \
  src/features/emergency/providerDischargeProductionSwitchReadiness.test.ts
```

---

## Phase 5 — RealWorldPilotDataResultTemplate

Copy and fill after a successful real export + recheck:

```markdown
# Real-World Pilot Data Result

**Ticket:** MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.3  
**Generated:** YYYY-MM-DDTHH:MM:SSZ

## 1. Data source used
- [ ] Staging read-only: `<host/db>`
- [ ] Production read-only: `<host/db>`
- [ ] Local restored dump: `<source dump id/date>`

## 2. Export source
`database` | `synthetic_tooling_fallback` (must be `database`)

## 3. Total ED diagnosis rows
___ / 500 required

## 4. Unique ICD codes
___ (baseline: 25)

## 5. Date range
min: ___ | max: ___

## 6. Parity %
___% (required ≥ 95%)

## 7. Gated safe parity %
___% (required 100%)

## 8. Regression count
___ (required 0)

## 9. Unsafe routed count
___ (required 0)

## 10. Generic fallback %
___%

## 11. Top 20 diagnoses
| ICD | Diagnosis | Count | Registry route | Family route | Outcome |
|-----|-----------|-------|----------------|--------------|---------|
| ... | ... | ... | ... | ... | ... |

## 12. High-risk audit
- unsafeRouted: ___
- passed: true / false
- conditions: (chest pain, stroke/TIA, PE, DVT, seizure, syncope, suicidal ideation, overdose, pregnancy bleeding, fever)

## 13. Pediatric audit
- hardUnsafeCount: ___
- passed: true / false

## 14. OB/GYN audit
- sexViolationCount: ___
- passed: true / false

## 15. Decision
- [ ] NOT_READY — blockers: ___
- [ ] READY_FOR_LIMITED_PILOT

## Guards (must remain true)
- [ ] `ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER` = false
- [ ] Production registry routing unchanged
- [ ] No discharge template modifications for this validation
```

---

## Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `totalRows: 36` | Young staging DB / low ED documentation volume | Use larger staging dump or wait for more real ED traffic |
| `exportSource: synthetic_tooling_fallback` | Export ran without DB | Fix `DATABASE_URL`; re-run real export |
| `edDiagnosesExportable` low but many EMERGENCY encounters | Missing diagnoses on charts | Clinical documentation gap — not fixable via resolver |
| Parity < 95% on real traffic | Resolver variance on live ICD mix | Review variance report; do not enable flag until blockers cleared |

---

## Related files

| File | Role |
|------|------|
| `apps/api/scripts/diagnose-ed-diagnosis-export.ts` | Read-only volume diagnostic |
| `apps/api/scripts/export-ed-diagnosis-shadow-audit.ts` | PHI-safe export writer |
| `apps/api/src/encounters/diagnosis-resolver-shadow-audit.util.ts` | Query builder + row mapper |
| `apps/web/src/features/emergency/providerDischargeRealWorldPilotQualification.ts` | Qualification orchestrator |
| `exports/ed-diagnosis-shadow-audit.json` | Local export artifact (not committed) |
