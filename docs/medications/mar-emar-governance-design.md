# MAR / eMAR Governance Design (M1.3F)

**Phase:** M1.3F (audit + design only)  
**Date:** 2026-05-31  

---

## Part 2 — Medication order → administration lifecycle (target)

Medora today uses `OrderStatus` + `OrderItemLifecycleState` + append-only `MedicationAdministration`. The **target clinical lifecycle** below is the governance model to implement in future phases (not all states exist as enums today).

| State | Trigger | Actor | Required fields | Audit event (proposed) | Legal chart | Rollback / correction |
|-------|---------|-------|-----------------|------------------------|-------------|------------------------|
| **ORDERED** | Provider signs medication order | Provider | drug, dose, route, frequency intent, priority | `ORDER_CREATE` (exists) | Order visible | Cancel order (policy) |
| **PHARMACY_REVIEW_PENDING** | Order requires pharmacy verify | System | `requiresPharmacyVerification` from profile | `MEDICATION_PHARMACY_REVIEW_PENDING` | Banner on chart | N/A |
| **PHARMACY_VERIFIED** | Pharmacist verifies | Pharmacist | verifier id, time, optional notes | `PHARMACY_VERIFICATION_COMPLETED` | Verify stamp | Re-open review (supervisor) |
| **SCHEDULED** | Schedule engine generates due times | System | due times, timezone, sig | `MEDICATION_ADMINISTRATION_SCHEDULED` | Due list | Reschedule with reason |
| **DUE** | Clock reaches due window | System | — | (implicit in due list) | Due highlight | N/A |
| **ADMINISTERED** | Nurse documents administration | RN | dose, route, time, marAction=administered | `MEDICATION_ADMINISTERED` | MAR row + EDOC if required | Effective-time correction only |
| **HELD** | Nurse holds dose | RN | hold reason, until time | `MEDICATION_HELD` | Held entry | Resume → DUE |
| **REFUSED** | Patient refuses | RN | refusal reason | `MEDICATION_REFUSED` | Refusal entry | No delete; amend notes |
| **MISSED** | Due window passed without action | RN or system | missed reason | `MEDICATION_MISSED` | Missed entry | Document late admin separately |
| **WASTED** | Partial/full waste documented | RN + witness if controlled | waste amount, reason, witness | `MEDICATION_WASTED`, `CONTROLLED_SUBSTANCE_WASTE_RECORDED` | Waste + witness | Append-only correction |
| **DISCONTINUED** | Provider DC order | Provider | DC reason | `ORDER_UPDATE` / cancel | DC visible | N/A |
| **CANCELLED** | Order cancelled before admin | Provider / policy | cancel reason | `ORDER_CANCEL` (exists) | Cancel visible | N/A |
| **CORRECTED** | MAR effective time or outcome fix | RN / supervisor | reason, version | `MAR_ENTRY_CORRECTED` | Corrected timestamp shown | No row delete |

**Mapping today:** `administered` / `refused` / `not_available` / `md_changed` cover a subset; no HELD, MISSED, WASTED, PHARMACY_* states.

---

## Part 3 — MAR governance design

| Requirement | MVP (clinic Haiti) | Phase 1 (M1.3 program) | Enterprise target |
|-------------|-------------------|------------------------|-------------------|
| Scheduled med display | Order list by encounter | + `intendedAdministrationAt` sort | Full due grid |
| PRN display | Manual label + notes | PRN flag on order | PRN with max frequency |
| One-time display | Same as scheduled | Same | Same |
| Continuous infusion | START/STOP MAR + session key | + `InfusionSession` wired | Pump linkage (EDOC.8A backlog) |
| Overdue display | Soft timing warnings | MISSED state | Escalation rules |
| Held / refused / missed | refused + not_available | + HELD, MISSED enums | Required reason codes |
| Nurse documentation | `MedicationAdministration` | + governance gates | BCMA-linked rows |
| Provider order linkage | `orderItemId` | + product/concept id | Canonical product primary |
| Dose/route/frequency | strength/route on OrderItem; dose on MAR | Profile max dose check (soft→hard) | Structured sig |
| Legal chart export | `chart-export.service` includes MAR | + governance badges in export | Full audit bundle |

---

## Part 4 — eMAR governance design

