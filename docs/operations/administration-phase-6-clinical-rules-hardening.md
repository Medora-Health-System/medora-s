# Administration Phase 6 — Clinical Rules Builder hardening

## Scope

Phase 6 certifies the Administration Clinical Rules Builder authority and policy-catalog durability boundary.

`/app/admin/enterprise-clinical-rules` → enterprise clinical rules API → exact facility ADMIN authority → facility clinical-policy catalog → rules engine → audited mutation/execution.

No rule condition/action semantics are changed in this phase.

## Administrative authority

The builder is a facility Administration surface. Catalog/conflict reads and rule create/update/activate/disable/archive/rollback operations now use the canonical facility/platform admin role set and revalidate exact active facility authority with `assertFacilityAdminFacilityScope` before policy access.

This closes the gap where controller role checks alone could be mistaken for facility authorization.

Provider/RN clinical access remains on purpose-specific encounter execution/simulation paths where already defined; it does not grant Administration catalog ownership.

## Facility catalog isolation

The file-backed MVP catalog is keyed by facility filename and memory-map key. Phase 6 adds a fail-closed invariant: an existing catalog loaded for Facility A must itself declare `catalog.facilityId === Facility A`.

A mismatched existing policy file is no longer accepted or silently treated as another facility's catalog.

## Durability defect repaired

Before Phase 6, `persistCatalog` updated the in-memory catalog first and swallowed filesystem write failures. The API could therefore acknowledge a clinical policy mutation that disappeared after process restart.

Clinical policy writes now:

1. write the complete catalog to a temporary file;
2. atomically rename the temporary file to the facility catalog destination;
3. update process memory only after durable replacement succeeds;
4. fail the request if persistence fails.

The service also stops silently reseeding malformed/mismatched existing clinical-policy files. Missing files may still receive the deterministic facility seed.

This materially improves single-node durability, but the file-backed store remains an MVP architecture rather than a horizontally scalable database-backed policy registry.

## Existing safeguards retained

The rules engine continues to own:

- optimistic catalog version checks;
- rule versioning;
- activation/status/rollback semantics;
- conflict analysis;
- facility scope normalization on upsert;
- simulation with no side effects;
- encounter queries constrained by `encounterId + facilityId`;
- critical audit evidence for policy mutations.

## Regression evidence

Tests prove:

- exact active facility ADMIN authority before catalog read;
- foreign-facility catalog access denied before service execution;
- foreign-facility activation denied before mutation execution.

## Production caveat

The file-backed catalog cannot be called fully enterprise multi-instance storage. Phase 6 makes the current architecture fail-closed and durable on its node. A future migration to transactional shared storage should preserve the same catalog/version/audit contract before multi-instance active-active deployment.

## Non-goals

No Application Modules, workflow definitions, clinical action semantics, Revenue Cycle, Integrations, or internal Medora billing are changed.
