# MEDUI.D4B.2 — Enterprise Nursing Clinical Workspace

**Date:** 2026-07-26  
**Branch:** `d4b2-enterprise-nursing-clinical-workspace`  
**Certification id:** `MEDUI.ENTERPRISE_NURSING_CLINICAL_WORKSPACE.D4B2`  
**Prerequisite:** D4B.1 certified (`MEDUI.D4B.1`) on `origin/main`  
**Mode:** Nursing workspace shell + D4B.1 adapters; **no Prisma migration**; no independent nursing lifecycle engine

---

## 1. Purpose

Provide one care-setting-aware enterprise nursing clinical workspace across Emergency, Observation, and Inpatient that **consumes** the D4B.1 clinical-document foundation and **composes** existing nursing engines (admission, reassessment, handoff, EDOC) without forking signature, version, amendment, or longitudinal history architecture.

---

## 2. Existing-state summary

Nursing documentation already spans:

| Store / engine | Role |
|----------------|------|
| Med/Surg nursing admission (D4A.1) | Comprehensive IP/Obs admission CAS |
| ED reassessment engine | Shared live reassessment (ED + Obs + IP) |
| ErHandoffV1 | Shift/transfer handoff |
| EDOC cards | Pain, fall, skin, devices, I&O, restraint, education, care plan, neuro/resp/cardiac |
| EncounterNote nursing | Narrative notes (D4B.1 reference lifecycle) |
| MAR / vitals / team execution | Operational (not document engines) |

See audit: `docs/clinical/enterprise-nursing-clinical-workspace-d4b2-audit.md`.

---

## 3. Audit findings

Competing architectures are **adaptable**. Class J duplicates (admission vs EDOC19; EvalV1 vs reassessment) are normalized by **authoritative source choice**, not deletion. Rapid reassessment fake-save is **not durable** and remains unmounted. No Class I silent overwrite found on note/EDOC/admission paths.

---

## 4. Nursing workspace information architecture

Shared section model in `enterpriseNursingClinicalWorkspaceD4b2.ts`:

Overview · Admission · Systems · Reassessment · Pain · Neurological · Respiratory · Cardiovascular · GI · GU · Skin/Wounds · Fall/Mobility · Devices · Safety · Restraints · I&O · Nutrition (deferred) · Education · Care Plan · Handoff · Discharge · Documentation History

Sections are **care-setting filtered**. One concept has one authoritative source; other views project.

---

## 5. Care-setting governance

| Setting | Emphasis |
|---------|----------|
| **EMERGENCY** | Reassessment, focused systems, EDOC assessments, handoff, discharge nursing; **no** comprehensive admission section |
| **OBSERVATION** | Transition + shared reassessment; I&O; care plan; handoff; admission when applicable |
| **INPATIENT** | Full admission + reassessment + EDOC depth + I&O + nutrition placeholder + care plan + handoff + discharge nav |

`nursingDocumentEligibility` keeps `assignmentEqualsAuthorization: false`.

---

## 6. D4B.1 document foundation integration

Every durable projection uses D4B.1 contract fields (identity, linkage, care setting, discipline, template version, authorship, lifecycle, structured/narrative, validation, completeness, lineage, legal visibility).

**Explicitly not created:** nursing signature engine, nursing version-history engine, nursing amendment engine, nursing status model, nursing author model.

---

## 7. Nursing document-type registry

Smallest coherent registry (`ENTERPRISE_NURSING_DOCUMENT_TYPE_REGISTRY`) maps logical types to existing stores:

- `nursing.admission_assessment` → D4A.1 / D4B.1 type  
- `nursing.reassessment` → erNursingReassessmentV1 projection  
- `nursing.handoff` → ErHandoffV1 projection  
- EDOC-backed: pain, neuro, respiratory, cardiovascular, skin/wound, fall/mobility, device, safety, restraint, I&O, education, systems, care-plan update  
- `encounter_note.nursing` → EncounterNote  
- `nursing.discharge_note` → ED discharge nursing / discharge planning projection  

Types omitted when audit found no safe durable source (e.g. invented initial-assessment fork).

---

## 8. Initial and admission assessment

**Authoritative:** Med/Surg nursing admission (D4A.1). Workspace admission section navigates/hosts existing shell. Longitudinal history remains `clinicalHistoryProfileJson` — constitution domains not forked.

---

## 9. Systems assessment

**Authoritative:** shared ED reassessment engine + optional EDOC19 `systems_assessment`. No third systems form. GI/GU sections in IP/Obs route to the same live engine.

---

## 10. Systems assessment (detail)

Head-to-toe / shift content remains in admission (IP) and reassessment grid. EDOC19 systems card available via hub. `nursingEvalV1` is legacy read compatibility only.

---

## 11. Reassessment

**Authoritative:** `EmergencyNursingReassessmentPanel` (all three care settings). Projection adapter stamps D4B.1 document with `IN_PROGRESS`/`DRAFT` and optional late-entry flag. **Does not** invent amend/void. Rapid reassessment panel remains non-durable and unmounted.

---

## 12. Pain

**Authoritative:** EDOC13 via `ClinicalDocumentationHub` in Pain section (care-setting-aware hub `careSetting` prop).

---

## 13. Fall risk and mobility

**Authoritative:** EDOC14 hub section.

---

## 14. Skin and wounds

**Authoritative:** EDOC20 hub section. Longitudinal wound history remains append-only EDOC entries (no overwrite).

---

## 15. Neurological and stroke nursing

**Authoritative:** existing EDOC neurological / stroke forms via hub. Full NIHSS productization depth deferred where incomplete; GCS/pupil remain in existing cards/engines.

---

## 16. Respiratory and cardiovascular nursing

