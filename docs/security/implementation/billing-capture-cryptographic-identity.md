# Billing capture cryptographic identity

## Scope and root cause

Phase 1 follow-up based on main `80295548` (includes PR #527). The shared
`newBillingCaptureItemId` helper generated a timestamp plus `Math.random()` when
Web Crypto UUID support was unavailable. These are persisted record identifiers,
not disposable UI keys: ledger synchronization uses `captureItemId`, infusion
review selects and updates rows by ID, and the capture reader deduplicates by ID.
A collision can therefore discard a capture row or misassociate a review. This
is an identity-integrity weakness; ID unpredictability is not authorization.
No scanner alert ID or scanner severity is asserted by this source review.

## Change and failure behavior

New candidates require `crypto.randomUUID()`. Missing support or generator failure
throws before a candidate is returned, with no timestamp/PRNG fallback. The shared
package stays browser-compatible without importing Node crypto. CI uses Node 22,
which supports this API. Verify the actual deployment runtime before release.

Existing read, merge, source deduplication and ledger behavior is unchanged.
Legacy identifiers remain readable and are not migrated. No clinical facts,
timestamps, authorship, diagnoses, medication identifiers or order/administration
states are generated or rewritten by this change. Facility and encounter checks
remain necessary and unchanged. The error includes no PHI or supplied payload.

This fix does not audit transaction boundaries around all callers, repair old
collisions, or assert completion of Phase 1. Runtime loss of secure UUID support
now fails explicitly and must be treated as a deployment defect.

## Regression protection

`billingCaptureIdentity.test.ts` covers UUID propagation, preserved clinical
attribution, missing/non-callable crypto support, generator failure, and reading
and merging legacy records without access to crypto. The PR Quality Gate runs
these tests together with existing billing timestamp, order attribution,
acknowledgement and medication administration safety tests. No gate or scanner
suppression is relaxed.

## Deployment validation and rollback

After the full PR checks pass, use synthetic data in staging to generate a
diagnosis billing candidate and a documented administration billing candidate.
Confirm valid UUIDs, correct facility/patient/source linkage and audit attribution,
and that an existing legacy capture can still be reviewed by its unchanged ID.
Confirm an order alone does not become an administration. These staging checks
are release requirements, not claimed as executed by the unit tests.

No database or dependency migration is needed. Roll back the code commit if
required; newly generated UUIDs were already accepted by the previous reader.
Do not rewrite or delete stored capture records during rollback.
