# ER UAT Checklist

Purpose: verify the emergency order, MAR, pharmacy, cancellation, attribution, and audit workflows before pilot use.

Use one test encounter unless a case says otherwise. Record tester initials, date/time, role used, and pass/fail for each case.

## Preconditions

- Test users exist for `PROVIDER`, `RN`, `PHARMACY`, `LAB`, `RADIOLOGY`, and `ADMIN`.
- A test patient has an open ER encounter.
- Lab, imaging, medication, care, MAR, pharmacy worklist, and order event views are accessible.
- At least one controlled medication is available in the medication catalog.

## Provider Order Entry

- [ ] Sign in as `PROVIDER`.
- [ ] Open the test ER encounter.
- [ ] Place one lab order.
- [ ] Place one imaging order.
- [ ] Place one medication order.
- [ ] Place one care/procedure order.
- [ ] Confirm each order appears in the encounter order list.
- [ ] Confirm lab item appears in the lab worklist.
- [ ] Confirm imaging item appears in the radiology worklist.
- [ ] Confirm medication item appears in MAR or pharmacy workflow according to destination.
- [ ] Confirm care/procedure item remains visible for nursing/provider follow-up.
- [ ] Confirm created-by display shows the provider, source, and creation time.

Expected result: provider-created clinical orders are visible in the correct downstream surfaces and display as provider orders.

## RN Verbal Medication Order

- [ ] Sign in as `RN`.
- [ ] Open the same ER encounter.
- [ ] Start a medication order.
- [ ] Select verbal order authority.
- [ ] Select or enter the prescriber.
- [ ] Confirm read-back.
- [ ] Add medication directions and submit the order.
- [ ] Confirm the order is accepted.
- [ ] Confirm the order displays as a verbal order, not a direct RN/provider order.
- [ ] Confirm the prescriber display is preserved.
- [ ] Confirm created-by display shows the RN, source, and creation time.

Expected result: RN verbal order is allowed only with prescriber and read-back context, and attribution remains clear.

## RN Nursing Protocol Order

- [ ] Sign in as `RN`.
- [ ] Open the same ER encounter.
- [ ] Start a medication or care order.
- [ ] Select nursing protocol authority.
- [ ] Enter/select the protocol name.
- [ ] Submit the order.
- [ ] Confirm the order is accepted.
- [ ] Confirm the order displays as a nursing protocol order.
- [ ] Confirm the protocol name is visible where authority details are shown.
- [ ] Confirm created-by display shows the RN, source, and creation time.

Expected result: RN protocol order is identified as protocol-authorized and not shown as a direct provider order.

## Controlled Medication Warning

- [ ] Sign in as `PROVIDER` or authorized `RN`.
- [ ] Open medication ordering.
- [ ] Select a controlled medication.
- [ ] Confirm a controlled medication badge is visible.
- [ ] Confirm the schedule badge is visible when schedule metadata exists.
- [ ] Confirm double-sign required is visible when configured.
- [ ] Confirm witness required is visible when configured.
- [ ] Confirm the warning does not block order submission by itself.

Expected result: controlled medication warnings are visible before submission without changing order behavior.

## MAR Administered Medication

- [ ] Sign in as `RN`.
- [ ] Open MAR for a medication order intended for bedside administration.
- [ ] Record an administered action.
- [ ] Confirm the administration record is saved.
- [ ] Confirm the medication order line is marked completed/administered.
- [ ] Confirm last action shows the RN, action, and time.
- [ ] Confirm an order event exists for the completed administration.

Expected result: true administration completes the medication line and is auditable.

## MAR Refused Medication

- [ ] Sign in as `RN`.
- [ ] Open MAR for an active medication order.
- [ ] Record a refused action with a note/reason if available.
- [ ] Confirm the refusal record is saved.
- [ ] Confirm the order line remains not completed.
- [ ] Confirm the row remains available for later clinically appropriate action.
- [ ] Confirm last action shows the RN, refusal/non-administered outcome, and time.
- [ ] Confirm an order event exists for the non-administered outcome.

Expected result: refusal is recorded but does not falsely complete the medication order.

