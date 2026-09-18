# Phase 10B — ROI disclosure transactional integrity

Phase 10B continues the clinical mutation/data-integrity gate after the compliance incident repair.

## Defect

Chart ROI transitions used a read-check-write pattern:

1. read request by facility;
2. validate status in application memory;
3. update by request id only.

Two administrators acting concurrently could both validate the same stale state. A later write could therefore overwrite a legitimate terminal transition (for example APPROVED → FULFILLED racing with APPROVED → CANCELLED), and both operations could emit lifecycle audit evidence.

For a PHI disclosure workflow, state transitions must be atomic at the database predicate.

## Repair

APPROVE, DENY, CANCEL and FULFILL now use Prisma `updateMany` as compare-and-set transitions. Every mutation predicate includes:

- ROI request id;
- exact facility id;
- the allowed source status.

A zero-row update means another actor/process changed the request first. Medora returns a conflict and does not emit the requested lifecycle audit event.

The updated row is re-read through the existing facility-scoped `requireRow` boundary before serialization/audit metadata.

## Transition predicates

- DRAFT → APPROVED: requires DRAFT.
- DRAFT → DENIED: requires DRAFT.
- DRAFT/APPROVED → CANCELLED: requires one of those two states.
- APPROVED → FULFILLED: requires APPROVED.

This prevents stale application reads from authorizing a later overwrite.

## Regression evidence

Tests prove exact-facility expected-status predicates, fail-closed concurrent approval, and prevention of cancellation after another actor wins the transition.

## Scope

No disclosure eligibility rules, snapshot content, Application Modules, clinical rules, or internal Medora billing behavior are changed.
