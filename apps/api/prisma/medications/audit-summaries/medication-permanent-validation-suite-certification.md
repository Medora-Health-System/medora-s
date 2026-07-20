# Permanent Medication Validation Suite Certification

**ID:** MEDUI.PERMANENT_MEDICATION_VALIDATION_SUITE

**Decision:** PERMANENT_MEDICATION_VALIDATION_SUITE_CERTIFIED

**Negative regression:** PASS
**CI workflow present:** YES
**Migration required:** NO

Will CI fail if a required medication disappears from the real provider path?

- Unit/negative fixture tests: **YES** (always in CI)
- DB-backed critical suite: **YES** when catalog is present (local/prod/nightly)
