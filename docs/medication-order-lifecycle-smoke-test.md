# Medication order lifecycle — production smoke certification

Manual smoke sequence for clinic MVP sign-off. Run in staging with RN + provider roles.

## Prerequisites

- Migration `20260910150000_medication_order_lifecycle` applied.
- Test patient with open ED encounter.
- Medication catalog with Q12H scheduled med, PRN med, and IVPB infusion med.

## Sequence

| Step | Action | Expected |
|------|--------|----------|
| 1 | Create Q12H medication order (chart admin) | Order ACTIVE; future MAR doses scheduled |
| 2 | Discontinue before next dose (reason required) | Status DISCONTINUED; audit event |
| 3 | Open MAR shift timeline | Future dose suppressed for discontinued order |
| 4 | Verify past administered dose | Historical MAR row still visible |
| 5 | Create PRN order | PRN availability card shown |
| 6 | Discontinue PRN | PRN card removed / not actionable |
| 7 | Start IVPB infusion | Active infusion in ER orders + MAR |
| 8 | Attempt discontinue while infusing | Blocked — stop infusion first |
| 9 | Stop infusion | Infusion stoppable; stop preserved |
| 10 | Discontinue IVPB order | DISCONTINUED; no new infusion actions |
| 11 | Edit unadministered scheduled order in place | Fields updated; same order item id |
| 12 | Edit administered order | Supersede/reorder path; old SUPERSEDED, new ACTIVE |
| 13 | ED Summary + Pharmacy worklist | Lifecycle badges/alerts with reason, time, provider |
| 14 | Sign provider documentation | Lifecycle actions disabled in ER orders panel |

## Surfaces to verify

- ER orders panel (`EmergencyErOrdersPanel`) — lifecycle actions for provider
- Encounter Ordres tab — `MedicationOrderLifecyclePanel`
- ED Summary / Encounter summary — read-only lifecycle lines
- Chart live preview / print packet — lifecycle in medication order section
- Pharmacy worklist — chart-admin lifecycle alerts (visibility only)
- MAR — no deletion of historical administrations

## Governance-deferred statuses

`EXPIRED` and `CANCELED_ENTERED_IN_ERROR` display safely when set (backend/admin); no provider UI action in MVP.

## Pass criteria

All steps match expected behavior; no MAR history loss; PRN source-of-truth and infusion stop unchanged.
