# D4SEC.1C.4B preimplementation decision

Implement five code-defined persona templates. Store classification on `MedoraStaffProfile`; store explicit provenance on every grant; store transitions in an append-only lifecycle table. Keep runtime authorization unchanged and explicit-grant based. Lifecycle operations remain D4SEC.1A principal-only and use the D4SEC.1C.4A recent-session-MFA mutation decorator.

Reconciliation runs in the same Prisma transaction as profile state, history, and required audit. It validates the complete template against active catalog rows, rejects any catalog row whose risk is `CRITICAL`, adds missing explicit `PERSONA` grants, revokes only obsolete active `PERSONA` grants, and preserves all `MANUAL` grants (including critical grants). Deactivation retains every grant row and makes the existing resolver return zero through profile activation.

No seed is required: personas/templates are versioned policy constants, while capabilities remain the D4SEC.1C.3 catalog. No email lookup, identity creation, clinical/facility write, delegated administration, purpose-bound PHI access, approval workflow, or dashboard is in scope.