**Authoritative:** EDOC respiratory + cardiac monitoring forms via hub sections.

---

## 17. GI, GU, nutrition, hydration, and elimination

GI/GU: live reassessment engine (IP/Obs). I&O: EDOC5. **Nutrition:** deferred dedicated foundation cards (admission partial only) — section marked `DEFERRED`.

---

## 18. Lines, drains, airways, and devices

**Authoritative:** EDOC17. Legacy EvalV1 IV not promoted as primary write path.

---

## 19. Safety and restraints

Safety: EDOC safety category. Restraints: EDOC6. Order authority remains external (no MAR/orders redesign). Complete restraint workflow UX may remain hub-driven — documented deferral for deeper specialty UX.

---

## 20. Education

**Authoritative:** EDOC22 patient education / discharge teaching cards.

---

## 21. Nursing care plan

**Authoritative structured:** EDOC19 care-plan cards. Multidisciplinary inpatient care-plan shell remains incomplete (**H**) — full interdisciplinary plan deferred to **D4B.6**.

---

## 22. Handoff

**Authoritative:** ErHandoffV1 panels. Projection adapter maps signer + history count into D4B.1 document. Does not change D4A.4 assignment.

---

## 23. Discharge nursing

ED: existing discharge execution / disposition nursing panels in discharge slot. IP/Obs: navigate to discharge planning sticky section. Distinct from provider discharge summary. Full TOC suite deferred (**D4B.10**).

---

## 24. Interdisciplinary visibility

Projected documents expose status/authorship via D4B.1 primitives. Other disciplines may read projections; they must not overwrite nursing signed content (D4B.1 lifecycle + identity immutability).

---

## 25. Authorship and signature

Reuses D4B.1 authorship helpers. Admission/notes/EDOC remain server-authored. Handoff/reassessment projections never claim client-controlled signer identity for durable legal create. Operational assignment ≠ authorship.

---

## 26. Authorization

Existing Nest RBAC + facility/encounter scoping remain authority. Registry eligibility is advisory only (`assignmentEqualsAuthorization: false`).

---

## 27. Legal-record behavior

Legal projection continues via D4B.1 `buildEnterpriseClinicalDocumentLegalProjection` for adapted documents. No new PDF engine. Soft void / amend lineage preserved on EncounterNote/EDOC/admission.

---

## 28. Duplicate-concept normalization

| Concept | Winner | Losers / secondary |
|---------|--------|--------------------|
| Admission | D4A.1 | EDOC19 admission card (complementary) |
| Reassessment / systems | ED engine (+ EDOC19) | nursingEvalV1 (G) |
| Pain/fall/skin/devices/I&O/restraint/education | EDOC | Admission scaffolds |
| Care plan | EDOC19 | Thin IP shell |
| Notes | EncounterNote | erNotesV1 read-only |

No destructive schema deletion.

---

## 29. API architecture

Thin util `enterprise-nursing-clinical-workspace.util.ts` → `projectEnterpriseNursingClinicalWorkspace` over already-loaded rows. **No** unrestricted per-section JSON mutation API. Existing admission / EDOC / notes / handoff endpoints remain mutation authority.

---

## 30. Frontend architecture

`EnterpriseNursingClinicalWorkspaceD4b2.tsx`:

- Care-setting section nav  
- Overview document status using D4B.1 primitives  
- Live slots for reassessment / handoff / discharge / admission  
- EDOC hub for structured sections  
- FR/EN i18n  

Hosted by:

- `InpatientNursingAssessmentSection`  
- `ObservationWorkspacePanel` (nursing)  
- `EmergencyActiveWorkspaceView` (nursing)

Does not redesign global sticky nav / MAR / census shells.

---

## 31. Performance

Workspace summary is O(n) over already-loaded notes + EDOC entries. Section switching is client-local. EDOC hub loads entries once per mount (existing hub behavior). No N+1 author fetch added. Census/MAR paths untouched.

---

## 32. Security and privacy

Facility + encounter scoping unchanged. Signer identity remains server-side on durable APIs. No PHI bodies logged by new projection util. Does **not** claim HIPAA certification.

---

## 33. Compatibility

- Legacy nursingEvalV1 / erNotesV1 remain readable where already merged.  
- Provider documentation / MAR / ownership unchanged.  
- D4B.1 foundation suites remain regression-green.  
- Rapid reassessment panel not mounted as durable.

---

## 34. Documented deferrals

- Dedicated nutrition/elimination foundation cards  
- Durable NursingRapidReassessment engine  
- Full multidisciplinary care plan (D4B.6)  
- Complete restraint specialty UX beyond EDOC6 hub  
- Full NIHSS/product neuro suite expansion  
- Technician/NA workspace (D4B.3) and later discipline phases  
- Provider H&P / TOC (D4B.8–D4B.10)  
- Prisma `ClinicalDocument` table / unified server draft engine  
- Destructive EvalV1 / dual-IV normalization  

---

## 35. Test evidence

| Suite | Result |
|-------|--------|
| shared `enterpriseNursingClinicalWorkspaceD4b2` | 8 passed |
| shared D4B.1 foundation regression | 22 passed |
| API nursing workspace util | 2 passed |
| API D4B.1 foundation util regression | 2 passed |
| web D4B.2 + D4B.1 primitives + inpatient nursing header | 12 passed |

---

## 36. Final recommendation

Ship as **CERTIFIED WITH DOCUMENTED DEFERRALS**: coherent nursing workspace shell across ED/Obs/IP, D4B.1-integrated projections, reuse of highest-value existing engines, without inventing unsupported clinical forms or a second document lifecycle.

**Next phase:** **MEDUI.D4B.3 — Enterprise Technician and Nursing-Assistant Workspace** (do not start in this phase).
