# MEDUI.D4A.4.1 — Pre-Implementation Verification Note

**Branch:** `d4a4-1-enterprise-ownership-resolver` (from `d4a3-3-inpatient-header-nursing-consolidation` @ `1e387cf89`)
**Mode:** Verification before code edits
**Date:** 2026-07-24

## 1. Confirmed files to modify / add

| Path | Purpose |
|------|---------|
| `packages/shared/src/encounters/enterpriseEncounterOwnershipResolverD4a41.ts` | **Add** — pure shared ownership resolver |
| `packages/shared/src/encounters/enterpriseEncounterOwnershipResolverD4a41.test.ts` | **Add** — characterization + unit tests |
| `packages/shared/src/index.ts` | Export resolver |
| `apps/api/src/encounters/enterprise-assignment.service.ts` | Nest read-only adapter + batch API |
| `apps/api/src/encounters/enterprise-assignment.service.spec.ts` | Nest resolver tests (extend) |
| `docs/clinical/enterprise-encounter-ownership-resolver-d4a41.md` | Architecture note |
| `docs/certification/MEDUI.D4A.4.1-certification.md` | Certification report |

**Do not modify (deferred):** MAR timeline, medication-pass, order-cancel, IP dual-write, billing, FacilityMarShiftTimeline UI.

## 2. Existing helpers to reuse

- `readHospitalAssignmentBag`, `normalizeHospitalAssignmentBag`, `projectHospitalBoardAssignments`
- `resolveHospitalCareSettingFromEncounter` (`enterpriseAssignmentEngineD4a30.ts`)
- `resolveClinicalEncounterContext`, `readRequestedEncounterTypeFromAdmissionSummary` (`clinicalEncounterIdentity.ts`)
- Nest `EnterpriseAssignmentService` (ED + hospital mutators remain write paths)

## 3. Existing types to extend / compose

- `EnterpriseAssignmentCareSetting` = `EMERGENCY | OBSERVATION | INPATIENT`
- `EnterpriseHospitalAssignmentBagV1` workflow slots + clinical attending
- `EnterpriseWorkflowAssignmentSlot` / board roles
- No new Prisma models / bags / tables

## 4. Current care-setting resolution path

| Helper | Inputs | OBS vs IP signal |
|--------|--------|------------------|
| `resolveClinicalEncounterContext` | `type`, `requestedEncounterType`, `billingClassification`, placement | **Ignores** assignment bag |
| `resolveHospitalCareSettingFromEncounter` | bag `careSetting` first, else type + requested | **Prefers** bag |

### Classifier conflict (documented before consolidate)

If bag `careSetting === "OBSERVATION"` but `requestedEncounterType` / billing / clinical context says `INPATIENT` (or reverse), the two helpers disagree.

**Ownership consolidation policy (explicit):**

1. `type === EMERGENCY` / clinical context `EMERGENCY` → **EMERGENCY** (ED columns).
2. Else if hospital bag present → **bag.careSetting** (assignment engine dimension).
3. Else → `resolveClinicalEncounterContext` when OBS/IP.
4. Else → `resolveHospitalCareSettingFromEncounter`.
5. Else → `UNKNOWN` → unresolved ownership.

When (2) and clinical context disagree on OBS vs IP, emit diagnostic `CARE_SETTING_CLASSIFIER_CONFLICT` and still use bag for assignment authority.

## 5. Proposed resolver I/O

**Input (pure):**

- `type`, `billingClassification?`, `admissionSummaryJson?`
- `physicianAssignedUserId?`, `nurseAssignedUserId?`
- `compatibilityMode?: "STRICT" | "LEGACY_COMPATIBILITY"` (default **STRICT**)

**Output (typed projection):**

- `careSetting`, `authoritySource`
- Slots: primary provider/RN, clinical attending, PCT, covering/break/charge
- Per-slot: `userId`, `source`, `assignmentStatus`, `isLegacyFallback`, `hasSourceConflict`, `diagnosticReason`
- Aggregate `diagnostics[]` (no PHI)

**Nest adapter:** load facility-scoped encounter fields → call shared → **no audit / no writes**; batch `findMany` + map.

## 6. Risks

| Lane | Risk | Mitigation |
|------|------|------------|
| ED | Accidental bag preference | EMERGENCY always uses columns |
| OBS/IP | Silent ED fallback | STRICT returns UNASSIGNED; legacy only when mode set |
| OBS | Misclassify as ED via `type` alone | Bag + clinical identity; not type alone |
| Authorship | Confusing active ownership with admin/order author | Separate concepts; docs + comments |
| Security | Treating assignment as chart ACL | Explicit non-ACL boundary in code/docs |
| Perf | Per-row DB in lists | Pure shared + batch Nest API |

## 7. Tests before consumer integration

Characterization / unit (shared): ED columns; IP conflict bag wins; OBS bag with type INPATIENT; empty bag STRICT; missing bag STRICT; LEGACY_COMPATIBILITY; classifier conflict diagnostic; attending ≠ primary; PCT/covering/break/charge; no mutation.

Nest: select fields, ED/IP/OBS projection, no audit/writes, batch, facility scope.

Regression: existing D4A.3.0 assignment + board projection tests unchanged.
