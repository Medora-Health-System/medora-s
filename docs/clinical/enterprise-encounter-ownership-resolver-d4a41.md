# MEDUI.D4A.4.1 — Enterprise Encounter Ownership Resolver

## 1. Problem statement

Medora has a dual source-of-truth for active clinical assignment:

- **ED:** `Encounter.physicianAssignedUserId` / `nurseAssignedUserId`
- **OBS / IP:** `admissionSummaryJson.enterpriseHospitalAssignmentV1`

Boards, census, and headers already project the hospital bag. MAR, medication-pass, and order-cancel still read ED columns. D4A.4.1 adds one care-setting-aware **read-only** resolver so future consumers share one authority policy — without a second persistence system.

## 2. Dual-source condition

| Lane | Authoritative store | Notes |
|------|---------------------|-------|
| Emergency | ED encounter columns | Unchanged |
| Observation / Inpatient | Hospital assignment bag | Workflow + clinical attending |
| Receiving / IP create | Dual-write still exists | Deferred — do not remove in 4.1 |

## 3. Authority policy by care setting

| Care setting | Authority |
|--------------|-----------|
| `EMERGENCY` | ED columns |
| `OBSERVATION` | Hospital bag (`PRIMARY_*`, attending, PCT, covering/break/charge) |
| `INPATIENT` | Hospital bag |
| `UNKNOWN` | Unresolved (no silent promotion) |

**STRICT (default):** empty/missing bag → unresolved hospital ownership; ED columns are **not** active hospital ownership.

**LEGACY_COMPATIBILITY (explicit):** per empty primary slot, may surface ED column IDs with `isLegacyFallback` + `LEGACY_ED_COLUMNS_COMPATIBILITY` — never writes, removable later.

### Care-setting consolidation

Classifiers:

- `resolveClinicalEncounterContext` — ignores bag; uses type + requested + billing
- `resolveHospitalCareSettingFromEncounter` / bag `careSetting` — bag first

**Conflict:** bag OBS vs clinical IP (or reverse) → diagnostic `CARE_SETTING_CLASSIFIER_CONFLICT`; ownership uses **bag.careSetting** when bag present. EMERGENCY clinical context always wins for ED authority.

Observation is **not** inferred from `Encounter.type` alone (type may be `INPATIENT` for OBS lanes).

## 4. Resolver contract

- Shared: `resolveActiveEncounterOwnership` / `resolveActiveEncounterOwnershipBatch`
- Nest: `EnterpriseAssignmentService.resolveActiveEncounterOwnership(Batch)`
- Output: `ActiveEncounterOwnershipProjection` (typed slots + diagnostics; no raw bag for UI)
- Certification id: `MEDUI.ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER.D4A4_1`

## 5. Compatibility policy

Typed `OwnershipCompatibilityMode`: `STRICT` | `LEGACY_COMPATIBILITY`. Fallback is visible, never persisted by resolve, and not used by new encounter write paths.

## 6. Historical authorship boundary

Resolver answers **active operational ownership** only. It must not reinterpret medication administrator, order author, result acknowledger, documentation author, cosigner, or witness.

## 7. Security boundary

**Assignment ≠ chart access.** Resolver output is not an ACL. Facility scope remains on Nest loads (`facilityId` + encounter id). Mutation role checks unchanged.

## 8. Performance boundary

- Shared path is pure over already-loaded fields (optional pre-parsed bag).
- Nest batch: one `findMany` + pure map — intended for future MAR / task-center lists.
- No N+1 assignment queries; no audit on read; no broad cache invalidation.

## 9. Tests added

- Shared characterization + unit: ED, IP conflict, OBS, empty/missing bag STRICT, LEGACY, classifier conflict, attending ≠ primary, PCT/covering/break/charge, invalid bag, batch, determinism
- Nest: ED/IP/OBS projection, LEGACY, batch findMany, no audit/writes, NotFound

## 10. Deferred migrations (D4A.4.2–4.5)

- MAR timeline
- Medication-pass queue
- Order-cancel policy
- Observation assignment gaps
- Inpatient creation dual-write removal
- Attending lifecycle writes
- Billing attribution
- Covering / break workflow APIs
- FacilityMarShiftTimeline UI patch
