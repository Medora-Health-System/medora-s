# MEDUI.D4C.7G — Enterprise MAR authority, Clinic order→MAR repair, pure outpatient Rx

## Summary

Clinic facility medication orders already used the same `OrdersService.create` → `OrderItem` (`ADMINISTER_CHART`) path as ED. Médicaments appeared empty because Haiti ambulatory hid `FacilityMarShiftTimeline` while unified MAR had legacy OrderItem tasks off. Outpatient Rx reused the full Orders composer (`DEFAULT`) with administer/pharmacy destinations and shared the pilot-scope gate.

## Corrections

1. **Ambulatory MAR fallback** — When Facility shift timeline is hidden, `MedicationAdministrationTab` renders pending OrderItem MAR tasks via `shouldShowAmbulatoryPendingMarOrderItemFallback` (same `isOrderItemPendingNurseMedication` authority as ED).
2. **Pure Rx mode** — `OUTPATIENT_RX_ONLY` on `CreateOrderModal`: medication-only; force `PHARMACY_DISPENSE`; external pharmacy destination only (no administer radios; no Protocoles/Lab/Imaging/Soins).
3. **Pilot scope** — `shouldSkipPilotScopeForOutpatientRxCreate` skips tranche-1 pilot / facility-scope blockers for pure outpatient Rx only; facility-admin keeps the gate.
4. **Observability** — `FACILITY_MEDICATION_MAR_PROJECTION_FAILED` and related typed codes (no unnecessary PHI).
5. **No Clinic* engines** — Parameterized reuse of enterprise Orders / MAR / Rx print.

## Architecture preserved

```
Facility order → Orders → Pharmacy if needed → MAR → admin events
Outpatient Rx → PHARMACY_DISPENSE → print/external → no MAR → no inventory/pilot requirement
Home med → history only
```

D4C.7E intents and D4C.7F closure/pharmacy navigation preserved.

## Docs

- Audit: `docs/clinical/enterprise-mar-authority-clinic-order-rx-d4c7g-audit.md`
- Certification: `docs/certification/MEDUI.D4C.7G-certification.md`

## Migration

None.
