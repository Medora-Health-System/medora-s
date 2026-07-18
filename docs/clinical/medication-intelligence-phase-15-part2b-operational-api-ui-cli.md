# Medication Intelligence Phase 15 Part 2B — Operational API, Admin UI, CLI

**Implementation ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_15_PART2B_API_UI_CLI_OPERATIONAL_WORKFLOWS`

**Certification:** Not claimed — Part 2C owns requalification and `MEDICATION_INTELLIGENCE_PHASE_15_CERTIFIED`.

---

## Mission

Expose Part 2A remediation and authoritative-source infrastructure through secured Nest APIs, admin UI, CLI, dashboards, preview/dry-run workflows, and audit views — without changing patient-care workflows.

## Reuse audit (summary)

| Area | Reused |
|------|--------|
| Part 2A services | `medication-remediation.service`, `medication-source-lifecycle.service`, quality recalculation |
| Phase 14A | `MedicationEvidenceSourceRegistration`, evidence links, completeness scores |
| Phase 14B | Shadow gap links, quality scores, snapshots, expert-review roles pattern |
| Nest style | `@Controller("medications/…")` + JWT + `RequireRoles` + HttpService |
| Web | `/api/backend/medications/…`, medication-governance hub, i18n FR/EN |
| CLI | `medication:phase15:*` under `prisma/medications/phase15/` |

No parallel gap/quality/shadow/evidence engines.

## API (`/medications/remediation`)

- `GET dashboard|baseline|readiness|families|families/:key`
- `GET|POST work-items…` (list, detail, refresh, preview, transition, defer, reopen)
- Evidence: `evidence-links`, `verify-source`, `knowledge-preview`, `apply-supported-knowledge`, `mark-deferred`
- Sources: `GET sources`, `GET sources/:id`, `POST promote|advance`
- `POST quality/recalculate`

Preview endpoints do not mutate. Apply-supported-knowledge does **not** fabricate clinical facts; advances lifecycle + quality recalc; Part 2C completes knowledge.

## Admin UI

`/app/admin/medication-governance/remediation`

Banner: administrative knowledge governance only / no production CDS / no care impact.

## CLI

```
pnpm medication:phase15:baseline
pnpm medication:phase15:remediation:list|refresh|preview|execute
pnpm medication:phase15:sources:list|verify
pnpm medication:phase15:quality:report
pnpm medication:phase15:readiness
```

`--dry-run` supported on mutating modes. Acetaminophen → `IDENTITY_BLOCKED_OUT_OF_SCOPE`.

Baseline artifact: `medication-phase15-part2b-operational-baseline.json`

## Safety

Clinical activations / provider alerts / order blocks remain 0. Wave 1 only. No certification decision in Part 2B.

## Part 2C handoff

Ready for governed knowledge completion, shadow requalification, synthetic rerun, gap reconciliation, certification, docs, and the three-commit strategy.
