# MEDUI.D4C.7J — Enterprise encounter closure advisory override

**Certification id:** `MEDUI.D4C.7J`  
**Branch:** `d4c7j-enterprise-encounter-closure-advisory-override`  
**Product policy:** Pending clinical work never permanently prevents an authorized treating provider from closing an encounter. Closing never completes, cancels, finalizes, or administers anything.

See also: [audit](./enterprise-encounter-closure-advisory-override-d4c7j-audit.md) · [certification](../certification/MEDUI.D4C.7J-certification.md)

---

## Product closure policy

1. Detect all pending clinical items.
2. Present them clearly (French modal + priority attention).
3. Require explicit acknowledgement.
4. Allow the authorized provider to proceed.
5. Preserve every pending item.
6. Close the encounter (`CLOSED`).
7. Remove the encounter from active operational queues (existing D4C.7D lifecycle / cache invalidation).
8. Retain pending items in departmental / follow-up queues.
9. Audit the acknowledgement once.
10. Never silently cancel, complete, finalize, or administer.

---

## Single enterprise close contract

Authority: `EncountersService.close` (shared DTO `encounterCloseDtoSchema`).

### Request

```json
{
  "expectedVersion": 7,
  "acknowledgePendingClinicalItems": true,
  "acknowledgementVersion": "d4c7j.v1",
  "acknowledgementReason": "PROVIDER_ELECTED_TO_CLOSE",
  "clientRequestId": "close-<encounterId>-<ts>"
}
```

Legacy aliases still resolved: `acknowledgePendingItems`, `acknowledgeDispositionSafety`, `pendingItemsOverrideReason`.

### Success response (projection on encounter)

```json
{
  "closeResult": {
    "encounterId": "…",
    "previousStatus": "OPEN",
    "status": "CLOSED",
    "closedAt": "…",
    "closedByUserId": "…",
    "pendingClinicalItemsPreserved": true,
    "pendingSummary": { "laboratory": 0, "imaging": 0, "medications": 2, "…": 0 },
    "priorityCategories": ["activeInfusion"],
    "acknowledged": true,
    "acknowledgementVersion": "d4c7j.v1",
    "idempotent": false,
    "updatedAt": "…",
    "version": 8
  }
}
```

Already closed → `idempotent: true`, HTTP 200, **no** new audit event.

---

## Preflight contract

`GET/POST` close-documentation-check also returns `closePreflight` (typed `D4c7jClosePreflight`).

- `requiresAcknowledgement`
- `acknowledgementVersion: "d4c7j.v1"`
- `canCloseAfterAcknowledgement` (role-aware)
- `pending` counts
- `priorityCategories`
- `clinicalBlockers: []` — always empty for clinical items

Technical authorization / concurrency errors remain separate typed codes.

---

## Advisory pending categories

| Category | French UI |
|----------|-----------|
| laboratory | Analyses de laboratoire en attente |
| imaging | Imagerie en attente |
| medications | Médicaments non administrés |
| procedures | Soins ou procédures non terminés |
| results | Résultats en attente |
| unacknowledgedResults | Résultats non reconnus |
| followUps | Suivis ouverts |
| referrals | Références en attente |
| documentation | Documentation en attente |

---

## Priority warning categories

Emphasized under **Attention prioritaire** (still acknowledgeable):

- activeInfusion — Perfusion encore active
- highAlertMedication
- criticalResult — Résultat critique non reconnu
- severeAllergyUnresolved
- activeBloodProduct
- emergencyTransferRecommended

Optional reason field: “Motif de la clôture avec éléments prioritaires”.

---

## Technical rejection categories

| Code | HTTP |
|------|------|
| `ENCOUNTER_CLOSE_UNAUTHORIZED` | 403 |
| `ENCOUNTER_CLOSE_FACILITY_MISMATCH` | 403/404 via existing facility isolation |
| `ENCOUNTER_CLOSE_STALE_VERSION` | 409 |
| `ENCOUNTER_CLOSE_TRANSACTION_FAILED` / concurrent modification | 409 |
| `ENCOUNTER_CLOSE_INVALID_STATE` | 409 |
| Malformed body | 400 |
| Unauthenticated | 401 |

Advisory: `ENCOUNTER_PENDING_CLINICAL_ITEMS` → **409** (not generic 400).

---

## HTTP status behavior

