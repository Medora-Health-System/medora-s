# MEDUI.D4B.4 — Enterprise Respiratory Therapy Workspace Certification

**Date:** 2026-07-26  
**Phase:** MEDUI.D4B.4  
**Decision:** **CERTIFIED WITH DOCUMENTED DEFERRALS**

---

## 1. Branch / HEAD / baseline

| Item | Value |
|------|-------|
| Branch | `d4b4-enterprise-respiratory-therapy-workspace` |
| Baseline after FF `origin/main` | `e5bb9e441` (Merge PR #55 D4B.3) |
| Working tree | Uncommitted D4B.4 implementation + docs (no commit per phase rules) |
| `merge-base --is-ancestor origin/main HEAD` | **0** (at baseline; local uncommitted changes after) |
| D4B.1 on HEAD / origin/main | ✔ `docs/certification/MEDUI.D4B.1-certification.md` |
| D4B.2 on HEAD / origin/main | ✔ `docs/certification/MEDUI.D4B.2-certification.md` |
| D4B.3 on HEAD / origin/main | ✔ `docs/certification/MEDUI.D4B.3-certification.md` |

---

## 2. Audit methodology

1. Repository-wide respiratory / oxygen / airway / ventilator / nebulizer / ABG / SpO2 / RT search.  
2. EDOC.12, oxygen order params, MAR respiratory response, procedure RT→RN proxy, D4B.1–3 inspection.  
3. RoleCode / board exclusion / EncounterNoteType gap review.  
4. Classification A–L (D4B.4 legend).  
5. Stop-condition review §46 before coding.  

Audit artifact: `docs/clinical/enterprise-respiratory-therapy-workspace-d4b4-audit.md`.

---

## 3. Files reviewed (representative)

- D4B.1 / D4B.2 / D4B.3 foundation + certifications  
- `respiratoryDocumentationPayloads.ts`, `ClinicalDocumentationRespiratoryForm.tsx`  
- `oxygenTherapyOrderParameters.ts`, `OxygenTherapyOrderForm.tsx`  
- MAR `respiratoryMedicationResponse*`, timeline projection  
- `enterpriseProcedureExecutionProfile.ts` (RT→RN proxy)  
- `enterpriseNursingClinicalWorkspaceD4b2` respiratory section  
- `enterpriseTechnicianNursingAssistantWorkspaceD4b3` vitals  
- Hospital board assignment exclusions  
- EncounterNote types / Prisma RoleCode  

---

## 4. Files changed (this phase)

### Docs
- `docs/clinical/enterprise-respiratory-therapy-workspace-d4b4-audit.md` (new)
- `docs/clinical/enterprise-respiratory-therapy-workspace-d4b4.md` (new)
- `docs/certification/MEDUI.D4B.4-certification.md` (this file)

### Shared
- `packages/shared/src/clinicalDocumentation/enterpriseRespiratoryTherapyWorkspaceD4b4.ts`
- `packages/shared/src/clinicalDocumentation/enterpriseRespiratoryTherapyWorkspaceD4b4.test.ts`
- `packages/shared/src/clinicalDocumentation/enterpriseClinicalDocumentRegistryD4b1.ts` (additive `rt.*` types)
- `packages/shared/src/index.ts` (export)

### API
- `apps/api/src/encounters/enterprise-respiratory-therapy-workspace.util.ts`
- `apps/api/src/encounters/enterprise-respiratory-therapy-workspace.util.spec.ts`

### Web
- `apps/web/src/features/clinical-documentation/EnterpriseRespiratoryTherapyWorkspaceD4b4.tsx`
- `apps/web/src/features/clinical-documentation/enterpriseRespiratoryTherapyWorkspaceD4b4.test.ts`
- `apps/web/src/features/emergency/EmergencyActiveWorkspaceView.tsx` (host)
- `apps/web/src/features/observation-workspace/ObservationWorkspacePanel.tsx` (host)
- `apps/web/src/features/inpatient-workspace/InpatientNursingAssessmentSection.tsx` (host)
- `apps/web/src/i18n/messages/enterpriseRespiratoryTherapyWorkspaceD4b4.en.ts`
- `apps/web/src/i18n/messages/enterpriseRespiratoryTherapyWorkspaceD4b4.fr.ts`
- `apps/web/src/i18n/messages/en.ts` / `fr.ts` (wire-up)
- `apps/web/src/i18n/messages/enterpriseClinicalDocumentD4b1.en.ts` / `.fr.ts` (RT document type labels)

---

## 5. Schema and migrations

| Item | Result |
|------|--------|
| Prisma schema changes | **None** |
| Migrations | **None** |
| Strategy | Adapters + workspace projection over existing EDOC / MAR / orders / vitals |

---

## 6. Role / capability matrix

Certified profiles: `NURSE_WITH_RT_PERMISSIONS` (MVP RN proxy), `TECHNICIAN_MEASUREMENT_ONLY`, `SUPPORT_READ_ONLY`; `RESPIRATORY_THERAPIST` reserved for future RoleCode.  
Capabilities: assessment, reassessment, oxygen, aerosol workflow, treatment response, airway, NIV, ventilator check (manual), bedside measurement, education/care-plan/handoff/discharge recommendation (limited), view orders/MAR/tech measurements.  
**Prohibited:** provider diagnosis, prescribe, provider sign, nursing overwrite, order mutate, lab verify, duplicate MAR admin, ungoverned vent change.  
`assignmentEqualsAuthorization: false`.

---

## 7. Respiratory registry

Selected coherent set listed in architecture §8. Certification id: `MEDUI.ENTERPRISE_RESPIRATORY_THERAPY_WORKSPACE.D4B4`.

---

## 8. Care-setting matrix (certified behavior)

| Capability | ED | Observation | Inpatient |
|------------|----|-------------|-----------|
| RT assessment | Focused (EDOC) | Yes | Comprehensive (EDOC) |
| RT reassessment | Event-driven | Yes | Yes |
| Oxygen support | Yes | Yes | Yes |
| Aerosol treatments | Ops/link as ordered | Yes | Yes |
| Treatment response | MAR adapter | Yes | Yes |
| Airway assessment | Yes | Yes | Yes |
| Artificial airway | Deferred section | Deferred | Deferred |
| Ventilator checks | Manual EDOC | Manual EDOC | Manual EDOC |
| NIV | Yes | Yes | Yes |
| High-flow | Deferred | Deferred | Deferred |
| Suctioning | Deferred | Deferred | Deferred |
| Airway clearance | — (hidden) | Deferred | Deferred |
| Bedside measurements | Peak flow EDOC | Yes | Yes |
| ABG collection | Deferred | Deferred | Deferred |
| Respiratory specimen | Deferred | Deferred | Deferred |
| Education | — (hidden) | Projection | Projection |
| Care-plan contribution | — | Projection | Projection |
| Handoff | Projection | Projection | Projection |
| Discharge recommendation | — | Projection | Projection |
| Tech measurements | D4B.3 projection | Yes | Yes |

---

## 9. Workspace sections implemented

Live: overview, active orders, assessment, reassessment, oxygen, aerosol, treatment response, airway, mechanical ventilation, NIV, bedside measurements, education, care-plan, handoff, discharge recommendations, technician measurements, documentation history.  
Deferred (visible with deferred messaging where capability allows): artificial airway, high-flow, suctioning, airway clearance, blood gas, specimens.

---

## 10. D4B.1 / D4B.2 / D4B.3 / MAR / order governance

| Concern | Conclusion |
|---------|------------|
| D4B.1 lifecycle | Reused; no independent RT engine |
| D4B.2 nursing | Preserved; no overwrite |
| D4B.3 technician | SpO₂ visible; tech performer preserved |
| MAR | Remains authoritative; response linkage only |
| Orders | Projection only; `createsProviderOrders: false` |
| Authorship | Server authors; RN-proxy flagged; reassignment safe |
| Authorization | Capability matrix + Nest RBAC; assignment ≠ auth |

---

## 11. Exact tests executed

| Command | Result |
|---------|--------|
| `npm run test --workspace=@medora/shared -- enterpriseRespiratoryTherapyWorkspaceD4b4 …` (incl. D4B.2/D4B.3, EDOC.12, oxygen) | **PASS** 62 tests |
| `npm run test --workspace=@medora/shared -- enterpriseClinicalDocumentFoundationD4b1` | **PASS** 22 tests |
| `npm run test --workspace=@medora/shared -- src/mar/` | **PASS** 356 tests |
| `npm run test --workspace=@medora/api -- enterprise-respiratory-therapy-workspace` | **PASS** 2 tests |
| `npm run test --workspace=@medora/api -- enterprise-technician-nursing-assistant-workspace` | **PASS** (regression) |
| `npm run test --workspace=@medora/web -- enterpriseRespiratoryTherapyWorkspaceD4b4` | **PASS** 2 tests |
| `npm run build --workspace=@medora/shared` | **PASS** |
| `npm run build --workspace=@medora/api` | **PASS** |
| `npm run build --workspace=@medora/web` | **PASS** |
| `npm run lint` (shared/api/web) | Placeholder only (`lint not configured yet`) — **not blocking** |

### Unavailable / not claimed

| Suite | Note |
|-------|------|
| Full e2e auth/rbac | Pre-existing Jest/ESM shared resolution issues (AGENTS.md) — infrastructure, not D4B.4 product defect |
| Dedicated `respiratoryMedicationResponse*.test.ts` filename filter | Covered via `src/mar/` suite including governance/workflow tests |

---

## 12. Performance / security / integrity / compatibility

- **Performance:** Single workspace summary builder; no per-section fetch design; MAR/census/D4B.2/D4B.3 unchanged.  
- **Security/privacy:** Facility-scoped hosts; no lab verify / order privilege escalation; HIPAA not claimed.  
- **Data integrity:** Nursing author preserved; MAR admin immutable in projections; vent ordered≠observed; recommendation≠order; no destructive migration.  
- **Compatibility:** Legacy hidden RT cards not revived; EncounterNoteType unchanged; additive D4B.1 registry only.

---

## 13. Documented deferrals

Ventilator-device integration · telemetry · automated vent import · device capnography/spirometry · PFT lab · advanced weaning · autonomous RT order sets · RT staffing/assignment engine · RT mobile · offline-first RT · home O₂ vendor · DME · competency/QC platforms · dedicated ABG/specimen/suction/trach/high-flow engines · Prisma RT RoleCode · EncounterNoteType RESPIRATORY · D4B.5 Rehab · D4B.6 full care plan · D4B.7–10.

---

## 14. Production-readiness limitations

- No dedicated RT RoleCode — RN proxy only.  
- Ventilator checks are manual EDOC, not device-synced.  
- Several clinically important RT event types remain deferred sections.  
- Thin projection util only — no full CRUD REST surface for every RT activity in this phase.

---

## 15. Release prerequisites

1. Human review of audit + architecture + this certification.  
2. Confirm French UI strings in RT workspace on ED/Obs/IP nursing hosts.  
3. Optional follow-up: RoleCode RT + EncounterNoteType (requires migration — out of D4B.4).  
4. Do **not** start D4B.5 until D4B.4 is accepted.

---

## 16. Final decision

**CERTIFIED WITH DOCUMENTED DEFERRALS**

**Exact recommended next phase:** **MEDUI.D4B.5 — Enterprise Rehabilitation Workspaces** (do not start now).

**Whether D4B.4 may be closed:** Yes, after human review and any required follow-up commit by the user (this phase did not commit).
