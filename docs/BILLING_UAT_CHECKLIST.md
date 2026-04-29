# Billing UAT Checklist

Purpose: confirm ER billing readiness before production billing use. This checklist is review-only and does not authorize auto-billing for unresolved items.

## Preconditions

- [ ] Billing coverage report has been generated.
- [ ] Generated report reviewed at `~/medora-data/processed/medora-billing-coverage-report.json`.
- [ ] CMS CLFS file has been parsed.
- [ ] Licensed CPT / facility chargemaster status has been documented.
- [ ] Test patient and test ER encounter are available.
- [ ] Billing user is available and assigned the correct role.
- [ ] Clinical lead, billing lead, and admin/ops signoff owners are identified.

## Readiness Rules

- `official_validated` can proceed to billing review.
- `candidate_only` requires manual billing review.
- `pending_license` cannot auto-bill.
- `missing` cannot auto-bill.

## Lab Billing Tests

For each lab below:

- [ ] Place or confirm the order/result exists on the test encounter.
- [ ] Confirm a billing ledger line is captured.
- [ ] Confirm the readiness badge is `official_validated`.
- [ ] Confirm code evidence is from parsed CMS CLFS.
- [ ] Confirm the billing user can review the line without changing clinical data.

Test items:

- [ ] CBC
- [ ] CMP
- [ ] BMP
- [ ] Troponin
- [ ] Lactate
- [ ] D-dimer
- [ ] PT/INR
- [ ] aPTT
- [ ] UA
- [ ] Blood culture

## Medication Billing Review

For each medication or group below:

- [ ] Place or confirm the medication order exists.
- [ ] Confirm medication dispense/admin/MAR context is captured as applicable.
- [ ] Confirm readiness is not treated as `official_validated` unless a future approved billing policy says so.
- [ ] Confirm `candidate_only` items are routed to manual billing review.
- [ ] Confirm no medication line is auto-billed solely from HCPCS candidate or FDA NDC identity evidence.
- [ ] Confirm dose unit and billing quantity require manual validation.

Review items:

- [ ] Ceftriaxone
- [ ] Morphine
- [ ] Hydromorphone
- [ ] Fentanyl
- [ ] Midazolam
- [ ] Ketamine
- [ ] Vasopressors
- [ ] Antibiotics

## Imaging Billing Review

For each imaging study below:

- [ ] Place or confirm the imaging order/result exists.
- [ ] Confirm a billing ledger line is captured where applicable.
- [ ] Confirm readiness badge is `pending_license`.
- [ ] Confirm no imaging line is auto-billed before licensed CPT / chargemaster approval.
- [ ] Confirm billing user can identify the needed manual review.

Review items:

- [ ] Chest X-ray
- [ ] CT head without contrast
- [ ] CTA chest
- [ ] CT abdomen/pelvis
- [ ] Ultrasound RUQ
- [ ] Venous Doppler

## Procedure Billing Review

For each care/procedure item below:

- [ ] Place or confirm the procedure/care item exists on the encounter.
- [ ] Confirm a billing ledger line is captured when supported.
- [ ] Confirm readiness is `pending_license` or `missing`, not `official_validated`.
- [ ] Confirm no procedure line is auto-billed before licensed CPT / chargemaster approval.
- [ ] Confirm manual review path is clear to billing staff.

Review items:

- [ ] EKG
- [ ] Laceration repair
- [ ] Splinting
- [ ] Intubation
- [ ] Procedural sedation

## Billing Ledger Review

- [ ] Billing queue shows the test encounter.
- [ ] Billing ledger opens for the test encounter.
- [ ] Ledger rows display source, code type, code, readiness badge, review status, service date, and description.
- [ ] `official_validated` rows are distinguishable from `candidate_only`, `pending_license`, and `missing`.
- [ ] `candidate_only`, `pending_license`, and `missing` rows are not treated as auto-bill-ready.
- [ ] Billing user can mark eligible reviewed lines after manual review.
- [ ] Finalization is not used as proof that unresolved items became billable.

## Signoff Gates

Clinical lead:

- [ ] Reviewed clinical order coverage.
- [ ] Confirmed billing review does not change clinical documentation.
- Name:
- Date:
- Decision:

Billing lead:

- [ ] Reviewed coverage report and billing ledger behavior.
- [ ] Confirmed unresolved rows are blocked from auto-billing.
- [ ] Confirmed manual review workflow is acceptable.
- Name:
- Date:
- Decision:

Admin / ops:

- [ ] Confirmed licensed CPT / chargemaster status is documented.
- [ ] Confirmed billing user access and training.
- [ ] Confirmed go-live support owner.
- Name:
- Date:
- Decision:

## Go-Live Decision

- [ ] GO
- [ ] NO-GO

Decision notes:

- Blockers:
- Required follow-up:
- Approved by:
- Date:
