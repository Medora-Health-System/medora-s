# Phase 19T.4 — Longitudinal History Production Validation

Validation-only checklist for **19T.3** patient longitudinal clinical history (`Patient.clinicalHistoryProfileJson`) and carry-forward integration. No feature redesign.

## Migration validation (Part A)

Migration folder: `apps/api/prisma/migrations/20260818120000_patient_clinical_history_profile_19t3/`

| Check | Expected |
|-------|----------|
| SQL change | Single nullable `JSONB` column on `Patient` only |
| Existing rows | `clinicalHistoryProfileJson = null` after deploy |
| Prisma schema | `clinicalHistoryProfileJson Json?` on `Patient` |
| `prisma validate` | Pass |
| `prisma generate` | Pass |
| `prisma migrate deploy` | Safe additive migration (no data loss) |

**Commands (run before production deploy):**

```bash
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api exec prisma generate
pnpm --filter @medora/api exec prisma migrate status
```

Do **not** run `migrate deploy` against production from automation unless explicitly approved.

**Rollback plan:** Feature tolerates `null` profile. Do **not** drop the column in rollback; disable UI promotion if needed. Prior-encounter carry-forward (19T.1) continues to work with null profile.

---

## Manual QA checklist

### Environment prep

- [ ] Apply migration in staging: `pnpm --filter @medora/api exec prisma migrate deploy`
- [ ] Confirm `migrate status` shows `20260818120000_patient_clinical_history_profile_19t3` applied
- [ ] Run automated suite (Part H commands below)

### Patient & chart (backward compatibility)

1. [ ] **Migration commands** — validate / generate / status all succeed
2. [ ] **Old patient, no profile** — open patient chart; no crash; longitudinal block empty or hidden safely
3. [ ] **Chart summary with null profile** — `clinicalHistoryProfile` null; `clinicalHistorySummary.hasProfile` false
4. [ ] **Prior triage carry-forward** — new ED encounter without triage; prior reviewed visit hydrates when profile is null
5. [ ] **Profile hydration priority** — patient with stored profile; new encounter prefers profile over prior visit

### Triage reconciliation (production safety)

6. [ ] **Pending review does not promote** — carry-forward sections left pending; save triage; patient profile unchanged
7. [ ] **Review section promotes** — confirm/review allergies; save; profile allergies updated; provenance has encounter id
8. [ ] **Modify promotes reconciled_update** — edit carried allergy; mark modified; save; profile shows update; `sourceType` reconciled
9. [ ] **Clear section without confirm** — mark section removed; save without explicit confirm; profile section **retained**
10. [ ] **Confirmed remove clears one section only** — confirm remove allergies only; profile allergies cleared; other sections intact

### Encounter vs patient boundaries

11. [ ] **Patient chart longitudinal block** — shows section summary / provenance dates (French labels)
12. [ ] **Encounter summary stays encounter-specific** — visit narrative, vitals, ESI not replaced by profile block
13. [ ] **Prior encounter unchanged** — open prior encounter triage after reconciliation; vitalsJson identical
14. [ ] **Manual entry wins hydration** — field already filled on new triage; carry-forward does not overwrite

### API & audit

15. [ ] **GET carry-forward** — `available: false` when no profile and no prior history
16. [ ] **GET carry-forward** — `hydrationSource: "patient_profile"` when profile exists
17. [ ] **GET carry-forward** — `hydrationSource: "prior_encounter"` when profile null and prior exists
18. [ ] **GET clinical-history-profile** — RN/Provider/Admin only; wrong facility → not found / forbidden
19. [ ] **Audit logs PHI-safe** — reconciliation and carry-forward audit rows contain ids/status keys only; no allergy/med/PMH text

### UI & devices

20. [ ] **French UI labels** — carry-forward banner, reconciliation banner, patient chart block (no English chrome)
21. [ ] **Mobile/tablet triage** — carry-forward banner and history sections usable on narrow viewport

---

## Production rollout notes

- Deploy migration during **low-volume** period (additive column only).
- After deploy, verify **one test patient**: null profile chart load, then one carry-forward + one reviewed promotion.
- Monitor for 24–48h:
  - Triage save error rate (5xx / validation)
  - `GET /encounters/:id/triage/carry-forward` errors
  - `GET /patients/:id/clinical-history-profile` errors
- Rollback: keep column; feature degrades to 19T.1 prior-encounter carry-forward when profile null or parser returns null.

---

## Automated coverage (19T.4)

| Area | Location |
|------|----------|
| Shared profile safety & backward compat | `packages/shared/src/patient/patientClinicalHistoryProfile19T4.test.ts` |
| Shared reconciliation & carry-forward | `patientClinicalHistoryProfile19T3.test.ts`, `triageCarryForward*.test.ts` |
| API carry-forward contract | `apps/api/src/triage/triage-carry-forward.service.spec.ts` |
| API patient profile service | `apps/api/src/patients/patient-clinical-history.service.spec.ts` |

---

## Part H verification commands

```bash
pnpm --filter @medora/api exec prisma validate
pnpm --filter @medora/api exec prisma generate
pnpm verify:web
pnpm --filter @medora/web test
pnpm --filter @medora/web build
pnpm verify:api
pnpm --filter @medora/api test -- triage-carry-forward
pnpm --filter @medora/api test -- encounters
pnpm --filter @medora/shared test -- patientClinicalHistoryProfile
pnpm --filter @medora/shared test -- triageCarryForward
```
