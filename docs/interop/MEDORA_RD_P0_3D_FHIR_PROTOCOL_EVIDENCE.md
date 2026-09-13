# MEDORA.RD.P0.3D — FHIR R4 protocol hardening evidence

**Phase:** P0.3D  
**Scope:** protocol contract only; no FHIR writes, no new canonical clinical storage  
**Baseline:** P0.3C hosted head `dde4883f4e4737804a14d16480065b64b23841e8`

## Implemented controls

| Control | Implementation | Evidence |
|---|---|---|
| Accurate CapabilityStatement search metadata | Search parameters are typed as reference/date/string/number/token instead of being generically advertised as references. Only enabled registry interactions remain advertised. | `fhir.controller.ts`, `fhir-protocol-hardening.spec.ts` |
| Opaque keyset pagination | `_cursor` values are HMAC-signed opaque envelopes. Raw canonical IDs are not exposed in continuation tokens. The envelope is versioned and resource-type bound. | `fhir-search.ts`, protocol hardening tests |
| Cursor tamper resistance | Cursor signature is verified with constant-time comparison; malformed, modified, or cross-resource cursors fail closed with HTTP 400 through the FHIR error filter. | `fhir-search.ts`, protocol hardening tests |
| Complete searchset page envelope | Search results include absolute `self` / `next` links, absolute `fullUrl`, `search.mode=match`, a deterministic page id, and a Bundle timestamp. Exact total is intentionally omitted because keyset queries do not calculate a full count. | `fhir-search.ts` |
| Instance read version metadata | Successful resource instance reads receive deterministic `meta.versionId` generated from the serialized representation. | `fhir-media.interceptor.ts`, protocol hardening tests |
| HTTP ETag | Successful instance reads return a weak ETag matching `meta.versionId`. Search Bundles and metadata are not assigned instance ETags. | `fhir-media.interceptor.ts`, protocol hardening tests |
| Strict unknown search | Existing strict allowlists remain authoritative. Repeated/unsafe/oversized parameters fail before repository access. | `fhir-protocol.ts`, `fhir-search.ts`, existing foundation tests |
| Media hardening | Only FHIR JSON / JSON response media are accepted; non-read request media remain constrained; `Vary: Accept` is emitted. | `fhir-media.interceptor.ts` |
| URI / response ceilings | Oversized request URIs fail with 414; oversized serialized responses fail safely. | `fhir-media.interceptor.ts` |
| Sanitized OperationOutcome | FHIR errors remain PHI-safe and now cover 414/415/503 and emit `Allow: GET, HEAD` for unsupported write methods. | `fhir-operation-outcome.filter.ts` |
| No clinical writes | P0.3D does not add POST/PUT/PATCH/DELETE capabilities. | capability registry remains read/search only |

## P0.3C semantic closure carried forward

P0.3D also closes two search-semantic issues discovered during independent P0.3C review:

1. `ServiceRequest?status=` now selects every canonical `OrderStatus` that projects to the requested FHIR status (`active`, `completed`, `draft`, `revoked`).
2. Combined `Condition?clinical-status=&verification-status=` filters now use intersection semantics, so contradictory combinations return an empty searchset rather than contradictory resources.

These corrections do not broaden access, alter tenant scoping, or introduce writes.

## Security properties preserved

- Facility predicates remain inside canonical repository queries.
- Cursor contents are never accepted as tenant authority; decoded keys are only pagination lower bounds inside already tenant-scoped queries.
- Runtime FHIR exposure remains gated by `MEDORA_INTEROP_ENABLED`.
- The cursor signing key is `FHIR_CURSOR_SIGNING_KEY`, with `JWT_SECRET` as the deployment-compatible fallback. Deployments should set a dedicated FHIR cursor key when practical.
- OperationOutcome diagnostics do not echo request values, SQL details, paths, credentials, MRNs, or clinical content.

## Deferred to P0.3E+

Machine-to-machine client identity, credential issuance/rotation/revocation, least-privilege integration scopes, distributed rate limiting, and integration-client audit attribution remain P0.3E. No P0.3D code should be interpreted as enabling unauthenticated or machine-authenticated FHIR access.
