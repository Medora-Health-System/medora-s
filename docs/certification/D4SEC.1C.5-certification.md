# D4SEC.1C.5 certification

## Verdict

Implementation is certifiable when the recorded build and regression commands pass. The UI consumes rather than replaces D4SEC.1A and D4SEC.1C.3–1C.4C authorities.

## Acceptance evidence

The frontend policy tests cover denial for facility/clinical users, STAFF_VIEW without grant, principal breadth, persona non-authority, explicit capability navigation and revocation refresh semantics, inactive/session denial state, MFA guidance, self/target approval presentation, terminal-state execution denial, minimization, and area mappings. Backend certified suites remain the authority for self-approval, expiry, replay, immutable scope, session binding, lifecycle, audit integrity, and capability resolution.

Enterprise audit calls `GET /platform/audit/events` and consumes only its safe projection. The platform shell requests no patient or encounter APIs. Privileged rows contain no request/approval session identifiers or scope digest.

## Deferred features and residual risk

Operational aggregates and multiple global monitoring/control APIs do not exist and are explicitly unavailable. Existing catalog/system links enter legacy `/app/admin` destinations whose route presentation is role-oriented; their APIs remain guarded, but future work should give them platform-native bounded projections. Facility mutations remain principal-only and are not falsely presented as delegated dual-control operations. Automated browser screenshot infrastructure and seeded platform identities may not be present; visual validation must be reported only if actually performed.

## Database and production

Schema changed: **NO**. Migration: **NO**. Seed: **NO**. Production access, mutation, migration, seed, deployment, and merge: **not performed**.
