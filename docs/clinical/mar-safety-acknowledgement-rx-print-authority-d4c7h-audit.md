# MEDUI.D4C.7H — Audit: MAR safety acknowledgement & Rx print authority

**Certification ID:** `MEDUI.D4C.7H`  
**Branch:** `d4c7h-mar-safety-acknowledgement-rx-print-authority`  
**Base:** `origin/main` @ `74dd90b3955a11ab6959d444a7b672c3a3e3bec4` (D4C.7G merged via PR #80)  
**Package manager:** npm workspaces  
**Date:** 2026-07-29  

## Git verification (recorded)

```
git fetch origin
git branch --show-current
# d4c7h-mar-safety-acknowledgement-rx-print-authority

git rev-parse HEAD
# 74dd90b3955a11ab6959d444a7b672c3a3e3bec4

git rev-parse origin/main
# 74dd90b3955a11ab6959d444a7b672c3a3e3bec4

git log -5 --oneline --decorate
# 74dd90b39 Merge pull request #80 … D4C.7G
# … D4C.7F / D4C.7E / D4C.7D / D4C.7C / D4C.7B present in history
```

Working tree started clean on branch created from updated `origin/main`.  
**DO NOT COMMIT / PUSH / MERGE** (milestone policy).

---

## Production defects

### Defect A — MAR allergy warning without acknowledgement control

**Observed:** Modal / save path surfaces  
“Des allergies ou intolérances sont documentées pour cette visite. Confirmez avant d’enregistrer l’administration.”  
while no checkbox is available; Enregistrer appears usable then fails; header may show “Allergies: Aucun”.

### Defect B — Prescription print missing facility identity

Print preview can show medication rows without facility name / address / phone.

### Defect C — Blank `about:blank` print window

Clinic Rx print opened `window.open("", "_blank", "noopener,noreferrer")` then wrote/printed — classic blank-document failure mode.

---

## ENTERPRISE DOMAIN AUDIT

| Domain | Existing Component | Reused | Extended | Duplicate Prevented |
|---|---|---|---|---|
| Allergy / intolerance (encounter free-text gate) | `packages/shared/src/encounter-allergy-safety.ts` | ✔ | ✔ (classification) | ✔ |
| MAR administration | `MedicationAdministrationTab` + `medication-administration.service` | ✔ | ✔ (hydrate + ack UI + audit meta) | ✔ |
| Prescription print | `RxPrintLayout.printRx` / `getRxPrintHtml` | ✔ | ✔ (facility header + readiness) | ✔ |
| Facility print identity | `projectFacilityPrintIdentity` (D4C.1) | ✔ | ✔ (wired into print) | ✔ |

No `ClinicMar*` / `ClinicPrescriptionPrint` engines.

---

## A. Allergy authority

| Item | Authority |
|---|---|
| Encounter vitals `allergyNote` | `Encounter.vitals` |
| Nursing evaluation sécurité text | `Encounter.nursingAssessment.nursingEvalV1.sections.securite` |
| Triage ER allergy free-text | `Triage.vitalsJson.medoraErTriageV1.*` |
| Summary helper | `getEncounterAllergyDocumentationSummary` |
| Server gate | `medication-administration.service` requires `safetyAcknowledgedMedicationAllergies === true` when summary non-null |
| Header strip (display) | `buildEdHeaderAllergySummary` — may show NKDA / “Aucun” while gate still requires ack for NKDA free-text |

### Allergy-state classification (D4C.7H)

| Category | Meaning | Ack required |
|---|---|---|
| `KNOWN_ALLERGY_OR_INTOLERANCE` | Positive allergen / intolerance text | Yes |
| `NO_KNOWN_ALLERGIES` | NKDA / “Aucune allergie…” | Yes (status review) |
| `STATUS_UNKNOWN` | Not reviewed / unknown wording | Yes |
| `NONE` | No documentation found | No |

---

## B. Exact Clinic acknowledgement root cause

1. **ED chart** mounts `MedicationAdministrationTab` with `encounterAllergySource` (vitals + nursing + triage).  
2. **Clinic ambulatory Médicaments** mounted the same tab **without** `encounterAllergySource`.  
3. Clinic ambulatory does **not** wrap `EncounterClinicalDataProvider`; standalone load *should* fetch `GET /encounters/:id`, but allergy UI still depended solely on `marAllergyDocSummary`. When summary stayed null (fetch miss / timing / source mismatch vs server create select), the **checkbox was not rendered**.  
4. Server still evaluated allergies on create and returned the FR confirmation error — user saw the warning **as a submit error** with **no control** to satisfy `safetyAcknowledgedMedicationAllergies`.  
5. Header “Allergies: Aucun” can be NKDA-normalized display while free-text still trips the documentation gate.

**Not** a Clinic-only acknowledgement engine gap — missing wiring + hydrate of the **enterprise** ack control.

---

## C. Existing ED/Hospital acknowledgement behavior

- Checkbox when `marAllergyDocSummary` set  
- Client disables Enregistrer until checked  
- Payload includes `safetyAcknowledgedMedicationAllergies: true`  
- Server enforces; audit stores ack boolean  

Preserved and extended (category + ack version in audit metadata).

---

## D. Blank about:blank root cause (exact)

**Clinic Rx path** (`ClinicCareAmbulatoryPrescriptionPanel.handlePrint`):

```ts
window.open("", "_blank", "noopener,noreferrer");
w.document.write(html);
w.print();
```

With `noopener`, the returned `Window` is not the opened document; writes do not populate the visible tab → empty `about:blank` print.

Canonical `printRx` used `window.open("", "_blank")` without noopener (safer) but relied on `setTimeout(300)` only.

**Fix:** Route Clinic (and other entry points) through hardened `printRx`: no noopener, validate HTML, `document.open/write/close`, print after `load` + double `requestAnimationFrame`, typed errors if empty/blocked/missing facility name.

---

## E. Facility identity authority

Preferred projection: `projectFacilityPrintIdentity({ facilityName, careProfileJson, billingAddress? })`  
from session `/auth/me` active facility name + `careProfileJson` operational address.  
Never hard-code a clinic name. Fax not on `FacilityOperationalAddress` — deferred (print when present).

---

## F. Print entry points consolidated

| Entry | Function |
|---|---|
| Clinic Rx workspace | `printRx` + `buildRxPrintFacilityIdentity` |
| CreateOrderModal post-sign | same |
| Pharmacy worklist | same |
| DepartmentOrderDetail | same |
| Encounter orders print | same |

All reuse `getRxPrintHtml` / `printRx` — no second HTML generator.
