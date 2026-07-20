# Enterprise Chart Completion Certification Engine — Stage B3

**Certification ID:** `MEDUI.ENTERPRISE_CHART_COMPLETION_CERTIFICATION_ENGINE_STAGE_B3`  
**Authority:** ADVISORY  
**Coverage:** PARTIAL  
**Migration required:** NO  

## Scope

Server-owned advisory evaluation of:

- Medication orders (classification + completeness)
- MAR dose resolution (including PRN / refusal / not-available)
- Infusion lifecycle (start/stop/handoff — not discontinue-alone)
- Medication reconciliation (**PARTIALLY_EVALUATED** — no durable completion model)
- Procedures (documentation/consent/timeout/signature)
- Contextual reassessment (pain after analgesic, PRN response, post-procedure)

## Flag

`ENTERPRISE_CHART_CERTIFICATION_STAGE_B3` / `NEXT_PUBLIC_ENTERPRISE_CHART_CERTIFICATION_STAGE_B3`  
Default **OFF**. B3 ON implies B1+B2 foundation on `GET /encounters/:id/chart-certification`.

## Unevaluated after B3

- Clinical pathways
- Advanced medication safety
- Drug interactions
- Renal / hepatic / pediatric dosing

## Freshness

Medication/MAR/procedure writes do **not** bump `Encounter.version`.  
B3 uses `medicationProcedureRevision` with retry → ERROR (never stale READY).

## Authority

All B3 modules ship as **STAGE_B3_ADVISORY** (reconciliation PARTIALLY_EVALUATED).  
No B3 finding independently blocks closure, discharge, signing, billing, or My Incomplete Charts.
