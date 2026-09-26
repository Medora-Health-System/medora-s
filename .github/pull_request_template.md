## Summary

<!-- What this PR does and the requirement it satisfies. -->

## Threat / data-integrity analysis

<!-- Identify trust boundaries, untrusted inputs, PHI/sensitive logging, RBAC/facility/patient isolation, clinical authorship/signature/history, medication/order/MAR integrity, and failure behavior. Write "No material impact" only with a reason. -->

## Tests and evidence

<!-- Unit, adversarial, clinical/security regression, typecheck/lint/build. -->

## Deployment validation / rollback

<!-- State post-deploy smoke checks and rollback/migration constraints. -->

## Mandatory safety checklist

- [ ] Requirement and acceptance criteria are explicit
- [ ] Threat/data-integrity analysis completed
- [ ] Unit/adversarial tests added or existing coverage identified
- [ ] Relevant clinical/security regression tests pass
- [ ] TypeScript/lint/build pass
- [ ] CodeQL reviewed
- [ ] Semgrep reviewed
- [ ] SonarQube new-code gate reviewed
- [ ] Dependency findings reviewed
- [ ] No scanner finding was suppressed without written justification
- [ ] No clinical source fact, authorship, signature, medication identity, order/administration state, or timestamp was fabricated/overwritten
- [ ] Deployment validation and rollback path documented
- [ ] No mixed UI + workflow refactor when either change is large/risky
- [ ] Relevant roles exercised (see `docs/SMOKE_TEST_CHECKLIST.md` / `docs/CLINICAL_REGRESSION_MATRIX.md`)
- [ ] Docs/runbooks updated when behavior or setup changed

## Reviewer notes

<!-- Risks, migrations, scanner triage, follow-ups. -->
