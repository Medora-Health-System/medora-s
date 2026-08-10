# D4SEC.1C.4B audit — staff persona and lifecycle foundation

## Verdict

**PASS TO IMPLEMENT.** Repository evidence disclosed no new P0 ambiguity and supports a smallest additive design. `User.id` is the identity key; the D4SEC.1A resolver requires active user, `canCreateFacilities`, and an active `MEDORA_SUPER_ADMIN` assignment without email. D4SEC.1C.3 resolves authority solely from active `PlatformCapabilityGrant` rows after active User/profile checks. D4SEC.1C.4A's principal mutation decorator requires recent MFA from the authenticated session projection.

## Evidence and design decision

* `MedoraStaffProfile` already owns global staff activation, restrictive User FKs, classifier/deactivator attribution, and no facility relation. Extend it with nullable `persona`; null intentionally identifies pre-4B legacy classifications rather than fabricating a persona.
* Existing grants preserve immutable grant/revoke attribution and use restrictive FKs, but lacked provenance. Add `provenance` (`MANUAL` default for all historical and ordinary grants) plus `managedPersona`, with a database check tying `PERSONA` to a persona and forbidding a persona on `MANUAL`.
* Profile fields provide current state but not append-only transition history. Add `MedoraStaffLifecycleEvent` with restrictive profile/actor FKs and old/new persona and activation state.
* The authoritative capability catalog contains all 20 requested template entries. None is `CRITICAL`. All catalog entries marked `CRITICAL` are excluded by a runtime risk-level fail-closed check, not a fragile hand-maintained denylist.
* The resolver queries one User projection: activation, staff activation, and explicit grants/capability codes. It does not query patients, encounters, charts, medications, orders, results, facility membership, or `UserRole`.
* The capability guard remains distinct from clinical `RolesGuard`. Persona is absent from both guards and from the resolver.
* Existing classification and manual grant/revoke routes are principal-only and already use required security audit writes. Lifecycle routes can reuse the same principal-only + session-recent-MFA decorator. No delegated capability authority is introduced.
* Security-admin audit accepts a transaction client and rejects sensitive metadata keys, enabling atomic fail-closed lifecycle events.
* Historical migration `20261102120000_d4sec_1c3_medora_staff_capability_engine` has restrictive identity/attribution FKs and a partial unique active-grant index. Historical migrations remain untouched.

## Audit inventory

The audit reviewed Prisma User/AuthSession/UserRole/staff/capability models and migrations; platform principal resolver; capability resolver, guard, decorator, controller, service and DTOs; JWT/AuthSession MFA projection and step-up service; security-admin audit writer; RolesGuard; and migration history. There is no duplicate identity, clinical role, facility membership, capability, MFA, or audit authority required.
