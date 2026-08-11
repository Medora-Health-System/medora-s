# D4SEC.1C.5A preimplementation plan

The repository audit found no P0 authority conflict. Implementation follows the requested order and does not change schema or historical migrations.

1. **A:** Resolve landing and workspace-switch visibility by `GET /platform/context`; share the existing Medora-S wordmark.
2. **B:** Retain the bounded facility directory, add client filtering, capability-gated creation through `AdminFacilitiesService`, and bounded detail.
3. **C:** Add a BFF for the existing session-bound step-up endpoint and a reusable modal that retries once.
4. **D/E:** Add eligible-user projection, staff detail, privileged provision forms, and complete request decisions without bypassing dual control.
5. **F-H:** Adapt real health, backup, go-live, compliance, export and billing services behind platform capability guards and explicit facility scope.
6. **I:** Preserve catalog engines and make their scope explicit; do not duplicate them.
7. **J:** Documentation-only cleanup audit; no production read or mutation.

Security invariants: server capability resolution is authoritative; complete principal resolution remains D4SEC.1A-only; clinical roles and platform capabilities do not imply one another; TOTP and tokens are not persisted or logged by UI; no PHI/global claims projection; immutable privileged scope is enforced only by the backend.

## Completion-pass plan

The completion pass preserves slices A–E and completes the proven integrations without touching clinical workflow files: refactor facility business logic behind explicit preauthorized platform adapters; add immutable facility-target and MFA-reset privileged scopes; render typed operational views; project count-only ROI, catalog audit, and facility-scoped revenue-cycle reads; retain existing clinical and MSPP authorities. One additive migration is required solely because the certified privileged request schema previously enforced a User target and could not safely represent a Facility target.
