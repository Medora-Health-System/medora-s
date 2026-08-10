# D4SEC.1C.4B certification

## Verdict: CONDITIONAL PASS

* **Persona model:** five code-defined templates plus nullable-on-legacy `MedoraStaffProfile.persona`; persona is never an authorization input.
* **Lifecycle model:** profile `isActive` is current authority state; append-only `MedoraStaffLifecycleEvent` records PROVISION, ACTIVATE, DEACTIVATE, and PERSONA_CHANGE.
* **Grant provenance:** explicit `MANUAL`/`PERSONA`, constrained `managedPersona`, immutable inactive grant history.
* **Authority:** lifecycle is existing D4SEC.1A platform-principal only. No delegated `STAFF_PROVISION` authority.
* **Recent MFA:** existing principal mutation decorator requires authenticated-session MFA freshness. No client proof is accepted.
* **Clinical isolation:** no persona/template maps to roles, membership, patient/chart/encounter access; resolver remains a narrow explicit-grant query. SUPPORT receives only operational health and staff-view grants.
* **Audit:** required success event and lifecycle row share the mutation transaction. Actor is immutable User ID. Audit failure aborts. Denials use `STAFF_MUTATION_DENIED` at the guard/self-mutation boundaries.
* **Migration:** schema validates and migration is additive. Disposable PostgreSQL deployment validation is required before release if it cannot be completed locally.
* **Seed:** none required; capability catalog remains D4SEC.1C.3 data and persona policy is code.
* **Residual risks:** pre-4B profiles have null persona until explicitly provisioned; concurrent lifecycle mutation serialization should be monitored; database migration deploy and database-backed integration verification remain release gates unless recorded as passed.

Conditional status becomes PASS after disposable PostgreSQL migration deployment and database-backed lifecycle integration checks pass in the release environment.
