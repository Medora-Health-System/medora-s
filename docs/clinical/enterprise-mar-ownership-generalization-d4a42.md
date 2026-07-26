# MEDUI.D4A.4.2 — Enterprise MAR Ownership Generalization

## 1. Problem statement

Inpatient / observation MAR and medication-pass queues read `Encounter.nurseAssignedUserId` (ED receiving nurse) instead of hospital bag `PRIMARY_RN`. Clinicians see the wrong assigned nurse on hospital MAR surfaces.

## 2. Fix boundary

Fixed at the **backend ownership boundary** by consuming certified D4A.4.1 `resolveActiveEncounterOwnership` via a thin MAR adapter — **not** a FacilityMarShiftTimeline UI patch that separately fetches hospital assignment.

## 3. Authority (inherited from D4A.4.1)

| Care setting | MAR nursing ownership |
|--------------|------------------------|
| EMERGENCY | ED `nurseAssignedUserId` |
| OBSERVATION / INPATIENT | Hospital bag `PRIMARY_RN` |
| STRICT (default) | Empty/missing bag → unassigned; ED columns must **not** silently win |
| LEGACY_COMPATIBILITY | Explicit env `ENTERPRISE_OWNERSHIP_COMPATIBILITY_MODE=LEGACY_COMPATIBILITY` only |

## 4. Nursing precedence

- **Authoritative:** `PRIMARY_RN` (hospital) / ED nurse (emergency)
- **BREAK_RN / CHARGE_RN / COVERING_PROVIDER:** not used for MAR assignee filter or header — bag has no durable structured “active break coverage” flag; promoting BREAK_RN would be speculative (deferred)

## 5. Query architecture (batch-compatible)

1. Facility assignee filter → one OPEN encounter `findMany` (ownership fields) → pure batch map → encounter ids
2. Dose / order-item queries use `encounterId: { in: ids }` (never Prisma `nurseAssignedUserId` alone for ownership)
3. Row / item projection resolves ownership from already-loaded encounter fields (no per-row ownership DB)
4. Encounter-scoped MAR still ignores assignee filter (unchanged)

## 6. Surfaces migrated

- MAR shift timeline ownership / `assignedNurse` metadata
- Medication-pass queue filtering + `nurseAssignedUserId` projection
- Facility mixed care-setting queues (ED + hospital in one board)
- Order-item fallback + canceled timeline placements (same assignee id set)
- Strict unassigned header/row behavior
- Minimal UI a11y for unassigned label (existing i18n EN/FR)

## 7. Preserved

- Due / overdue timing and dose status promotion
- Historical administrator (`administeredBy*`) enrichment
- Medication status / lifecycle actionability
- No ownership read audits; no writes from resolve

## 8. Security

Assignment ≠ chart access. Facility scope remains on Nest loads. Resolver output is operational ownership only.

## 9. Performance

- No N+1 ownership queries
- One encounter batch + existing dose query pattern
- Pure shared map over loaded fields

## 10. Deferred (explicit)

Order-cancel, OBS assign gaps, IP dual-write removal, attending lifecycle, billing, covering/break APIs, LPN/float, notifications, D4A.4.3.

## 11. Key files

| Path | Role |
|------|------|
| `packages/shared/.../enterpriseMarOwnershipD4a42.ts` | Thin MAR adapter |
| `apps/api/.../mar-enterprise-ownership.util.ts` | Nest batch assignee ids |
| `mar-shift-timeline.service.ts` / `medication-pass-queue.service.ts` | Consumers |
| `docs/clinical/enterprise-mar-ownership-generalization-d4a42-preimplementation.md` | Pre-impl audit |

## 12. Certification id

`MEDUI.ENTERPRISE_MAR_OWNERSHIP_GENERALIZATION.D4A4_2`
