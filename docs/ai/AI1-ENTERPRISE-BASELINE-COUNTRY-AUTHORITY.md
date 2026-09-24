# AI-1 — Enterprise baseline and country authority

## Scope of this first non-destructive implementation

This branch introduces a pure, fail-closed country/language authority foundation and unit tests. It does not enable external AI, alter chart data, change API behavior, migrate databases, or activate jurisdictional billing or clinical rules.

## Existing implementation baseline (audit findings)

- API module: `apps/api/src/ai/ai.module.ts`.
- Authenticated chart-review API and feedback: `apps/api/src/ai/ai-chart-review.controller.ts`.
- Encounter-scoped snapshot and country extraction: `apps/api/src/ai/snapshot/encounter-ai-snapshot.builder.ts`.
- Deterministic review and optional external review: `apps/api/src/ai/review/clinical-review-orchestrator.service.ts`.
- Existing country resolver: `apps/api/src/ai/snapshot/resolve-encounter-care-setting.ts`.
- Provider-wide enablement currently applies to every facility: `apps/api/src/ai/core/ai-feature-flags.service.ts`.
- Chart-review controller currently accepts a client locale parameter and platform-principal facility context. Both require authorization and trusted facility-language review before jurisdictional model activation.
- Snapshot reads have bounded collections. Completeness/truncation must be audited before claiming whole-chart coverage.
- Clinical AI audit telemetry failures are currently swallowed by the controller. Mandatory access logging requires separate assessment.

## Country authority contract

Only the facility's persisted country can determine jurisdiction. The facility's persisted language determines presentation language independently. No language-to-country or country-to-language inference is permitted. Unsupported country/language must fail closed. The initial US/DO/HT policy namespaces are identifiers, **not** approved clinical or reimbursement rule sets. All documentation and billing jurisdiction rules remain disabled pending reviewed sources, legal applicability, clinical governance, and tests.

## Follow-on changes required before external AI activation

1. Wire the authoritative facility country and language read into the chart-review request path and remove browser-selected jurisdiction/locale authority.
2. Enforce provider/encounter/facility access without general administrative or platform privilege automatically granting clinical PHI access.
3. Replace provider-wide enablement with explicit facility/category/role approvals, default off.
4. Require mandatory PHI-safe access audit with appropriate failure policy; verify external provider authorization, contractual safeguards and data retention.
5. Inventory all snapshot domains, detect truncation and missing sources, and verify cross-facility isolation.
6. Establish versioned, clinically approved jurisdictional clinical and billing sources before generating jurisdiction-specific recommendations.

## Verification

Run `pnpm --filter @medora/api exec jest --runInBand src/ai/core/ai-country-authority.spec.ts` on the branch, then broader AI tests, typecheck and CI. No test or deployment result is asserted by this document.
