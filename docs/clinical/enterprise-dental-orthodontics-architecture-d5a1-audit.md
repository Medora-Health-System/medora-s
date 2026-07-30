# MEDUI.D5A.1 — Audit: Enterprise Dental Care & Orthodontics architecture

**Certification ID:** `MEDUI.D5A.1`  
**Branch:** `d5a1-enterprise-dental-orthodontics-architecture-audit`  
**Base:** `origin/main` @ `04547e4e8252f3511487df027e17caf5a921aefa`  
**Includes:** MEDUI.D4C.7I (PR #82), D4C.7H, D4C.7G … D4C.6  
**Package manager:** npm workspaces  
**Date:** 2026-07-29  
**Scope:** Audit + architecture only — **no** odontogram/periodontal/orthodontic implementation, **no** Prisma migration, **no** production workflows.

## Git verification (recorded)

```
git fetch origin
git branch --show-current
# d5a1-enterprise-dental-orthodontics-architecture-audit

git rev-parse HEAD
# 04547e4e8252f3511487df027e17caf5a921aefa

git rev-parse origin/main
# 04547e4e8252f3511487df027e17caf5a921aefa

git status
# clean working tree at branch creation

git log -15 --oneline --decorate
# 04547e4e8 Merge PR #82 D4C.7I facility identity
# b00047c06 feat(facilities) D4C.7I
# 216c9a121 Merge PR #81 D4C.7H
# … D4C.7G through D4C.6 present
```

Facility identity/address authority is **resolved** (D4C.7I on main).  
**DO NOT COMMIT / PUSH / MERGE** (milestone policy).

---

## Program purpose

Introduce **MEDORA DENTAL CARE** as a configurable enterprise service line inside one Medora platform: one patient, one record, one appointment/orders/results/imaging/Rx/billing/consent/audit authority — specialty workspace, not a product fork.

---

## Existing Medora architecture (current)

| Workspace | Path / notes |
|---|---|
| Clinic Care | `apps/web/src/features/clinic-care` — ambulatory encounter workspace |
| Emergency Care | `apps/web/src/features/emergency` |
| Hospital Care | inpatient / hospitalization boards; `HospitalEpisode`, bed governance |
| Laboratory / Radiology | worklists + `Order` / `OrderItem` + results |
| Pharmacy | outpatient Rx + MAR (inpatient/ED) — separated |
| Billing | `BillingEvent`, claim readiness, finalization |
| Public Health | disease reports / vaccinations |
| Administration | facilities, users, roles, service-config |

**Dental Care:** not present as workspace. No odontogram / OrthodonticCase / periodontal chart authorities in repo (search: no `DentalPatient`, no tooth chart models).

---

## Facility configuration findings

| Mechanism | Location | Dental ready? |
|---|---|---|
| `Facility.facilityType` | Prisma enum | No `DENTAL_PRACTICE` type; **prefer service line over new type** |
| `serviceLinesJson` | JSON array | Extensible **without** migration once tokens added to `MedoraServiceLine` |
| `facilityCareProfileJson` | D4C.1 / D4C.7I | Operational identity + ambulatory profile; optionalModules LAB/RAD/PHARM/PH/BILLING |
| `Department` + `DepartmentCode` | Prisma | No DENTAL department code yet |
| Navigation | `navigationAuthorization.ts` | Service-line → navigation area map; Dental area absent |
| D4C.7I prep | `D5A_FUTURE_DENTAL_SERVICE_LINES` | `DENTAL`, `GENERAL_DENTISTRY`, `ORTHODONTICS` reserved |

**Preferred model:** Facility → enable service line `DENTAL` → enable specialty capabilities → role-aware navigation. Same facility may enable `CLINIC` + `DENTAL` without duplicate patients.

---

## ENTERPRISE REUSE MATRIX

| Authority | Canonical | API / UI | Dental reuse | Notes |
|---|---|---|---|---|
| **A. Patient** | `Patient` (`globalMrn`, facility `mrn`, demographics, emergency contact, `clinicalHistoryProfileJson`) | patients service / registration | **Reuse unchanged** | No `DentalPatient`. Guardian is emergency-contact + document signer — extend later, not fork |
| **B. Appointment** | `Appointment` (D4C.3) | appointments service | **Reuse + thin adapter** | Add visit-type / resource (chair) config; no `DentalAppointment` |
| **C. Encounter** | `Encounter` OUTPATIENT + `visitOrigin` | clinic ambulatory workspace | **Reuse + profile extension** | Dental encounters = ambulatory; no inpatient semantics |
| **D. Documentation** | `EncounterClinicalDocumentationEntry`, provider sign fields, addenda | ProviderDocumentation workspace | **Reuse + dental templates** | Typed sections / templates; no separate doc engine |
| **E. Orders** | `Order` / `OrderItem` (`LAB` \| `IMAGING` \| `MEDICATION` \| `CARE`) | CreateOrderModal, worklists | **Reuse** | Dental clinical procedures map to **CARE** lines (+ `enterpriseProcedureId` / plan items later). No separate `PROCEDURE` order type today. |
| **F. Imaging** | Imaging orders + results; `EnterpriseDocument` attachments | rad worklist, result print | **Reuse + association** | No DICOM PACS found; non-DICOM via EnterpriseDocument; tooth/case association later |
| **G. Prescriptions** | Outpatient Rx + `printRx` + facility identity D4C.7I | Clinic Rx panel, pharmacy | **Reuse** | No DentalPrescription; no MAR for outpatient dental Rx |
| **H. Results** | OrderItem results + acknowledgement | EncounterResultsTab | **Reuse** | Pathology / external lab as needed |
| **I. Consent** | `EnterpriseDocument` + `EnterpriseDocumentSignature` | Registration packets / document center | **Reuse + dental templates** | No boolean-only legal consent |
| **J. Billing** | `BillingEvent`, capture JSON, claims | billing modules | **Reuse + estimate/plan adapter** | Procedure ≠ billed; installment plans may need extension (D5A.10) |
| **K. Follow-up** | `FollowUp` | clinic follow-up | **Reuse** | Recall / adjustment / retention due dates |
| **L. Medical Record** | Chart summary, timeline, chart export | patient chart / encounter | **Reuse + dental projections** | Surface dental history by auth |
| **M. Audit** | `AuditLog` + AuditAction | all clinical writes | **Reuse + new actions** | Tooth/plan/appliance events in later milestones |

---

## Gap matrix

| Gap | Severity | Owner milestone |
|---|---|---|
| `DENTAL` not in `MedoraServiceLine` / Zod / departments | High | D5A.2 |
| No Dental navigation area / workspace shell | High | D5A.2–3 |
| No dentition / tooth / surface persistence | Critical for chart | D5A.4–5 |
| No OrthodonticCase longitudinal model | Critical for ortho | D5A.7 |
| Appointment lacks chair/operatory resource | Medium | D5A.3 |
| No structured guardian/legal relationship table | Medium | D5A.2 / D5A.10 (reuse contact + documents first) |
| Imaging tooth/case association absent | High | D5A.9 |
| Periodontal measurements absent | Medium (deferrable) | D5A.6 |
| Specialty RoleCodes (DENTIST, …) absent | Medium | Prefer capabilities first (D5A.2); roles only if needed |
| CDT / licensed dental codes not embedded | Policy | Never ship unlicensed datasets; Haiti-local config |

---

## Inpatient-board non-reuse

**Do not reuse:** bed availability, census, admission/transfer/discharge as inpatient, nursing-unit ownership, attending-of-record hospital semantics.

**May inspire visually:** board columns for today’s visits.

**Room:** `Encounter.roomLabel` + governed room display exist for ED/inpatient. Dental may later parameterize **operatory/chair** as appointment resource or labeled room **without** bed governance (`facilityBedGovernance`) as admission authority.

---

## Domain summary (see companion docs)

- **Dentition:** primary / mixed / permanent; canonical tooth codes; Universal/FDI/Palmer as **display** config.
- **Odontogram:** authoritative projection from findings/events + current-state; never paint-only image.
- **OrthodonticCase ≠ Encounter:** case spans years; visits = Encounter linked to case.
- **Treatment plans:** versioned; accepted plans immutable or amend-only.
- **Cephalometrics:** upload + structured report in early D5A; native tracing **future** milestone (not D5A.1–9 default).

---

## Migration assessment (no files created)

| Item | D5A.1 | Likely later |
|---|---|---|
| New Prisma models (tooth, plan, OrthodonticCase, …) | Not authorized | D5A.4+ |
| Service-line token in JSON | No migration | D5A.2 TS/Zod only |
| New `FacilityType` | Avoid unless required | Prefer service line |
| New `RoleCode` / `DepartmentCode` | Avoid initially | Capability flags / optional enum later |
| Backfill | N/A | Empty dental tables |
| Compatibility | N/A | Additive FKs to Patient/Encounter/Facility |

---

## Risk register (abbrev.)

| Risk | Sev | Likelihood | Mitigation | Gate |
|---|---|---|---|---|
| Wrong tooth-number mapping | High | Med | Canonical codes + conversion tests | D5A.4 |
| Historical overwrite | High | Med | Append findings; never silent mutate completed | D5A.4–5 |
| Unversioned treatment plan | High | Med | Immutable accepted versions | D5A.5/7 |
| Image–patient mismatch | High | Low | Facility-scoped EnterpriseDocument + auth | D5A.9 |
| Ortho case = encounter | High | Med | Architecture + tests | D5A.7 |
| Duplicate engines | Critical | Low | Forbidden authority list | All |
| Unlicensed CDT dump | High | Med | Config placeholders; no copyrighted seed | D5A.5/10 |
| Facility fork pressure | High | Med | Tiered config policy | D5A.2 |
| Offline odontogram local-only | High | Med | Server authority; draft sync indicators | D5A.12 |
| Role over-permission | High | Med | Server capabilities; Rx not automatic | D5A.2 |

---

## Certification recommendation

**ARCHITECTURE CERTIFIED WITH DOCUMENTED DEFERRALS — READY FOR D5A.2**

Non-blocking deferrals: periodontal chart (D5A.6), native cephalometric engine (future), installment billing depth (D5A.10), new RoleCode enums (capabilities-first), structured guardian entity (documents + emergency contact interim).