| Situation | Status |
|-----------|--------|
| Preflight with pending | 200 + advisory payload |
| Direct close without required ack | **409** + typed advisory |
| Close with valid acknowledgement | **200** |
| Already closed | **200** idempotent |
| Malformed | 400 |
| Unauthorized ack role | 403 |
| Stale version | 409 |

---

## Warning modal (French)

- Title: Des éléments cliniques sont encore en attente
- Body: explains preservation (no delete / cancel / finalize)
- Checkbox: J’ai pris connaissance des éléments en attente et je souhaite clôturer cette rencontre.
- Buttons: Retourner au dossier · Annuler · Clôturer la rencontre
- Close disabled until checkbox; wording is ordinary close (not “malgré…”)

Component: `ClinicCareAmbulatoryClosurePendingModal`  
i18n: `clinicCareD4c7j.*` (FR + EN keys mirrored)

---

## Acknowledgement behavior

Shared resolver `resolveD4c7jAcknowledgement` accepts D4C.7J fields and legacy aliases.  
Server validates role via `canAcknowledgeD4c7jClosure` when acknowledgement is required and present.  
After acknowledged resubmission, the same pending items do **not** produce another advisory rejection.

---

## Role authorization (server-enforced)

| Role | May acknowledge |
|------|-----------------|
| PROVIDER + aliases (PHYSICIAN, DOCTOR, MD, ATTENDING, RESIDENT, NP, PA) | ✔ |
| RN (existing close permission — no separate RN hard-block path) | ✔ |
| MEDORA_SUPER_ADMIN (support/emergency; `supportPolicyOverride` audited) | ✔ |
| ADMIN, PHARMACY, BILLING, FRONT_DESK, MA, technicians, LAB, RADIOLOGY | ✖ |

Route decorator still allows ADMIN for non-advisory closes when nothing is pending; advisory acknowledgement is denied for ADMIN.

---

## Preservation rules

| Domain | After close |
|--------|-------------|
| Orders | Unchanged status; remain linked to encounter |
| Results | May finalize later; longitudinal visibility retained |
| Medications | Not marked administered/completed |
| Infusions | Last documented state preserved; priority warning audited |
| Follow-up | Remains OPEN; independent of encounter terminal state |
| Billing | Continues independently |

Close transaction writes encounter lifecycle fields only.

---

## Client state machine

States: `IDLE` → `PREFLIGHT_LOADING` / close attempt → `AWAITING_ACKNOWLEDGEMENT` → `CLOSING` → `CLOSED` | `ERROR`

Rules:

- One close mutation at a time (`canDispatchD4c7jClose`)
- Opening the modal does not submit close
- No automatic retry on advisory 409
- Button disabled synchronously while `CLOSING`
- Success applies terminal projection + invalidates ambulatory lifecycle cache (D4C.7D)

Module: `clinicCareClosureAdvisoryStateMachineD4c7j.ts`

---

## Idempotency & concurrency

- Already CLOSED → success, `idempotent: true`, no audit
- Repeated acknowledged request after close → same
- `expectedVersion` mismatch → `ENCOUNTER_CLOSE_STALE_VERSION`
- Concurrent `updateMany` count 0 → conflict; no duplicate audit

---

## Audit & observability

Audit metadata (`buildD4c7jCloseAuditMetadata`, allowlisted in `SAFE_METADATA_KEYS`):

- previous/new status, pending counts, priority categories
- acknowledgement version/reason/source, clientRequestId
- pendingClinicalItemsPreserved, supportPolicyOverride

Structured logs: `encounter_close_request`, `encounter_close_advisory_required`, `encounter_close_completed`, `encounter_close_rejected` with requestId, roles, counts, durationMs — no medication names or clinical narrative.

---

## Server close order of operations

1. Authenticate  
2. Facility membership + encounter ownership  
3. Load canonical encounter  
4. Idempotent success if CLOSED  
5. expectedVersion check  
6. Advisory classification  
7. Missing ack → typed 409  
8. Ack present → role + version validation  
9. Transactional close  
10. Preserve pending items (no clinical mutation)  
11. One audit event  
12. Canonical terminal projection  

---

## Operational synchronization

Reuses D4C.7D ambulatory terminal lifecycle:

- Header / button terminal state
- Today’s Visits / Consultations / Provider / Nursing queues
- Clinical Board counts
- Room/chair release per existing policy
- Medical Record / Patient history retain the encounter
- Follow-up remains accessible
- Cache invalidation — no manual refresh required
