# EDOC.8A — Smart Infusion Governance (backlog)

**Status:** Future phase — documentation only. **Not implemented** in EDOC.8.

## Context

EDOC.8 delivers **High-Alert Infusion Dual Verification** for bedside legal documentation (heparin, insulin, vasopressors, sedatives, PCA, and related high-alert types). It is **not** MAR, medication ordering, or pharmacy verification.

## Purpose

Many hospitals require auditability around:

- Smart infusion pump programming
- Drug library verification
- Guardrail overrides and override reasons

Medora should reserve this as a **future governance expansion** on top of EDOC.8, without device integration or smart-pump APIs in the current phase.

## EDOC.8 (current) vs EDOC.8A (future)

| Topic | EDOC.8 (shipped) | EDOC.8A (backlog) |
|--------|------------------|-------------------|
| Dual-check verification | Yes | Unchanged |
| Optional `pumpIdentifier` on initiation | Free-text, **optional** | May tie to pump asset / library |
| Smart pump library verified | No | `smartPumpLibraryVerified` |
| Drug library version | No | `drugLibraryVersion` |
| Guardrail override | No | `guardrailOverrideUsed`, `overrideReason` |
| Prisma / migrations | None | None until explicit design |
| MAR / orders / billing | Untouched | Untouched |

## Future fields to consider

Documented in `packages/shared/src/clinicalDocumentation/highAlertInfusionDocumentationPayloads.ts`:

- `smartPumpLibraryVerified` (boolean)
- `drugLibraryVersion` (string)
- `guardrailOverrideUsed` (boolean)
- `overrideReason` (string)

`pumpIdentifier` may be expanded under EDOC.8A for structured pump identity; EDOC.8 keeps it as optional free text on initiation only.

## Implementation guardrails (when EDOC.8A is scheduled)

1. Add Zod fields with explicit validation — do not make required until facility policy and legal review.
2. Extend bilingual summary helpers and legal chart / HTML export tests.
3. No smart-pump or device integration without a separate integration phase.
4. No witness-policy changes unless clinically reviewed.
5. **No migration** unless a separate architecture decision documents why JSON `payloadJson` is insufficient.

## Registry markers

High-alert infusion verification and initiation cards include non-behavioral tags:

- `smart_pump_future`
- `pump_governance_future`

These tags do not change `implementationStatus`, witness rules, or save behavior.

## Related code

- `highAlertInfusionDocumentationPayloads.ts` — `EDOC_8A_SMART_INFUSION_GOVERNANCE_*` constants
- `clinicalDocumentationEdoc8aSmartInfusionGovernanceBacklog.test.ts` — backlog assertions
