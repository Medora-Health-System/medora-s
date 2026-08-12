# INP.1B.3 Inpatient Nursing Assessment UX — Certification

## Certified controls

- Focused nursing composition contains no RT, rehabilitation, Team Execution, technician, provider, or engineering-governance presentation.
- No finding, including WNL, is selected on initialization.
- All selects include an empty prompt and coded options; multi-findings remain controlled selections.
- Save/reload uses the existing latest-snapshot authority and append-only history endpoint.
- Reassessment and copy-previous create new drafts; Save creates a new immutable event and does not mutate prior event payloads.
- History is tabular and read-only with server time, assessment type, author, role, status, and View.
- Overview/Summary/Patient Chart/print share typed INP.1A projections; none owns persistence.
- POST authority is RN/Admin only. Provider, RT, rehabilitation roles, and PCT cannot author.
- EN/FR catalogs cover every visible configured field and option while payloads retain canonical codes.
- ED Nursing, Inpatient Nursing Admission, Observation, signatures, INP.2 care-plan persistence, Prisma schema, migrations, and seeds are untouched.

## Operational statement

This change requires no production migration and no seed. It performs no deployment or merge. Any future direct integration of authoritative active-device, restraint, or I&O totals should continue to consume those engines rather than extend the assessment into a competing inventory.
