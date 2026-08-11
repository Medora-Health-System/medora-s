# D4SEC.1C.5C certification

## Certified statement
**Yes: ordinary Medora Staff provisioning is now a one-person capability-authorized operation.** The same authenticated active administrator may finish it after recent session-bound MFA. No second administrator, approval, or `PrivilegedActionRequest` is required.

## Controls retained
- Server-side `STAFF_PROVISION` or authoritative Platform Principal resolution; workspace visibility grants nothing.
- Active actor/target validation, self-mutation prohibition, canonical persona validation, unique staff identity, persona-derived grants, lifecycle history, and transactional critical audit.
- MFA remains current-session authentication assurance.
- Denied capability/MFA attempts are critically audited, and required audit failure aborts provisioning.
- CRITICAL/root-equivalent manual grants, facility activation, and MFA reset retain the D4SEC.1C.4C independent-approval state machine. Platform Principal invariants remain unchanged.
- EN/FR labels, confirmation, validation, MFA, authorization, duplicate, and inactive-target messages are presentation-only.

## Database certification
Prisma schema changed: NO  
Migration required: NO  
Seed required: NO

No production access, deployment, merge, production migration, or production seeding is part of this certification.
