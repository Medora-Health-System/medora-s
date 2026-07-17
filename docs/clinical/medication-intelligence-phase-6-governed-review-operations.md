# Medication Intelligence Phase 6 — Governed RxNorm Review Operations

**Certification ID:** `MEDUI.MEDICATION_INTELLIGENCE_PHASE_6_GOVERNED_REVIEW_OPERATIONS_ADMIN_PLATFORM`

**Status:** Implemented — certify with `pnpm --filter @medora/api medication:certify:phase6`

---

## Objective

Provide the operational governance platform for authorized reviewers to safely review, approve, reject, defer, retire, and supersede RxNorm mapping candidates while preserving Phases 1–5 safety guarantees.

---

## What shipped

| Area | Detail |
|------|--------|
| Roles | `MEDICATION_REVIEWER` (MedicationReviewer), `MEDICATION_ADMIN` (MedicationAdmin) |
| REST API | `/medications/review/*` — candidates, detail, approve, reject, defer, assign, supersede, retire, bulk, dashboard |
| UI | `/app/admin/medication-governance/rxnorm-review` — French console for admins/pharmacists/reviewers |
| Audit | `RxNormReviewAuditEvent` deterministic history |
| Metrics | Dashboard: approval/rejection rates, workload, conflicts, ambiguity, supersede/retire counts |
| Pilot | `em-real-mapping-pilot.config.json` — ~100 EM medications, **disabled by default**, no import |
| Migration | `20261008120000_medication_phase_6_governed_review_operations` |

Phase 4 verification mutations remain the authority for approve/reject/retire/supersede. Phase 6 wraps them with HTTP, assignment, defer, bulk (non-clinical), and UI.

---

## Safety guarantees

| Guarantee | Status |
|-----------|--------|
| No automatic verification | Enforced (`autoVerified` must stay false) |
| No automatic clinical activation | Enforced |
| Patient-facing medication search unchanged | Catalog path only |
| Ordering / MAR / formulary / billing unchanged | No mutations on clinical runtime models |
| No additional real RxNorm import | Out of scope |
| EM pilot import | Not executed; config `enabled: false` |

---

## API surface

- `GET /medications/review/candidates`
- `GET /medications/review/candidate/:id`
- `POST /medications/review/approve`
- `POST /medications/review/reject`
- `POST /medications/review/defer`
- `POST /medications/review/assign`
- `POST /medications/review/supersede`
- `POST /medications/review/retire`
- `POST /medications/review/bulk`
- `GET /medications/review/dashboard`
- `GET /medications/review/pilot-config`

Write roles: `MEDICATION_REVIEWER`, `MEDICATION_ADMIN`, `ADMIN`, `MEDORA_SUPER_ADMIN`.  
Read also allows `PHARMACY`.

---

## UI

Enterprise reviewer console (French product UI):

- Candidate list with filters (status, term type, ambiguity, conflict) and search
- Side-by-side staging vs target comparison
- Evidence, provenance, mapping timeline, reviewer history
- Approve / reject / defer / assign / retire / supersede
- Non-clinical bulk reject/defer
- Metrics dashboard + pilot disabled banner

---

## Controlled EM pilot

Config: `apps/api/prisma/medications/rxnorm/pilot/em-real-mapping-pilot.config.json`

- `enabled: false`
- `targetCount: 100`
- `therapeuticArea: EMERGENCY_MEDICINE`
- `importExecuted: false`
- `clinicalActivationEnabled: false`
- `automaticVerificationEnabled: false`

Phase 6 does **not** import or activate these medications.

---

## Certification

```bash
pnpm --filter @medora/api medication:certify:phase6
```

Expected: `MEDICATION_INTELLIGENCE_PHASE_6_CERTIFIED`

Prior phases must remain certified:

```text
MEDICATION_INTELLIGENCE_PHASE_3_CERTIFIED
MEDICATION_INTELLIGENCE_PHASE_4_CERTIFIED
MEDICATION_INTELLIGENCE_PHASE_5_CERTIFIED
```

---

## Known gaps

- Real mapping pilot not executed
- No broad clinical activation of real RxCUIs
- Pack-level / relationship mapping still deferred
- Admin role assignment still requires seed/upsert of new Role rows

---

## Next recommendation

**Controlled real mapping pilot execution (limited EM set)** and/or **canonical ordering integration** — only after Phase 6 certification, still without automatic clinical activation.
