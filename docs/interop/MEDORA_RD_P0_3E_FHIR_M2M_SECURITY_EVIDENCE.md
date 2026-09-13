# MEDORA.RD.P0.3E — FHIR R4 machine identity, scopes, credential lifecycle, and distributed limits

**Phase:** MEDORA.RD.P0.3E  
**Scope:** machine-to-machine identity/security for the read/search-only FHIR R4 surface  
**Clinical writes:** **NOT ENABLED**  
**Runtime exposure gate:** `MEDORA_INTEROP_ENABLED=true`

## 1. Security contract

P0.3E adds a dedicated machine principal without weakening the existing human JWT path. FHIR resources continue to use the same tenant-scoped repositories and capability registry. A machine client can reach a resource interaction only when all of the following remain true at request time:

1. the FHIR deployment gate is enabled;
2. the signed short-lived machine token is valid for the configured issuer/audience;
3. the integration client is active and not revoked;
4. the specific credential key referenced by the token is active and unexpired;
5. the integration is not disabled and remains provisioned;
6. the client facility remains actively authorized on the integration;
7. the token facility matches the client facility and cannot be changed by `x-facility-id`;
8. the token scope remains present in both the client scope grant and the integration permission grant;
9. the capability registry still advertises the exact resource interaction;
10. the per-client/per-facility distributed rate bucket is below its configured ceiling.

No machine token grants a generic `fhir.*` permission. Scopes are the interaction-specific codes already owned by `FhirCapabilityRegistry`, such as `patient.read`, `patient.search`, `observation.read`, and `observation.search`.

## 2. Credential storage and rotation

Machine security state is isolated in PostgreSQL schema `interop`:

- `IntegrationClient`
- `IntegrationClientScope`
- `IntegrationClientCredential`
- `FhirIntegrationRateLimitBucket`

The existing protocol-neutral `Integration`, `IntegrationFacilityAuthorization`, and `IntegrationPermission` rows remain the administrative source of truth in the public schema.

Generated client secrets are random 32-byte values. Medora stores only an **Argon2id hash** and returns the plaintext secret once during provisioning or rotation. Credential rows have stable key IDs, creation time, optional expiry, revocation attribution, and `lastUsedAt`. Rotation is overlap-safe: a newly generated credential does not silently invalidate another unexpired credential; operators can revoke the old key after the external system is cut over. Client revocation immediately revokes every associated credential.

## 3. Token contract

`POST /fhir/auth/token` implements a narrow client-credentials-style exchange for Medora integrations. It is not advertised as SMART-on-FHIR conformance.

Successful tokens are short lived and contain:

- subject/client ID;
- integration ID;
- facility ID;
- granted interaction scopes;
- credential key ID;
- JWT ID;
- issuer/audience;
- issued/expiration times supplied by the JWT implementation.

The default access-token lifetime is 300 seconds and is bounded to 60–900 seconds. The signing key is independent from human access-token secrets (`FHIR_M2M_ACCESS_SECRET`). Runtime validation re-reads authoritative client/credential/facility/scope state on every request, so administrative revocation does not wait for token expiration.

## 4. Tenant and capability enforcement

`FhirContextGuard` now supports `actorType: human | machine`. Human membership lookup is unchanged. Machine context is facility-bound to the validated integration client; a conflicting facility header fails before resource access. Jurisdiction remains server-controlled from the active facility.

`FhirCapabilityGuard` remains the single route/capability decision point. Human callers are checked against `humanRoles`; machine callers are checked against the capability's exact `futureM2mScope`. No create/update/patch/delete capability is added by this phase.

## 5. Distributed throttling

Each authenticated machine request atomically increments a PostgreSQL minute bucket keyed by `(clientId, facilityId, windowStart)`. This makes the limit shared across API processes rather than process-local. The default is 120 requests/minute and is configurable with `FHIR_M2M_RATE_LIMIT_PER_MINUTE`.

Rate limiting is not treated as tenant authority; it is an additional abuse control after current client, credential, facility, and scope state are revalidated.

## 6. Audit attribution

Administrative provisioning, rotation, credential revocation, and client revocation are critical audit events. Token issuance records client/integration/key/scope-count/JWT-ID context without plaintext secrets. Successful machine FHIR access records integration ID, key ID, FHIR resource type, interaction, and request ID. Clinical values and machine secrets are not written to audit metadata.

## 7. Configuration

Required for machine-token use:

- `FHIR_M2M_ACCESS_SECRET` — distinct random signing secret, at least 32 characters;
- `FHIR_M2M_ISSUER` — default `medora-s`;
- `FHIR_M2M_AUDIENCE` — default `medora-fhir`;
- `FHIR_M2M_ACCESS_TOKEN_TTL_SECONDS` — default 300, accepted range 60–900;
- `FHIR_M2M_RATE_LIMIT_PER_MINUTE` — default 120.

P0.3D additionally requires `FHIR_CURSOR_SIGNING_KEY` for opaque search pagination.

## 8. Evidence tests

`fhir-machine-security.spec.ts` covers:

- exact machine interaction scope enforcement;
- facility binding and rejection of header-based tenant switching;
- runtime revalidation of client, credential, active facility authorization, current scope grants, and the distributed rate bucket;
- immediate denial of a revoked credential before scope/rate-limit work.

Hosted CI, migration deployment, TypeScript build, existing facility isolation/RBAC, and the broader FHIR regression suite remain authoritative release gates for this branch. This document does not claim certification beyond those executed gates.
