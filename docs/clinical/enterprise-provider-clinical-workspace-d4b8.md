# MEDUI.D4B.8 — Enterprise Provider Clinical Workspace (composition v2)

**Date:** 2026-07-26  
**Branch:** `d4b8-enterprise-provider-clinical-workspace`  
**Baseline HEAD:** `ee9b8e79b` (Merge PR #59 D4B.7)  
**Certification posture:** CERTIFIED WITH DOCUMENTED DEFERRALS  
**Architecture:** **Composition layer** — extends existing Medora engines; does **not** invent a parallel provider documentation / signature / persistence engine.  
**Next phase:** MEDUI.D4B.9 — Enterprise Procedure and Operative Documentation

---

## 1. Purpose

Deliver a governed **enterprise composition surface** for provider clinical work across Observation and Inpatient (limited Emergency projection/compatibility) that:

- Hosts / projects Patient Summary, H&P, Progress, Consult, A&P, Timeline, Orders/Results/Med/MAR (projection), Care Plans (projection), CM/SW/UR (projection), and read-only interdisciplinary review
- **Composes** `ProviderDocumentationWorkspace`, `inpatientProviderWorkspaceD4a26`, and `EncounterNote` / Provider Documentation Shell
- Reuses D4B.1 lifecycle and existing sign/cosign/amendment/correction/EIE paths

Without replacing POE, diagnosis/problem-list authority, MAR, med recon, final discharge, procedure notes, billing/CDI, or ambient AI.

---

## 2. Baseline

| Item | Value |
|------|-------|
| Branch | `d4b8-enterprise-provider-clinical-workspace` |
| HEAD / origin/main | `ee9b8e79ba5e0f887b6c4c5ea20ffd2b3c13d079` |
| Ancestor check | 0 |
| Ahead/behind | 0 0 |
| D4B.1–7 certifications | Present on baseline |
| Dirty-tree exception | Prior D4B.8 implementation only — revised under v2 composition rules |

---

## 3. Architecture (v2)

```
D4B.8 EnterpriseProviderClinicalWorkspace
  ├─ Registry: additive provider.* REFERENCE_VIRTUAL catalog
  ├─ Projection util (API): enterprise-provider-clinical-workspace.util.ts
  ├─ Authority / capability / census / distinguish helpers
  ├─ composeProviderDocumentationShellDocument → adaptProviderDocumentationShell…
  ├─ composeEncounterNoteProviderDocument → adaptEncounterNote…
  └─ Web host: EnterpriseProviderClinicalWorkspaceD4b8
       ├─ Optional documentationSlot / ProviderDocumentationWorkspace props
       ├─ ED: limited projection (does not replace ED editor)
       └─ Obs/IP: composition banners + host alongside D4A.26 / notes panels
```

**Durable write / sign paths remain:**

- `ProviderDocumentationWorkspace` + sign-provider-documentation
- `EncounterNote` sign / cosign / amendment / correction / EIE
- `inpatientProviderWorkspaceV1` JSON (D4A.26) for Obs/IP workflow state

---

## 4. What was removed from prior D4B.8 (parallel engines)

| Removed | Why |
|---------|-----|
| `openProviderNoteDraft` | Invented a parallel draft engine |
| `finalizeProviderNote` | Invented a parallel finalize/signature path |
| `attestProviderNote` / `cosignProviderNote` | Duplicate attestation/cosign engine |
| `amendProviderNote` / `enterProviderNoteInError` | Bypassed EncounterNote amendment/EIE |
| Local draft/finalize UI buttons | Competed with ProviderDocumentationWorkspace |

**Kept / rewired:** registry catalog, capability matrix, section model, census/projection helpers, authority invariants, API projection util, ED/Obs/IP host mounts.

---

## 5. Invariants

```
createsProviderOrders: false
recommendation != order
assessment != diagnosis
projection != mutation
assignment != authorization
provider review != CM/nursing/rehab/RT/care-plan ownership
independentSignatureEngine: false
createsIndependentDocumentationEngine: false
replacesProviderDocumentationWorkspace: false
replacesInpatientProviderWorkspaceD4a26: false
replacesEncounterNote: false
usesD4b1DocumentLifecycle: true
```

---

## 6. Registry (additive `provider.*`)

`provider.history_and_physical`, `provider.progress_note`, `provider.consult_note`, `provider.assessment_plan`, `provider.cross_cover`, `provider.event_note`, `provider.attestation`, `provider.addendum`, `provider.amendment`, `provider.correction`, `provider.entered_in_error`

Deferred: discharge summary, operative / procedure / anesthesia notes (D4B.9+).

---

## 7. Care-setting matrix

| Setting | Behavior |
|---------|----------|
| EMERGENCY | Limited projection / compatibility; existing ED provider UX preserved |
| OBSERVATION | Full composition surface + existing notes hosts |
| INPATIENT | Full composition + D4A.26 `InpatientProviderWorkspacePanel` |

---

## 8. API / frontend

- Shared: `enterpriseProviderClinicalWorkspaceD4b8.ts`
- API util only: `enterprise-provider-clinical-workspace.util.ts` (projection + identity rejection; no unrestricted mutation endpoints)
- Web: `EnterpriseProviderClinicalWorkspaceD4b8.tsx` + EN/FR i18n
- Hosts: Inpatient / Observation / Emergency workspace panels

---

## 9. Schema / migrations

**None.** Persistence via EncounterNote / Provider Documentation Shell / inpatientProviderWorkspaceV1 JSON / adapters / registry.

---

## 10. Documented deferrals

Procedure / operative / anesthesia notes; discharge summary; medication reconciliation; billing / claims / CDI / E/M coding; ambient AI scribe; autonomous diagnosis/ordering; deep live wiring of every projection feed into the shell (projections typed; hosts may supply data later).
