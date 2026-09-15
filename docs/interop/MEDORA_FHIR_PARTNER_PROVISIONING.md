# Medora FHIR partner provisioning

Registration and machine provisioning are separate controls.

1. A platform administrator creates the Integration and grants explicit Medora facilities and FHIR scopes.
2. In **Administration → Integrations → FHIR Connection Manager**, the administrator opens the Integration and generates a facility-bound machine client.
3. Medora returns a `clientId`, `keyId`, and `clientSecret` once. Only an Argon2id hash of the secret is retained.
4. The partner exchanges those values at the configured token URL using `grant_type=client_credentials` and its authorized Medora facility ID.
5. The returned short-lived bearer token can only use currently-granted FHIR scopes and cannot switch facilities.
6. Rotation creates a new secret without revealing the old one. Revocation invalidates the client and its credentials.

Production/runtime configuration:

- `MEDORA_INTEROP_ENABLED=true` to expose the approved FHIR runtime.
- `FHIR_M2M_ACCESS_SECRET=<at least 32 random characters>` to sign machine access tokens. This must be different from human JWT secrets.
- Optional `FHIR_M2M_ISSUER` (default `medora-s`).
- Optional `FHIR_M2M_AUDIENCE` (default `medora-fhir`).
- Optional `FHIR_M2M_TOKEN_TTL_SECONDS` (default 300, bounded 60–900).
- Optional `FHIR_M2M_RATE_LIMIT_PER_MINUTE` (default 120).
- Optional `FHIR_PUBLIC_BASE_URL` (default `https://api.medoras.com/fhir`).

The production database must apply migration `20260913170000_fhir_m2m_provisioning` before provisioning a machine client.

## First sandbox acceptance path

Use the existing `Laboratoire C` sandbox Integration:

1. Open FHIR Connection Manager → `Laboratoire C`.
2. Confirm the expected authorized facility and granted scopes.
3. Generate Sandbox Credentials.
4. Copy Client ID, Key ID, Client Secret, Facility ID, FHIR Base URL, and Token URL.
5. Click **Test Credentials** before leaving the page. PASS proves the one-time secret can authenticate and a short-lived machine token is issued for the current facility/scopes.
6. Use the generated token against a granted FHIR read/search endpoint (Patient/Encounter/Observation and administrative resources currently available on `main`).
7. Verify a request for another facility or an ungranted scope is rejected.
8. Rotate the secret and verify the newly-issued secret authenticates; revoke the client when the sandbox exercise is finished.

This phase does not make unmerged clinical resources from PR #234 magically available on `main`; Condition, ServiceRequest, DiagnosticReport, CarePlan, and later departmental workflows still depend on that FHIR clinical-resource reconciliation.
