# Medication audit & legal chart integration (M1.3F.8)

**Phase:** M1.3F.8 — visibility, traceability, legal defensibility  
**Date:** 2026-05-31  
**Scope:** Integrate M1.3F.4–M1.3F.7 governance outcomes into encounter chart, legal chart, exports, snapshots, ROI, unified timeline, and chart audit timeline. **No new governance rules.**

---

## Architecture

| Layer | Responsibility |
|-------|----------------|
| `packages/shared/.../medicationGovernanceChartSummary.ts` | Pure read-model: per-MAR summary lines + concise timeline events from structured artifacts |
| `apps/api/.../medication-governance-chart.util.ts` | Batch-load verifications, waste, overrides, pharmacy rows per encounter (4 queries, no N+1 per MAR) |
| `chart-export.service.ts` | Extends `ChartExportManifest` with `medicationGovernanceSummaries`, `medicationGovernanceTimeline`, per-MAR `governanceSummary` |
| `chart-export-html.util.ts` | Legal-chart HTML sections (French labels in export locale `fr`) |
| `unified-encounter-timeline.service.ts` | Appends governance timeline source rows (deduped, MEDICATION group) |
| `chart-audit-timeline.util.ts` | Exposes M1.3F.4–F.7 `AuditAction` values on encounter chart audit timeline |

Governance summaries are built from **persisted verification / waste / override / pharmacy rows**, not from duplicating raw `AuditLog` JSON.

---

## Governance summary model

Each administered medication with governance artifacts receives:

- Header: medication label, dose, route, administered time
- Lines: `{ key, labelFr, status }` where `status` ∈ `completed` | `pending` | `overridden` | `rejected`
- `hasOverride` when any override row exists

Example (legal chart):

```
Morphine 4 mg · 4 mg · IV
✓ Substance contrôlée
✓ Témoin complété
✓ Perte documentée
⚠ Dérogation substance contrôlée
```

---

## Timeline integration

- **Unified encounter timeline:** governance events merged as additional `MEDICATION_ADMINISTRATION` rows with `storedEventType` such as `MAR_WITNESS_COMPLETED`, `MAR_DOUBLE_CHECK_COMPLETED`, `PHARMACY_VERIFIED`.
- **Chart manifest:** `medicationGovernanceTimeline.items` — chronological, PHI-safe titles (medication name only when already on MAR snapshot).
- **Audit timeline:** M1.3F audit enum actions included in `CHART_AUDIT_TIMELINE_ACTIONS` with French short labels; detail shows status codes only.

Noise control: no per-field audit dump; one row per completed governance outcome.

---

## Export integration

Included in:

- Live chart preview / JSON manifest (`getManifest`)
- Immutable snapshots (`manifestJson` stores full manifest including governance sections)
- HTML export (`Medication governance summary` + `Medication governance timeline`)
- ROI packets (consume same manifest as EDOC.2A / Phase 5G)

Compatible with Phase 5E (HTML), 5F (snapshots), 5G (ROI) — manifest version unchanged (`encounter-chart-export-v1`).

---

## ROI integration

ROI release flows read the stored chart export manifest. Governance sections are **clinically relevant outcomes only** (completed witness, waste, overrides, pharmacy status). Internal implementation metadata (`sourcePhase`, raw override reason text) is **not** exported in summaries.

---

## Audit event coverage

| Workflow | Audit action | Chart audit timeline | Governance summary | Export / ROI |
|----------|--------------|----------------------|-------------------|--------------|
| Witness completed | `MEDICATION_WITNESS_VERIFICATION_COMPLETED` | Yes | Yes | Yes |
| Waste documented | `MEDICATION_WASTE_RECORDED` | Yes | Yes | Yes |
| Waste witnessed | `MEDICATION_WASTE_WITNESSED` | Yes | Yes | Yes |
| Controlled override | `CONTROLLED_SUBSTANCE_OVERRIDE` | Yes | Yes | Yes |
| Double check | `HIGH_ALERT_DOUBLE_CHECK_COMPLETED` | Yes | Yes | Yes |
| High-alert override | `HIGH_ALERT_OVERRIDE` | Yes | Yes | Yes |
| LASA ack | `LASA_WARNING_ACKNOWLEDGED` | Yes | Yes | Yes |
| LASA override | `LASA_OVERRIDE` | Yes | Yes | Yes |
| Pharmacy verified | `PHARMACY_VERIFICATION_COMPLETED` | Yes | Yes | Yes |
| Pharmacy rejected | `PHARMACY_VERIFICATION_REJECTED` | Yes | Yes | Yes |
| Pharmacy override | `PHARMACY_VERIFICATION_OVERRIDE` | Yes | Yes | Yes |

Audit metadata remains PHI-safe (IDs, enums, status codes — no free-text clinical narrative).

---

## Performance considerations

- One `loadMedicationGovernanceEncounterBundle` call per chart export (4 parallel Prisma queries scoped by `encounterId`).
- Unified timeline reuses the same loader after MAR rows are already loaded (no duplicate MAR list query).
- Summaries omitted when no governance lines (empty section in HTML).

---

## Rollback strategy

1. Revert M1.3F.8 commit — manifest fields are additive; older snapshots without governance keys remain valid JSON.
2. HTML renderer tolerates missing keys if consumers pass partial manifests (tests use explicit empty arrays).
3. No database migration required.

---

## Files (primary)

- `packages/shared/src/medication/medicationGovernanceChartSummary.ts`
- `apps/api/src/medication-safety/medication-governance-chart.util.ts`
- `apps/api/src/encounters/chart-export.service.ts`
- `apps/api/src/encounters/chart-export-html.util.ts`
- `apps/api/src/encounters/unified-encounter-timeline.service.ts`
- `apps/api/src/patients/chart-audit-timeline.util.ts`
- `apps/api/src/encounters/medication-governance-legal-chart.spec.ts`