| Requirement | MVP | Phase 1 | Enterprise |
|-------------|-----|---------|------------|
| Barcode medication administration | No | No | Yes (NDC / facility code) |
| Patient barcode verification | No | No | Yes |
| Medication barcode verification | No | No | Yes |
| Wrong-patient prevention | Facility + encounter scope only | Same + LASA ack | BCMA hard stop |
| Wrong-medication prevention | Soft LASA warnings | LASA ack required | Scan match required |
| Wrong-dose prevention | Soft warnings | Profile range warn | Scan + range hard stop |
| Wrong-route prevention | Route on order snapshot | Route mismatch warn | Scan + hard stop |
| Wrong-time warnings | `evaluateMedicationTimingSafety` | Due window warn | eMAR due engine |
| Override reason | EDOC / notes only | `MEDICATION_OVERRIDE_USED` audit | Supervisor approval |
| Offline fallback | Pending queues (orders, MAR) | Documented downtime form | Sync conflict rules |
| Downtime documentation | Offline pending MAR queue | Paper MAR reconciliation import | Regulated workflow |

**Design principle:** eMAR is a **Phase 1.5+** capability; MVP remains **documentation MAR** with strong audit, not BCMA.

---

## Part 5 — Controlled-substance administration matrix (M1.3C)

Applies when `MedicationSafetyProfile` / catalog flags match M1.3C manifest (Schedule II–V).

| Governance control | Schedule II | Schedule III | Schedule IV | Schedule V | MVP | Phase 1 | Enterprise |
|--------------------|------------|--------------|-------------|------------|-----|---------|------------|
| Witness at administration | Required | Required | Policy | Optional | Flag only | EDOC + MAR prompt | Hard gate |
| Dual signature | Required | Required | Optional | Optional | `requiresDoubleSign` catalog | Enforce before MAR save | Cosign workflow |
| Waste documentation | Required | Required | Required | Policy | **MISSING** | EDOC card + MAR link | Inventory decrement |
| Partial dose waste | Required | Required | Required | Policy | **MISSING** | Structured waste amount | Auto calc remainder |
| Controlled override | Supervisor | Supervisor | Pharmacist+RN | RN | **MISSING** | Audit + reason | Policy engine |
| Inventory count | Optional | Optional | Optional | Optional | **MISSING** | Flag only | Perpetual inventory |
| Shift count | Optional | Optional | Optional | Optional | **MISSING** | Manual EDOC | Automated reconcile |
| Discrepancy reporting | Required | Required | Policy | Policy | **MISSING** | Audit event | Pharmacy module |
| Legal chart audit | MAR row | + waste EDOC | Full chain | Full chain |

---

## Part 6 — High-alert administration matrix (M1.3D)

| Governance control | Insulin | Anticoag | Opioid | Benzo | Sedative | Paralytic | Vasopressor | Antiarrhythm | Thrombolytic | Chemo | Other |
|--------------------|---------|----------|--------|-------|----------|---------|-------------|--------------|--------------|-------|-------|
| Independent double-check | Yes | Yes | Policy | Policy | Policy | Yes | Yes | Yes | Yes | Yes | Policy |
| Dual verification | Yes | Yes | Yes | Policy | Yes | Yes | Yes | Yes | Yes | Yes | Policy |
| Cosign | Policy | Policy | Policy | Policy | Policy | Policy | Policy | Policy | Yes | Yes | Policy |
| Witness | Policy | Policy | Waste | Policy | Policy | Policy | Policy | Policy | Yes | Yes | Policy |
| MAR warning | Soft | Soft | Soft+controlled | Soft | Soft | Soft | Soft | Soft | Soft | Soft | Soft |
| Override reason | Ack | Ack | Required | Ack | Required | Required | Required | Required | Required | Required | Required |
| Pharmacy verification | Policy | Yes | Policy | Policy | Policy | Policy | Policy | Policy | Yes | Yes | Policy |
| Infusion safety (EDOC.8) | Yes | Yes | Policy | Policy | Yes | Policy | Yes | Policy | Policy | Policy | Policy |
| Dose range warning | Weight | INR placeholder | Resp | Sedation | Sedation | N/A | BP | QT placeholder | Time | Protocol | Policy |
| Titration documentation | EDOC titration | EDOC | Policy | Policy | EDOC | N/A | EDOC | Policy | Protocol | Protocol | Policy |

