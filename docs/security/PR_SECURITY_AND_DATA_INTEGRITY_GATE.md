# Medora PR Safety Gate

Every change must follow this sequence before merge:

**requirement → threat/data-integrity analysis → implementation → unit tests → clinical/security regression tests → TypeScript/lint/build → CodeQL → Semgrep → SonarQube → dependency scan → PR review → deployment validation → merge**

## Requirement
- [ ] Requirement and acceptance criteria are explicit.
- [ ] Scope is narrow; unrelated refactors are excluded.

## Threat / data-integrity analysis
- [ ] Security boundaries and untrusted inputs are identified.
- [ ] PHI/sensitive-data exposure and logging were considered.
- [ ] RBAC, facility/patient isolation, authentication/MFA impacts were considered.
- [ ] Clinical-data integrity was reviewed: authorship/signatures, orders vs administrations, medication identifiers, timestamps, append-only/history semantics.
- [ ] No clinical value, identity, signature, or source fact is fabricated to satisfy validation.

## Verification
- [ ] Unit tests cover changed behavior and negative/adversarial cases.
- [ ] Relevant clinical/security regression tests pass.
- [ ] TypeScript, lint, and builds pass.
- [ ] CodeQL introduces no unresolved Critical/High credible exploit path.
- [ ] Semgrep introduces no unresolved Critical/High credible exploit path.
- [ ] SonarQube new-code security/reliability gate passes.
- [ ] Dependency scan introduces no unresolved Critical/High vulnerability.

## Review / release
- [ ] Scanner suppressions, if any, have written technical justification.
- [ ] Reviewer checked security and clinical/data-integrity impact, not only syntax.
- [ ] Deployment/migration risk and rollback path are documented.
- [ ] Deployment validation/smoke plan is documented for behavior-affecting changes.
- [ ] Do not merge while required checks are failing or unresolved review conversations remain.
