# FHIR Phase 2B — Deployed Medication Certification

## Purpose

This is the production acceptance gate for the read-only `MedicationRequest` and `MedicationAdministration` capabilities introduced in Phase 2B. A merged implementation PR is not sufficient by itself: the deployed API must prove authentication, scope enforcement, facility isolation, read/search behavior, pagination, and auditability before Phase 2B is marked internally complete.

This is an internal Medora interoperability certification. It is **not** an external claim of US Core, SMART, ONC, or national-program certification.

## Preconditions

Use only a dedicated test integration/facility. Do not use a live partner credential for certification.

The machine client must have these four scopes granted and explicitly synchronized after the Phase 2B deployment:

- `medicationRequest.read`
- `medicationRequest.search`
- `medicationAdministration.read`
- `medicationAdministration.search`

The certification facility must contain at least two governed test `MedicationRequest` records and at least two governed test `MedicationAdministration` records. This is required so direct read and cursor pagination are both exercised instead of being inferred from an empty dataset.

Repository/environment secrets used by the workflow:

- `FHIR_CERT_CLIENT_ID`
- `FHIR_CERT_KEY_ID`
- `FHIR_CERT_CLIENT_SECRET`
- `FHIR_CERT_FACILITY_ID`

Never place a client secret or bearer token in workflow inputs, PR comments, screenshots, terminal transcripts, or issue text.

## Automated deployed checks

Run **FHIR Phase 2B Medication Deployed Certification** from GitHub Actions after the production deployment is healthy.

The harness verifies:

1. wrong-facility token issuance is rejected;
2. an ungranted scope is rejected;
3. `medicationRequest.search` issues a bearer token and returns a FHIR `Bundle` with `type=searchset`;
4. `MedicationRequest?_count=1` exposes a safe next cursor and the next page advances to a different logical resource;
5. `medicationRequest.read` can directly read the first returned resource;
6. a conflicting `x-facility-id` header is rejected;
7. the same positive read/search/pagination/header checks pass for `MedicationAdministration`;
8. a `MedicationRequest`-only search token cannot search `MedicationAdministration`;
9. a `MedicationAdministration`-only search token cannot search `MedicationRequest`.

The script intentionally does not print FHIR resource bodies, patient demographics, medication names, secrets, or tokens.

## Manual audit evidence

After the automated suite passes, inspect Medora's facility-scoped machine audit trail for the certification execution. Confirm that the expected token issuance and FHIR machine-resource access events were recorded against the test integration, credential key, and facility. Audit evidence must not expose the client secret or bearer token.

Capture only PHI-safe evidence in the certification record: timestamp, resource type, interaction, outcome/status, client/integration identifier, key identifier, facility identifier, request/correlation identifier, and audit action name where available.

## Acceptance criteria

Phase 2B is internally complete only when all of the following are true:

- implementation PR is merged and deployed;
- all four medication scopes are synchronized to the dedicated test machine client;
- the automated deployed certification workflow passes;
- positive direct read and search are proven for both resources;
- cursor pagination is proven for both resources;
- wrong-facility and conflicting-facility defenses pass;
- cross-resource missing-scope checks return HTTP 403;
- ungranted token scope returns HTTP 403;
- facility-scoped machine audit evidence is reviewed and retained.

If any item fails, Phase 2B remains open. Do not compensate by granting broader scopes or adding generic `fhir.*` permissions.

## Post-certification

After Phase 2B closes, continue the resource-expansion roadmap with the next governed clinical resource set. FHIR create/update/patch/delete remains outside this gate and must not be enabled as part of certification remediation.