## Pharmacy Dispense

- [ ] Sign in as `PHARMACY`.
- [ ] Open the pharmacy worklist.
- [ ] Select an active pharmacy-dispense medication order.
- [ ] Record a dispense.
- [ ] Confirm dispense record is saved.
- [ ] Confirm the pharmacy dispense line is completed/dispensed.
- [ ] Confirm the medication is not marked administered.
- [ ] Confirm MAR still distinguishes dispense from administration.
- [ ] Confirm last action shows pharmacy dispense actor and time.
- [ ] Confirm an order event exists for the dispense outcome.

Expected result: dispensing updates pharmacy lifecycle only and does not imply bedside administration.

## Cancellation Authority

Run each case on a fresh active order where possible.

### Provider

- [ ] Sign in as `PROVIDER`.
- [ ] Cancel a provider-created medication or care order.
- [ ] Confirm cancellation succeeds.
- [ ] Confirm cancelled-by, source, time, and last action are visible.
- [ ] Confirm `OrderEvent` and `AuditLog` entries exist.

Expected result: provider can cancel appropriate provider clinical orders.

### RN

- [ ] Sign in as `RN`.
- [ ] Cancel an RN-created verbal order.
- [ ] Confirm cancellation succeeds.
- [ ] Cancel an RN-created nursing protocol order.
- [ ] Confirm cancellation succeeds.
- [ ] Attempt to cancel another user's/provider-created order.
- [ ] Confirm cancellation is denied unless the RN also has an allowed role.
- [ ] Confirm successful cancellations have `OrderEvent` and `AuditLog` entries.

Expected result: RN cancellation is limited to own verbal/protocol orders.

### Pharmacy

- [ ] Sign in as `PHARMACY`.
- [ ] Attempt to cancel a full medication order.
- [ ] Confirm full order cancellation is denied.
- [ ] Confirm no cancellation audit/event is written for the denied action.

Expected result: pharmacy cannot cancel full medication orders in S5 policy.

### Lab

- [ ] Sign in as `LAB`.
- [ ] Cancel an all-lab order.
- [ ] Confirm cancellation succeeds.
- [ ] Attempt to cancel a non-lab or mixed-domain order.
- [ ] Confirm cancellation is denied.
- [ ] Confirm successful cancellation has `OrderEvent` and `AuditLog` entries.

Expected result: lab cancellation is limited to lab-only worklist orders.

### Radiology

- [ ] Sign in as `RADIOLOGY`.
- [ ] Cancel an all-imaging order.
- [ ] Confirm cancellation succeeds.
- [ ] Attempt to cancel a non-imaging or mixed-domain order.
- [ ] Confirm cancellation is denied.
- [ ] Confirm successful cancellation has `OrderEvent` and `AuditLog` entries.

Expected result: radiology cancellation is limited to imaging-only worklist orders.

### Admin

- [ ] Sign in as `ADMIN`.
- [ ] Cancel one active order from each domain: lab, imaging, medication, care/procedure.
- [ ] Confirm each cancellation succeeds.
- [ ] Confirm cancelled-by, source, time, and last action are visible.
- [ ] Confirm each cancellation has `OrderEvent` and `AuditLog` entries.

Expected result: admin can cancel any same-facility active order.

## Attribution And Audit Review

For each successful order action above:

- [ ] Verify created by is visible.
- [ ] Verify source/authority label is visible and correct.
- [ ] Verify creation time is visible.
- [ ] Verify last action is visible after acknowledge/start/complete/dispense/cancel.
- [ ] Verify prescriber display is preserved for verbal orders.
- [ ] Verify pathway/protocol orders do not display as direct provider orders.
- [ ] Verify order event exists with the expected event type.
- [ ] Verify audit log exists for create/cancel/dispense/administer actions where applicable.
- [ ] Verify no record from another facility appears in the encounter, worklist, or chart summary.

Expected result: staff can reconstruct who created the order, under what authority, what changed last, and which audit/event records support the workflow.

## Sign-Off

- Tester:
- Date:
- Build/commit:
- Environment:
- Overall result:
- Blockers:
- Notes:
