# MEDUI.D4A.3.4 Certification

## Scope
Final inpatient header placement and clinically governed, role-aware inpatient Overview projection.

## Header
- Removed the full IV Access card.
- Added a compact syringe control connected to the existing IV workflow.
- Kept Allergies, Code Status, and Isolation visible in the right-side header area.
- Formatted DOB as date-only.
- Applied governed display labels for clinical enums.

## Overview architecture
The Overview uses a typed projection rather than rendering raw API objects. It summarizes authoritative inpatient domains and deep-links to their source workflows.

Modules include:
- Clinical alerts
- Care team
- Active problems
- Clinical state
- Vitals and trends
- Results
- Medications
- Tasks
- Nursing
- Intake and output
- Devices
- Consults
- Discharge readiness
- Recent significant events

## Governance
- Overview rendering is read-only and creates no audit event.
- Existing authoritative editors remain responsible for writes and auditing.
- Raw JSON keys, ISO timestamps, internal enums, and duplicate clinical controls are not rendered.
- Provider-only Rounding Mode is hidden from Nursing and PCT presentation.

## Verification
- git diff --check: passed
- Targeted tests: 48/48 passed
- pnpm verify:web: passed
- npm run verify: 8,104 tests passed with web/API type checking

## Review items
- Durable device inventory is not yet available to Overview.
- Radiology remains an actionable summary rather than a complete imaging board.
- Empty secondary I&O streams are intentionally omitted.
- Legacy ProviderClinicalSynthesisOverview remains in the repository but is unmounted.
- Final live-browser bedside smoke validation remains an operational deployment check.

## Certification
YES WITH REVIEW ITEMS
