# MEDORA.RD.P0.3H — Production M2M Certification & Credential Lifecycle Hardening

**Status:** implementation and CI evidence phase. This document does not by itself certify a deployed environment.

## Scope

P0.3H hardens the FHIR machine-client lifecycle and defines the deployed acceptance gate for Medora's read/search FHIR R4 surface.

This phase adds:

- credential inventory without exposing hashes or plaintext secrets;
- per-key credential revocation;
- overlap-safe rotation followed by selective old-key retirement;
- existing-client scope synchronization after new Integration permissions are granted;
- current Integration permissions as the hard maximum for machine-client scopes;
- immediate effective permission reduction because runtime scope resolution intersects the client scope rows with current `IntegrationPermission` rows;
- administrator UI for Integration permissions, client scopes, key status, last-use evidence, rotation, per-key revoke, and whole-client revoke.

P0.3H does **not** add FHIR create/update/patch/delete interactions and does not claim external HL7, US Core, SMART, or ONC certification.

## Dependency

P0.3H is stacked on the current-main reconciliation of P0.3C clinical resources. The intended read/search surface after that reconciliation is:

- Patient
- Encounter
- Observation
- Practitioner
- PractitionerRole
- Organization
- Location
- Condition
- ServiceRequest
- DiagnosticReport
- CarePlan

The clinical reconciliation adds exact machine scopes for Condition, ServiceRequest, DiagnosticReport, and CarePlan. Pharmacy-specific resources such as MedicationRequest, MedicationDispense, and MedicationAdministration remain outside this certification scope.

## Credential lifecycle contract

1. Provisioning returns Client ID, Key ID, Client Secret, Facility ID, and scopes once.
2. Medora stores only an Argon2id secret hash.
3. Rotation creates a new key and secret without silently invalidating the previous key.
4. The administrator tests the new key before retiring the old key.
5. Per-key revocation immediately prevents both new token issuance with that key and runtime use of already-issued machine tokens signed from that key, because every machine request revalidates the backing credential state.
6. Whole-client revocation invalidates all credentials for the client.
7. Client scopes must always be a subset of current Integration permissions.
8. Removing an Integration permission takes effect immediately at runtime through effective-scope intersection.
9. Newly added Integration permissions are not silently granted to an existing client; the administrator explicitly synchronizes client scopes.

## Production deployment prerequisites

The API environment must include:

- `MEDORA_INTEROP_ENABLED=true`
- `FHIR_M2M_ACCESS_SECRET=<strong random secret, minimum 32 characters>`
- `FHIR_PUBLIC_BASE_URL=https://api.medoras.com/fhir`

The machine-client migration from the provisioning phase must already be applied:

- `20260913170000_fhir_m2m_provisioning`

Before certification, confirm:

```bash
pnpm --filter @medora/api migrate:deploy
pnpm --filter @medora/api exec prisma migrate status
```

## Laboratoire C deployed acceptance matrix

Use the non-production `Laboratoire C` Sandbox/Test Integration as the first full acceptance target.

### A. Registration and scope authority

- Integration is FHIR_R4, SANDBOX, CONFIGURED/PROVISIONED.
- Exactly one intended Medora facility is authorized.
- Grant the intended read/search permissions in the FHIR Permission Manager.
- Synchronize the existing machine client after newly granting P0.3C clinical permissions.
- Verify the machine-client scope list is an exact subset of Integration permissions.

### B. Credential issuance

- Rotate to a fresh key.
- Record Client ID, Key ID, one-time Client Secret, Facility ID, Token URL, and FHIR Base URL.
- Click **Test Credentials**.
- Required result: visible PASS and a short-lived token issuance result.
- Verify the key's `lastUsedAt` becomes populated.

A Test Credentials PASS proves token issuance only. It does not complete FHIR certification.

### C. Real FHIR resource round trip

Exchange the client credentials at:

`POST https://api.medoras.com/fhir/auth/token`

Then call at least one populated granted endpoint with the returned bearer token, for example:

- `GET /fhir/Patient?...`
- `GET /fhir/Encounter?...`
- `GET /fhir/Observation?...`
- `GET /fhir/Condition?...`
- `GET /fhir/ServiceRequest?...`
- `GET /fhir/DiagnosticReport?...`
- `GET /fhir/CarePlan?...`

Required result: HTTP success with a valid FHIR resource/searchset and data only from the authorized facility.

### D. Negative security cases

All of these are mandatory:

- wrong Facility ID at token issuance is rejected;
- conflicting `x-facility-id` on a machine request is rejected;
- ungranted scope at token issuance is rejected;
- access to a resource interaction missing from token scopes is rejected;
- a client cannot switch to another facility;
- a disabled/revoked Integration cannot be used;
- a revoked key cannot mint a new token;
- a token issued through a key that is subsequently revoked is rejected on later resource use;
- whole-client revocation blocks all of its keys and machine tokens.

### E. Rotation acceptance

- old key works before revocation;
- rotate to a new key;
- new key works;
- old key remains usable only during the intended overlap window;
- revoke old key only;
- old key fails while new key continues to work;
- the UI reports only currently ACTIVE keys as active credentials.

### F. Audit evidence

Verify audit records identify, without logging secrets or clinical narrative:

- integration ID;
- machine client ID;
- facility ID;
- key ID where applicable;
- token issuance;
- resource type and interaction;
- credential rotation/revocation;
- scope replacement;
- whole-client revocation.

## Certification decision rule

The current Medora read/search M2M FHIR surface may be called **production-certified internally** only when all of the following are true:

1. the clinical reconciliation PR and P0.3H PR are merged and deployed;
2. all required CI checks are green;
3. production migrations are current;
4. the Laboratoire C deployed positive and negative tests above pass against the deployed API;
5. machine audit evidence is confirmed;
6. no unresolved P0/P1 security defect exists in the covered surface.

Even after this internal gate passes, do not market Medora as "HL7 FHIR certified," "US Core certified," "SMART certified," or "ONC certified" unless the applicable external conformance/certification process is separately completed.

## Deferred interoperability work

Not certified by P0.3H:

- canonical FHIR clinical writes;
- staged inbound proposal reconciliation unless separately promoted to current main;
- MedicationRequest / MedicationDispense / MedicationAdministration;
- AllergyIntolerance until canonical identity/version governance is resolved;
- full SMART App Launch / Backend Services conformance;
- US Core or national implementation-guide conformance;
- general outbound Medora-as-FHIR-client connectivity to arbitrary partner FHIR servers.
