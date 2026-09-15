# MEDORA.RD.P0.3H — Deployed Certification Runbook

This runbook operationalizes the deployed acceptance matrix in `MEDORA_RD_P0_3H_FHIR_M2M_CERTIFICATION.md`.

## 1. CI baseline

Before deployed certification, confirm the normal `FHIR Certification` workflow is green on the P0.3H merge commit. That workflow covers PostgreSQL-backed machine identity/security, clinical read/search security, admin permission lifecycle, and the integration-manager UI regression suite.

## 2. Configure deployed certification secrets

Create repository or environment secrets for a current **Laboratoire C** sandbox credential:

- `FHIR_CERT_CLIENT_ID`
- `FHIR_CERT_KEY_ID`
- `FHIR_CERT_CLIENT_SECRET`
- `FHIR_CERT_FACILITY_ID`

The one-time client secret must be transferred into GitHub Secrets immediately after credential creation/rotation. Do not place it in source, PR text, issue comments, screenshots, or workflow inputs.

## 3. Run the non-destructive deployed suite

Run the GitHub Actions workflow **FHIR Deployed Certification** with:

- base URL: `https://api.medoras.com/fhir`
- allowed scope: a currently granted search scope (default `patient.search`)
- positive resource: its matching resource (default `Patient`)
- denied resource: a different resource (default `Observation`)

The harness performs the following against the deployed API without printing credentials or bearer tokens:

1. valid client-credential token issuance;
2. bearer-token FHIR search returning a `Bundle` with `type=searchset`;
3. wrong-facility token rejection;
4. ungranted-scope token rejection;
5. conflicting `x-facility-id` rejection;
6. resource access rejection when the issued token lacks that resource interaction scope.

A random UUID is used as the negative facility unless `FHIR_CERT_WRONG_FACILITY_ID` is supplied. The workflow writes a PASS/FAIL evidence table to the GitHub Actions job summary.

## 4. Complete deployed lifecycle evidence

The automated suite is intentionally non-destructive. Complete these administrator-controlled checks in the Integration Manager:

1. Verify the tested credential now shows `lastUsedAt` / Last used.
2. Rotate to a fresh credential and securely update `FHIR_CERT_KEY_ID` and `FHIR_CERT_CLIENT_SECRET`.
3. Run **FHIR Deployed Certification** again and require PASS.
4. Confirm the previous key still works during the intended overlap window.
5. Revoke the previous key only.
6. Confirm the revoked key cannot mint a token and any token previously issued through that key is rejected on resource use.
7. Confirm the new key still works after old-key revocation.
8. On a disposable certification client/integration, verify whole-client revocation blocks all keys and previously issued machine tokens.

Do not revoke the only usable production-partner client solely for certification. Whole-client revocation must be tested against a disposable sandbox integration/client unless an approved recovery plan exists.

## 5. Audit evidence

Confirm the audit trail contains the P0.3H events required by the primary certification document, including:

- token issuance;
- FHIR resource interaction;
- credential rotation;
- per-key credential revocation;
- client-scope replacement where exercised;
- whole-client revocation on the disposable certification client;
- integration ID, machine client ID, facility ID, and key ID where applicable.

No client secret, bearer token, secret hash, or clinical narrative should be present in the certification evidence.

## 6. Internal certification decision

P0.3H may be marked **production-certified internally** only after all of the following are true:

- P0.3C reconciliation and P0.3H are present on `main` and deployed;
- normal FHIR Certification CI is green;
- deployed non-destructive certification workflow is green;
- rotation/per-key-revocation/whole-client-revocation deployed evidence is complete;
- required audit evidence is confirmed;
- production migrations are current;
- no unresolved P0/P1 security defect exists in the covered read/search M2M surface.

This remains an internal Medora production-readiness gate. It is not external HL7, US Core, SMART, or ONC certification.
