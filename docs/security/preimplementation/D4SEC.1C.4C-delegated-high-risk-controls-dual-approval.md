# D4SEC.1C.4C preimplementation design

The audit authorizes an additive request table, two enums, and one deterministic ungranted CRITICAL approval definition. Authority remains immutable `User.id` plus active `PlatformCapabilityGrant`, or the complete D4SEC.1A principal. Personas remain templates only.

| Operation | Delegated authority | MFA | Dual control | Direct path |
|---|---|---|---|---|
| staff/capability reads | `STAFF_VIEW` | catalog HIGH: recent MFA | no | existing API |
| provision staff | `STAFF_PROVISION` | requester + approver exact sessions | yes | principal bootstrap only |
| grant any capability | `STAFF_GRANT_CAPABILITIES` | requester + approver exact sessions | yes | principal bootstrap only |
| revoke capability | `STAFF_REVOKE_CAPABILITIES` | recent MFA | no, authority reducing | immediate |
| deactivate staff | `STAFF_PROVISION` | recent MFA | no, authority reducing | immediate |
| activate/classify/persona | principal | recent MFA | no delegated adapter | existing bootstrap |

States are `PENDING -> APPROVED -> EXECUTED`, or `PENDING -> REJECTED/CANCELLED/EXPIRED`; an expired approved request becomes `EXPIRED`; invalid transitions fail closed. TTL is 900 seconds by default, centrally configurable. Scope is strict operation-specific input canonicalized in stable property order and SHA-256 hashed. The protected execution transaction claims once, revalidates, mutates, records provenance/audit, and commits execution together.

No seed, frontend, generic command executor, clinical authority, production operation, or D4SEC.1C.5 work is planned.