**Legend:** Yes = required when class assigned; Policy = facility policy; Soft = `getMedicationSafetyWarnings` only today.

---

## Part 7 — LASA administration matrix (M1.3E)

| Control | LASA_LOW | LASA_MEDIUM | LASA_HIGH | MVP | Phase 1 | Enterprise |
|---------|----------|-------------|-----------|-----|---------|------------|
| LASA warning at order | Soft pair | Soft pair | Soft pair | **IMPLEMENTED** (soft) | Ack required | Block without override |
| Second-read verification | Optional | Yes | Yes | **MISSING** | EDOC or MAR modal | Two-nurse scan |
| Similar-name UI | — | Banner | Modal | **MISSING** | `lasaGroupId` badge | Order compare view |
| Selection confirmation | — | Checkbox | Typed confirm | **MISSING** | LASA ack audit | BCMA |
| Administration confirmation | — | Same group check | Same + witness | **MISSING** | `LASA_WARNING_ACKNOWLEDGED` | Hard stop |
| Audit event | — | Ack | Ack + witness | **MISSING** | Proposed | Full chain |

**M1.3E APPLY groups** (morphine/hydromorphone, epi/norepi, dopamine/dobutamine, cefazolin/ceftriaxone) should drive Phase 1 banners when `lasaGroupId` is populated on profile.

---

## Part 10 — Pharmacy verification design

| Requirement | MVP | Phase 1 | Enterprise |
|-------------|-----|---------|------------|
| Pharmacist verification | Dispense workflow only | Verify gate on inpatient IV/high-risk | All inpatient meds |
| Auto-verification rules | None | Stat electrolytes / fluids whitelist | Rule engine |
| ED emergency override | Provider may order without verify | Time-limited override + audit | Policy per facility |
| Inpatient pharmacy queue | `getPharmacyWorklist` | + verify status column | Priority + SLA |
| Medication profile review | Formulary staging review | Link to `MedicationSafetyProfile` | Full profile UI |
| Contraindication review | **Placeholder** | Allergy cross-check (existing allergies) | DDI service |
| Duplicate therapy | **Placeholder** | Soft warning | Hard stop |
| Renal dose review | **Placeholder** | CrCl placeholder field | Lab integration |
| Allergy review | Encounter allergies | Required ack on verify | Hard stop |

**Proposed verify record (future schema):** `orderItemId`, `verifiedByUserId`, `verifiedAt`, `verificationType` (FULL / OVERRIDE / AUTO), `overrideReason`, `facilityId`.

---

## Part 11 — UI / UX requirements

| UI surface | Purpose | Priority | Status today |
|------------|---------|----------|--------------|
| **MAR grid** | Rows per order + clock actions | P0 | `MedicationAdministrationTab` |
| **Due medication timeline** | eMAR schedule | P2 | **MISSING** |
| **High-alert badge** | HA class on row | P1 | **MISSING** (soft panel only) |
| **Controlled badge** | Schedule on row | P1 | **MISSING** |
| **LASA badge** | Group code on row | P1 | **MISSING** |
| **Witness prompt** | Second user before save | P1 | EDOC only |
| **Cosign prompt** | Provider cosign | P2 | Notes only |
| **Override modal** | Reason + supervisor | P1 | Partial (soft ack) |
| **Waste documentation modal** | Controlled waste | P1 | **MISSING** |
| **Hold/refuse reason modal** | Structured reasons | P1 | Partial (marAction) |
| **Pharmacy verification banner** | Unverified orders | P1 | **MISSING** |
| **Legal chart indicators** | Export completeness | P1 | MAR in chart export |

### UI component map (target)

```
EncounterChart
└── MedicationAdministrationTab (existing)
    ├── PharmacyVerificationBanner (new)
    ├── MarDueTimeline (new, eMAR)
    ├── MarOrderGrid (existing, extend)
    │   ├── MedGovernanceBadgeRow (HA / Controlled / LASA)
    │   ├── MedicationSoftSafetyPanel (existing)
    │   └── MedicationAdministrationClockButton (existing)
    ├── MarRecordModal (existing, extend)
    │   ├── WitnessCaptureSection (new, link EDOC)
    │   ├── WasteDocumentationSection (new)
    │   └── OverrideReasonSection (new)
    └── EdocHighAlertInfusionLink (existing cards)
```

All user-visible strings: **French** per product rules.
