# INP.1B.2 enterprise nursing admission clinical UX — audit

## Verdict

The existing 20-section admission engine is the correct persistence and legal-record authority and is retained. The UI was not clinically ready: generated translation entries exposed glued identifiers, one select had no option source, immediate-assessment chips wrote parallel `rapid*` keys, generic editors duplicated chip concepts, and a render-stale autosave could overwrite the post-click draft.

## Traceability

| Step | Existing/corrected owner |
|---|---|
| Field and option definition | `NURSING_ADMISSION_SECTION_SCHEMAS` and `NURSING_ADMISSION_OPTION_CATALOGS` |
| Labels | explicit `hospitalAdmissionD4a25` EN/FR catalogs; no key-derived fallback |
| Draft state | `InpatientAdmissionClinicalShell.answers` |
| Save serialization | `patchNursingAdmissionSection` (`sectionId`, `answers`, completion state, version) |
| Server write | existing inpatient operations nursing-admission section writer |
| Reload | existing nursing-admission documentation endpoint into section `answers` |
| Print | existing authoritative nursing admission print-summary endpoint/modal |
| Overview/summary | existing admission document projections; no summary-owned write |

The raw-label root cause was catalog content generated as `Generalappearance`-style strings plus a sentence-case fallback. Labels are now readable catalog values and missing labels render a neutral configuration error rather than an internal key.

The chip-loss root cause was twofold: chips used `rapidAppearance`, `rapidLoc`, `rapidOrientation`, and `rapidImmediateConcerns` instead of the schema's canonical concepts, and autosave was scheduled from the render that preceded `setAnswers`. Chips now control `generalAppearance`, `levelOfConsciousness`, `orientation`, and `immediateConcerns` in the same draft serialized by Save. Unsafe implicit scheduling was removed; audited explicit Save and Save-and-continue remain.

## Workflow and authority boundaries

The six stages remain Arrival & Identity; Immediate Assessment; History & Reconciliation; Safety & Physical Function; Psychosocial & Education; and Handoff, Review & Completion. Their 20 sections remain Overview, Identity & Demographics, Source Encounter Summary, Nursing Admission Assessment, Medical History, Surgical History, Home Medications, Allergies, Social History, Belongings & Valuables, Skin & Wound, Lines/Drains/Devices, Fall & Safety, Pain, Functional & Mobility, Nutrition, Elimination, Psychosocial, Education & Communication, and Nursing Handoff & Admission Completion.

Patient clinical history remains `Patient.clinicalHistoryProfileJson`; allergies, medication history/reconciliation, wounds, ongoing pain, device inventory, fall/suicide workflows, and I&O remain their existing enterprise authorities. Admission answers coordinate review/baseline status and do not establish parallel truth. ED and Observation source records are read-only inputs and are not modified.

## Regulatory design references

The matrix was reviewed as a clinical design aid against CMS Hospital Conditions of Participation (including nursing-service requirements), Joint Commission 2026 National Performance Goals, AHRQ Fall TIPS/hospital fall-prevention resources, and AHRQ hospital pressure-injury prevention resources. These references inform safe workflow design; they do **not** mean every individual field is federally mandated. Facility policy and applicable jurisdiction may add requirements.

References: [CMS Conditions for Coverage & Conditions of Participation](https://www.cms.gov/medicare/health-safety-standards/conditions-coverage-participation), [Joint Commission National Performance Goals](https://www.jointcommission.org/standards/national-performance-goals), [AHRQ Fall TIPS](https://www.ahrq.gov/patient-safety/settings/hospital/fall-prevention/toolkit/index.html), and [AHRQ Preventing Pressure Ulcers in Hospitals](https://www.ahrq.gov/patient-safety/settings/hospital/resource/pressureulcer/tool/index.html).

## Database verdict

The existing versioned section `answers` JSON accepts canonical scalar and array codes. Prisma change: **No**. Migration: **Not required**. Seed: **Not required**.
