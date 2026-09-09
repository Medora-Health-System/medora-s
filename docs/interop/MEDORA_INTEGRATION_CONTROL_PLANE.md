# Protocol-neutral integration control plane

P0.3A adds non-secret integration configuration shared by FHIR R4 and future HL7 v2 adapters.
`Integration` owns partner, protocol, direction, environment, jurisdiction, state, contacts, and
allowlisted non-secret endpoint metadata. `IntegrationFacilityAuthorization` grants no facilities
implicitly. `IntegrationPermission` accepts only production-enabled/evidenced capability-registry
codes. Platform authority is resolved from active database state, the `canCreateFacilities`
defence-in-depth flag, and an active `MEDORA_SUPER_ADMIN` assignment.

The six-step Administration wizard collects partner, protocol, direction, explicit facilities,
server-supplied permissions, and review. HL7 v2 is visible but disabled until P0.4. Saved records
remain `DRAFT` / `PENDING_PROVISIONING`; they cannot authenticate or access clinical data.

## Credential boundary (P0.3E)

P0.3E must add hash-only secrets or key-based identity, one-time secret disclosure where
applicable, rotation, revocation, token issuance, client/facility scopes, exchange attribution, and
distributed rate limiting. No plaintext secret column or credential endpoint exists in P0.3A.
`endpointConfig` is not a credential store: its strict allowlist accepts only non-secret URLs,
authentication method labels, public-key references and scopes; credential-shaped keys and unknown
nested properties are rejected. Future credentials must use the P0.3E credential/key-management
subsystem and are never stored in `endpointConfig`.

A future inbound connection package may include partner/environment, explicitly authorized
facilities, base and metadata URLs, authentication method, client identifier, allowed scopes,
public-key registration, support details and test instructions. It must never contain source code,
database/admin credentials, a permanent global key, or a stored plaintext secret. Outbound
configuration may retain endpoint, token URL, public-key/certificate metadata and a secure-secret
reference only after a secret-manager boundary exists.

P0.4 may extend protocol-specific configuration for MLLP/TLS host/port, applications/facilities,
message types, HL7 version and ACK policy without creating a second partner/tenant model.
