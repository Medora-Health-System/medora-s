# MEDUI.D4B.5 — Enterprise Rehabilitation Workspaces Certification

**Date:** 2026-07-26  
**Phase:** MEDUI.D4B.5  
**Decision:** **CERTIFIED WITH DOCUMENTED DEFERRALS**

---

## 1. Branch / HEAD / baseline

| Item | Value |
|------|-------|
| Branch | `d4b5-enterprise-rehabilitation-workspaces` |
| Baseline HEAD | `6bd2b7305` (Merge PR #56 D4B.4) |
| Working tree | Uncommitted D4B.5 implementation + docs (no commit per phase rules) |
| `merge-base --is-ancestor origin/main HEAD` | **0** (at baseline) |
| D4B.1–4 certifications on HEAD / origin/main | ✔ |

---

## 2. Audit methodology

1. Repository-wide PT/OT/SLP/rehab/mobility/ADL/swallow/diet/therapy-referral search.  
2. RoleCode / profession / EncounterNoteType / board exclusion / taxonomy review.  
3. Nursing fall/mobility, stroke swallow, tech ADL, CARE orders, ops pendingPt/Ot, D4B.1–4 inspection.  
4. Classification A–M (D4B.5 legend).  
5. Stop-condition review before coding.  

Audit artifact: `docs/clinical/enterprise-rehabilitation-workspaces-d4b5-audit.md`.

---

## 3. Files reviewed (representative)

- D4B.1–4 foundation + certifications + RT peer pattern  
- `enterpriseClinicalDocumentContractD4b1.ts` / registry  
- Fall risk / mobility EDOC.14, D4B.2 fallMobility  
- Stroke swallow screen EDOC.4  
- D4B.3 mobility/ADL assistance  
- CARE catalog NPO / ambulation / swallowing  
- Hospital board exclusions PT/OT/SPEECH  
- `inpatientCarePlanV1` PT/OT stub  
- Discharge REHAB / pendingPt/Ot synthesis  

---

## 4. Files changed (this phase)

### Docs
- `docs/clinical/enterprise-rehabilitation-workspaces-d4b5-audit.md` (new)
- `docs/clinical/enterprise-rehabilitation-workspaces-d4b5.md` (new)
- `docs/certification/MEDUI.D4B.5-certification.md` (this file)

### Shared
- `packages/shared/src/clinicalDocumentation/enterpriseRehabilitationWorkspacesD4b5.ts`
- `packages/shared/src/clinicalDocumentation/enterpriseRehabilitationWorkspacesD4b5.test.ts`
- `packages/shared/src/clinicalDocumentation/enterpriseClinicalDocumentRegistryD4b1.ts` (additive `pt.*` / `ot.*` / `slp.*`)
- `packages/shared/src/index.ts` (export)

### API
- `apps/api/src/encounters/enterprise-rehabilitation-workspaces.util.ts`
- `apps/api/src/encounters/enterprise-rehabilitation-workspaces.util.spec.ts`

### Web
- `apps/web/src/features/clinical-documentation/EnterpriseRehabilitationWorkspacesD4b5.tsx`
- `apps/web/src/features/clinical-documentation/enterpriseRehabilitationWorkspacesD4b5.test.ts`
- `apps/web/src/features/emergency/EmergencyActiveWorkspaceView.tsx` (host)
- `apps/web/src/features/observation-workspace/ObservationWorkspacePanel.tsx` (host)
- `apps/web/src/features/inpatient-workspace/InpatientNursingAssessmentSection.tsx` (host)
- `apps/web/src/i18n/messages/enterpriseRehabilitationWorkspacesD4b5.en.ts`
- `apps/web/src/i18n/messages/enterpriseRehabilitationWorkspacesD4b5.fr.ts`
- `apps/web/src/i18n/messages/en.ts` / `fr.ts` (wire-up)
- `apps/web/src/i18n/messages/enterpriseClinicalDocumentD4b1.en.ts` / `.fr.ts` (rehab document type labels)

---

## 5. Schema and migrations

| Item | Result |
|------|--------|
| Prisma schema changes | **None** |
| Migrations | **None** |
| Strategy | Adapters + capability shell + D4B.1 registry extensions |

---

## 6. PT / OT / SLP capability matrices

Certified profiles: nurse-with-rehab-permissions (MVP proxy), reserved therapist profiles, rehab-assistant-limited (no full evaluator inheritance), support read-only.  
**Prohibited:** diagnosis, prescribe, nursing/tech/RT overwrite, order mutate, diet-order finalize, discharge authorize, DME procurement, lab verify, imaging interpret.  
`assignmentEqualsAuthorization: false`. Disciplines remain distinct (`collapsesPtOtSlp: false`).

---

## 7. Rehabilitation registry

Selected coherent `pt.*` / `ot.*` / `slp.*` types listed in architecture §12. Certification id: `MEDUI.ENTERPRISE_REHABILITATION_WORKSPACES.D4B5`.

---

## 8. Care-setting matrix (certified behavior)

| Capability | ED | Observation | Inpatient |
|------------|----|-------------|-----------|
| PT evaluation / treatment | Focused | Yes | Yes |
| PT mobility/gait | Yes | Yes | Yes |
| OT evaluation / treatment | Focused | Yes | Yes |
| OT ADL/IADL | — (hidden) | Yes | Yes |
| SLP communication | Yes | Yes | Yes |
| SLP swallowing eval | Yes | Yes | Yes |
| SLP diet recommendation | Yes (rec only) | Yes | Yes |
| Goals / education / equipment | Limited / hidden on ED | Yes | Yes |
| Discharge recommendation | — | Projection | Projection |
| Nursing mobility/fall project | Yes | Yes | Yes |
| Tech mobility/ADL project | Yes | Yes | Yes |
| Nursing swallow screen project | SLP/OT | Yes | Yes |
| Instrumental swallow | Deferred | Deferred | Deferred |
| Proprietary scales | Deferred | Deferred | Deferred |

---

## 9. Workspace sections implemented

Live (discipline-filtered): overview, related orders, evaluation, treatment, mobility/gait (PT), ADL/IADL (OT), communication (SLP), swallowing (SLP), diet recommendation (SLP), goals, education, equipment (PT/OT), nursing mobility/fall, tech mobility/ADL, nursing swallow, RT overlap, handoff, discharge recommendations, documentation history.

---

## 10. D4B.1–4 / order / authorship / authorization

| Concern | Conclusion |
|---------|------------|
| D4B.1 lifecycle | Reused; no independent rehab engine |
| D4B.2 nursing | Preserved; project only |
| D4B.3 technician | Preserved; project only |
| D4B.4 RT | Awareness only; no overwrite |
| Orders | Projection only; no POE creation |
| Diet | Recommendation ≠ order |
| Equipment | Recommendation ≠ procurement |
| Discharge | Recommendation ≠ authorization |
| Authorship | Server-authoritative; client identity rejected |
| Authorization | Capability + Nest RBAC; assignment ≠ auth |

---

## 11. Exact tests executed

| Command | Result |
|---------|--------|
| `npm run test --workspace=@medora/shared -- enterpriseRehabilitationWorkspacesD4b5 enterpriseRespiratoryTherapyWorkspaceD4b4 enterpriseTechnicianNursingAssistantWorkspaceD4b3 enterpriseNursingClinicalWorkspaceD4b2 enterpriseClinicalDocumentFoundationD4b1` | **PASS** 69 tests (5 files) |
| `npm run test --workspace=@medora/api -- enterprise-rehabilitation-workspaces enterprise-respiratory-therapy-workspace` | **PASS** 4 tests (2 suites) |
| `npm run test --workspace=@medora/web -- enterpriseRehabilitationWorkspacesD4b5 enterpriseRespiratoryTherapyWorkspaceD4b4` | **PASS** 4 tests (2 files) |
| `npm run build --workspace=@medora/shared` | **PASS** |
| `npm run build --workspace=@medora/api` | **PASS** |
| `npm run build --workspace=@medora/web` | **PASS** |
| `npm run lint` (shared/api/web) | Placeholder only (`lint not configured yet`) — **not blocking** |

### Unavailable / not claimed

| Suite | Note |
|-------|------|
| Full e2e auth/rbac | Pre-existing Jest/ESM shared resolution issues (AGENTS.md) — infrastructure, not D4B.5 product defect |
| Full suite without filters | Not required; targeted characterization mirrors D4B.4 |

---

## 12. Performance / security / integrity / compatibility

- **Performance:** Single summary builder per discipline; no per-section fetch; no unnecessary nursing/MAR/RT/census refetch.  
- **Security/privacy:** Facility-scoped hosts; reject client author/performer; no diet/discharge/DME privilege escalation; HIPAA not claimed.  
- **Data integrity:** Nursing/tech/RT authors preserved; recommendation≠authority invariants; no destructive migration.  
- **Compatibility:** EncounterNoteType / RoleCode unchanged; additive registry only.

---

## 13. Documented deferrals

Prisma PT/OT/SLP RoleCode · therapy EncounterNoteType · consult_pt/ot/slp catalog · IDDSI diet-order engine · instrumental swallow · proprietary scales · DME procurement/billing · scheduling/staffing · board therapy slots · full care plan (D4B.6) · CM/SW/UR/Nutrition/Pharmacy/Provider/Surgery workspaces · offline-first rehab.

---

## 14. Production-readiness limitations

- RN proxy only (no dedicated RoleCodes).  
- MVP structured contracts / shell — not every activity has a full live form engine.  
- Related CARE projection only (no dedicated therapy consult codes).  
- Deferred clinical platforms listed above.

---

## 15. Release prerequisites

1. Human review of audit + architecture + this certification.  
2. Confirm French UI for PT/OT/SLP modes on ED/Obs/IP hosts.  
3. Optional later migrations for RoleCode / consult catalog (out of D4B.5).  
4. Do **not** start D4B.6 until D4B.5 is accepted.

---

## 16. Final decision

**CERTIFIED WITH DOCUMENTED DEFERRALS**

**Exact recommended next phase:** **MEDUI.D4B.6 — Enterprise Interdisciplinary Care Plans** (do not start now).

**Whether D4B.5 may be closed:** Yes, after human review and any required follow-up commit by the user (this phase did not commit).
