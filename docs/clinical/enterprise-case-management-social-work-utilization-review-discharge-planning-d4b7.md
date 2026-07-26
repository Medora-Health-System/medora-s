# MEDUI.D4B.7 — Enterprise Case Management, Social Work, Utilization Review, and Discharge Planning

**Date:** 2026-07-26  
**Branch:** `d4b7-enterprise-case-management-discharge-planning`  
**Baseline HEAD:** `c1da2bd3c` (Merge PR #58 D4B.6)  
**Certification posture:** CERTIFIED WITH DOCUMENTED DEFERRALS  
**Next phase:** MEDUI.D4B.8 — Enterprise Provider Clinical Workspace

---

## 1. Purpose

Deliver a governed enterprise care-coordination platform for Case Management (CM), Social Work (SW), Utilization Review (UR), length-of-stay awareness, medical-necessity documentation (placeholder criteria), authorization tracking, transparent readmission-risk rules, barriers, destination planning, transition planning, and interdisciplinary readiness projections — without authorizing discharge, mutating disposition/admission status, creating orders, rewriting D4B.6 care plans, or inventing proprietary InterQual/MCG / predictive AI.

## 2. Baseline

| Item | Value |
|------|-------|
| Branch | `d4b7-enterprise-case-management-discharge-planning` |
| HEAD / origin/main | `c1da2bd3cd590a732f30c80fcf59aeeec9948417` |
| Ancestor check | 0 |
| Ahead/behind | 0 0 |
| D4B.1–6 certifications | Present on baseline |
| Prior D4B.7 | Absent |

## 3. Audit findings

See `docs/clinical/enterprise-case-management-social-work-utilization-review-discharge-planning-d4b7-audit.md` (classifications A–Z). Safe strategy: zero-schema adapters + D4B.1 registry extensions + D4B.2–6 projections; prefer deferrals over unsafe breadth.

## 4. Existing care-coordination architectures

Reused/projected: D4B.1 lifecycle/disciplines; D4B.6 IDCP readiness; D4B.4/5 discharge recommendations; inpatient `dischargePlanning` ops; provider synthesis barrier keys; ED disposition/nursing readiness; observation disposition pathways; consult order codes as projections only. No prior governed CM/SW/UR engine.

## 5. Conceptual model

**Care-coordination episode** (adapter) owns barriers, destination plan, referrals, transition/follow-up/family participation, payer-auth tracking, LOS view, and rules-based readmission risk. **Documents** are D4B.1 REFERENCE_VIRTUAL types (`cm.*` / `sw.*` / `ur.*` / `care_coord.*`). **Dashboard** projects nursing/RT/rehab/tech/D4B.6/legacy ops. CM, SW, and UR remain distinct disciplines with distinct capability profiles.

## 6. Invariants

```
authorizesDischarge: false
mutatesFinalDisposition: false
createsProviderOrders: false
mutatesMar: false
mutatesDiagnosis: false
mutatesProblemList: false
mutatesAdmissionStatus: false
assignmentEqualsAuthorization: false
usesProprietaryInterQualOrMcg: false
usesPredictiveAi: false
rewritesD4b6CarePlans: false
usesD4b1DocumentLifecycle: true
independentSignatureEngine: false
```

## 7. Authority-boundary conclusion

Planning/recommendation surfaces never authorize discharge, mutate final disposition, create/mutate provider orders, alter MAR, mutate diagnosis/problem list, or change admission status. UI banners + typed false flags + tests enforce this.

## 8. Discipline-separation conclusion

CM / SW / UR capability registries and role profiles are distinct. Document adapters stamp discipline from type prefix. Dashboard does not collapse attribution.

## 9. Care-coordination episode

`openCareCoordinationEpisode` allowed in OBSERVATION / INPATIENT for CM/SW/UR profiles; rejected for EMERGENCY (`ED_LIMITED`). Episode carries assignment fields with `assignmentEqualsAuthorization: false`.

## 10. Case Management implementation

Capabilities: open/update episode, CM notes, barriers, destination, referral/placement, transition, follow-up, risk rules, projections. Document types: `cm.initial_assessment`, `cm.progress_note`, `cm.discharge_planning_note`.

## 11. Social Work implementation

Distinct SW capabilities and types: `sw.psychosocial_assessment`, `sw.progress_note`, `sw.barrier_note`. Sensitive content suppressed on dashboards (`suppressSensitiveSocialWorkOnDashboard`; virtual docs mark `suppressFullNarrativeOnDashboard`).

## 12. Utilization Review implementation

Distinct UR capabilities and types: `ur.admission_review`, `ur.continued_stay_review`, `ur.medical_necessity_documentation`. Criteria sources: facility policy, clinical documentation review, placeholder library — never proprietary InterQual/MCG.

## 13. Admission-status governance

`mutatesAdmissionStatus: false` on summary/episode. No admission pathway mutation APIs in this phase.

## 14. Payer and authorization tracking

`trackPayerAuthorization` adapter projects auth status + criteria source; `isNotClaimsSubmission: true`; rejects `usesProprietaryInterQualOrMcg: true`.

## 15. Length-of-stay management

`buildLosAvoidableDelayView` shows elapsed hours when known; `expectedLosHours: null`, `expectedLosInvented: false` — never invents expected LOS.

## 16. Avoidable-delay management

Open barriers linked into LOS view as avoidable-delay barrier ids; curated barrier registry (12 MVP codes).

## 17. Readmission-risk assessment

`assessReadmissionRiskRules` scores transparent weighted factors; `usesPredictiveAi: false`. Bands LOW/MODERATE/HIGH.

## 18. Barrier management

Curated registry + episode upsert with `sensitiveDetailSuppressed: true`.

## 19. Destination planning

Curated destinations; `planDestinationOnEpisode` rejects `authorizeDischarge: true`; destination plan flags `isRecommendationNotAuthorization` / `authorizesDischarge: false`.

## 20. Referral and placement tracking

Episode referral model marked `isNotFinalDisposition: true` (MVP section + model; full placement network deferred).

## 21. Transition-of-care planning

`care_coord.transition_plan` document type + episode `transitionPlan` with `isNotDischargeAuthorization: true`.

## 22. Follow-up planning

Episode follow-up plan with `isNotProviderOrder: true`.

## 23. Patient, family, and caregiver participation

Family participation adapter with `sensitiveDetailSuppressed: true`.

## 24. Sensitive social-work-content handling

Dashboard shows status/barrier codes only; SW psychosocial/progress virtual narratives replaced with restricted placeholder text; `legalRecordVisible/printExportEligible` false for sensitive SW types.

## 25. Care-setting matrix

| Setting | Behavior |
|---------|----------|
| EMERGENCY | Limited projection (overview + readiness/projections) |
| OBSERVATION | Full coordination dashboard |
| INPATIENT | Full dashboard + legacy ops projection |

## 26. Role and capability matrix

Profiles: CASE_MANAGER, SOCIAL_WORKER, UTILIZATION_REVIEWER, NURSE_COORDINATION_LIMITED, PROVIDER_REVIEW_ONLY, SUPPORT_READ_ONLY. All capabilities carry `assignmentGrantsCapability: false`, `authorizesDischarge: false`, `createsProviderOrders: false`.

## 27. Document registry

Additive D4B.1 REFERENCE_VIRTUAL types (11 curated). Reuses D4B.1 lifecycle — no second signature engine.

## 28. Care-coordination dashboard

Shared summary builder + web shell section nav (workflow / projection / legacy / deferred / ED_LIMITED modes).

## 29. Patient-level workspace

Hosted patient/encounter workspace sections: IP `dischargePlanning`, Obs `disposition`, ED nursing stack (limited).

## 30. ED behavior

Limited projection only; episode open rejected; ED banner in UI.

## 31. Observation behavior

Full episode/barrier/destination/UR/risk workflows; pathways list retained as projection under disposition.

## 32. Inpatient behavior

Full workflows + legacy `InpatientClinicalOpsPanel` discharge ops when flag live; D4B.7 shell primary.

## 33. D4B.1 integration

Virtual document adapters + registry extensions; `usesD4b1Lifecycle: true`; `independentSignatureEngine: false`.

## 34. D4B.2 nursing integration

`projectNursingCoordination` — nursing authorship preserved; not overwrite; not discharge auth.

## 35. D4B.3 technician integration

`projectTechCoordination` — performer preserved; projection only.

## 36. D4B.4 respiratory integration

`projectRtCoordination` — RT discharge recommendations projected; recommendation ≠ authorization.

## 37. D4B.5 rehabilitation integration

`projectRehabCoordination` — PT/OT/SLP recommendations projected; remain distinct.

## 38. D4B.6 care-plan integration

`projectD4b6CarePlanCoordination` + readiness compose; `rewritesD4b6CarePlans: false`; readiness ≠ authorization.

## 39. Provider-authority separation

No H&P / progress / MDM / discharge summary in D4B.7 — deferred to D4B.8. Provider profile is review-only.

## 40. Diagnosis and problem-list separation

`mutatesDiagnosis` / `mutatesProblemList` hard false; prohibited capabilities include diagnosis/problem-list mutation.

## 41. Provider-order separation

`createsProviderOrders: false`; consult orders remain order-engine domain; D4B.7 projects only.

## 42. Admission-status-authority separation

No admission-status mutation surfaces.

## 43. Final-disposition and discharge-authority separation

`authorizesDischarge` / `mutatesFinalDisposition` false; destination planning cannot authorize discharge; ED disposition engines untouched.

## 44. Authorship and performer-attribution conclusion

API `rejectClientControlledCareCoordinationIdentity`; discipline-stamped virtual docs; CM/SW/UR distinct; nursing/RT/rehab/tech projections must-not-overwrite.

## 45. Authorization conclusion

Assignment ≠ authorization. Nest RBAC remains authoritative. Capability registry does not grant discharge/order authority.

## 46. API / frontend

Thin Nest projection util (no Prisma writes). Web shell with D4B.1 primitives, French i18n, authority banners.

## 47. Schema and migrations

None. Zero-schema adapters + registry extensions.

## 48. Compatibility mechanisms

Legacy inpatient discharge ops projected; observation pathways retained; D4B.6 care plans projected; consult catalogs untouched.

## 49. Next phase

**MEDUI.D4B.8 — Enterprise Provider Clinical Workspace**

## 50. Final architecture decision

**CERTIFIED WITH DOCUMENTED DEFERRALS** — curated MVP coordination platform on D4B.1 with hard authority boundaries; proprietary UR engines, predictive AI, billing/claims, durable Prisma CM tables, final discharge engine, and provider documentation deferred.

---

### ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|--------|--------------------|--------|----------|---------------------|
| Clinical document lifecycle | D4B.1 | ✔ | ✔ registry types | ✔ |
| Interdisciplinary care plans | D4B.6 | ✔ project | — | ✔ |
| Nursing readiness | D4B.2 / EDOC | ✔ project | — | ✔ |
| Technician tasks | D4B.3 | ✔ project | — | ✔ |
| RT discharge recs | D4B.4 | ✔ project | — | ✔ |
| Rehab discharge recs | D4B.5 | ✔ project | — | ✔ |
| IP discharge ops | inpatientClinicalOpsV1 | ✔ project | ✔ host UX | ✔ |
| Disposition / close auth | ED / Obs engines | ✔ leave intact | — | ✔ |
| CM/SW/UR workspace | — | — | ✔ NEW domain | ✔ |
| Diagnosis / POE / MAR | existing engines | ✔ separate | — | ✔ |
