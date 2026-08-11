# INP.1B.2 certification

## Scope

Certified scope is the inpatient Nursing Admission clinical shell and shared admission catalog. Care Plan/INP.2, ED Nursing, Observation documentation, Prisma, migrations, and seeds were not changed.

## Acceptance evidence

- Data-driven catalog regression checks all 20 sections for duplicate keys and requires every select/radio/multiselect/checkbox to resolve a non-empty canonical option catalog.
- EN/FR regression requires an explicit readable label for every schema field and rejects raw-key labels.
- Immediate Assessment regression verifies the four chip concepts use a single canonical editor.
- Canonical serialization/completion regression covers Ill-appearing, Alert, Alert and oriented ×4, and Fall risk values through JSON round-trip and required-section validation.
- Existing API writer/reload, legal summary, and print paths are retained; no parallel persistence was introduced.

## Isolation and legal record

No ED Nursing or Observation source files were edited. Existing source encounter material remains historical and read-only. Saved Nursing Admission sections remain in the existing versioned inpatient admission document used by Overview/Summary/print projections.

## Release constraints

No production access, production migration, seed, deployment, merge, or care-plan modification was performed. Facility clinical governance should validate local required-field policy and terminology before deployment.
