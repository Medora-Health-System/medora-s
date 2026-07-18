# Phase 16 — Shadow Recommendation Guide

Shadow evaluations persist calculated recommendations with facility/provider/encounter context, recommendation/knowledge version sets, reasoning path, and confidence summary.

Guarantees:

- `mutatesOrders = false`
- `mutatesMar = false`
- `mutatesChart = false`
- `clinicalActivation = false`

Provider feedback (`ACKNOWLEDGED`, `REJECTED`, `OVERRIDE_DOCUMENTED`) is informational only — never places an order.
