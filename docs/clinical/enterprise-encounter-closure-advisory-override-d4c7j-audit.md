# MEDUI.D4C.7J — Audit

**Certification id:** `MEDUI.D4C.7J`  
**Branch:** `d4c7j-enterprise-encounter-closure-advisory-override`  
**Base:** `origin/main` @ `04547e4e8252f3511487df027e17caf5a921aefa` (D4C.7I merged)  
**Phase:** Phase 1 Clinic MVP  
**Scope:** Critical production-blocker corrective — encounter closure advisory override

---

## 1. Production evidence

| Field | Value |
|-------|-------|
| Method / path | `POST /api/backend/encounters/44d7099e-5617-4bc8-93aa-e31452188479/close` |
| HTTP status | **400 Bad Request** (repeated) |
| Facility header | `2deef640-019a-49f4-8593-76ca4aab2334` (forwarded) |
| Observed timestamps | `23:00:50.39` / `.66`, `23:00:59.06` / `.31`, `23:01:01.50` / `.73` |
| Railway | repeated `HttpException` 400 |

Proven:

- Nest close endpoint is reached
- Facility context is forwarded
- Server rejects the close
- Duplicate requests arrive ~200–300 ms apart

---

## 2. Exact production 400 response body (pre-fix)

Reproduced locally against the pre-D4C.7J close path with the same clinical shape (open ambulatory encounter, unsigned optional provider documentation and/or active infusion / pending medications). Representative bodies:

**A — documentation deficiency hard gate (first of a paired 400):**

```json
{
  "statusCode": 400,
  "code": "ENCOUNTER_CLOSE_DEFICIENCIES_NOT_ACKNOWLEDGED",
  "message": "…",
  "deficiencies": [{ "code": "NURSING_ASSESSMENT", "labelFr": "…" }]
}
```

**B — disposition safety / non-overridable (second of a paired 400 after a partial client retry):**

```json
{
  "statusCode": 400,
  "code": "ENCOUNTER_CLOSE_DISPOSITION_SAFETY_BLOCKED",
  "blockers": [{ "code": "PROVIDER_DOCUMENTATION_UNSIGNED" }]
}
```

or:

```json
{
  "statusCode": 400,
  "code": "ENCOUNTER_CLOSE_NON_OVERRIDABLE_BLOCKERS",
  "nonOverridable": [{ "code": "ACTIVE_INFUSION_RUNNING" }]
}
```

The Vercel access log only showed status 400; Railway’s `AllExceptionsFilter` likewise logged a generic `HttpException 400` without the typed clinical code — insufficient for diagnosis without the response body.

---

## 3. Duplicate-request evidence

Pairs within ~200–300 ms match the pre-D4C.7J ambulatory close client:

1. First `POST …/close` without acknowledgement → 400 (hard blocker or deficiency).
2. Client auto-retried with a **partial** acknowledgement (`acknowledgeDeficiencies: true` only) → second 400 from the next sequential hard gate (`DISPOSITION_SAFETY` / `NON_OVERRIDABLE`).

Contributing factors audited:

| Cause | Finding |
|-------|---------|
| Implicit `type="submit"` / form double-fire | Buttons are `type="button"`; not the primary cause |
| React Strict Mode | Dev-only; not production |
| Mutation auto-retry | No TanStack retry for this path; the retry was **application-level** in `runWorkflowAction` |
| Modal confirming original callback | Opening the modal still left the original close path able to re-enter |
| Proxy duplicate | Proxy issues exactly one upstream `fetch` per call (proven by D4C.7J proxy tests) |

---

## 4. Close-path audit (A→E)

### A. Web action

| Item | Authority |
|------|-----------|
| Button | Ambulatory workflow `COMPLETE_VISIT` / “Clôturer la rencontre” in `ClinicCareActiveAmbulatoryWorkspaceView` |
| Handler | `runWorkflowAction` → `closeAmbulatoryEncounterViaEnterprise` |
| Pre-fix retry | On deficiency 400, re-POSTed with `acknowledgeDeficiencies: true` only — never a full advisory acknowledgement |
| Post-fix | `d4c7jClosureReducer` state machine — one network request per deliberate action; advisory 409 opens modal; no automatic retry |

### B. API proxy (`/api/backend/[...path]` → `proxyNestRequest`)

| Concern | Finding |
|---------|---------|
| Method | Forwarded |
| JSON body | Forwarded unchanged (acknowledgement fields proven by `nestApiProxy.closeBody.d4c7j.test.ts`) |
| `content-type` | Preserved |
| Authorization / session | Bearer from cookie |
| `x-facility-id` | Forwarded (matches production logs) |
| Correlation / request id | Forwarded when present |
| Proxy retry on 409 | None — exactly one upstream call |

### C. Controller / DTO

| Item | Authority |
|------|-----------|
| Route | `POST encounters/:id/close` — enterprise `EncountersController` |
| Roles | `@RequireRoles(RN, PROVIDER, ADMIN)` (route access); **acknowledgement** enforced separately in service |
| DTO | `encounterCloseDtoSchema` — adds `acknowledgePendingClinicalItems`, `acknowledgementReason`, `clientRequestId`, `expectedVersion`; legacy aliases retained |
| Facility | Existing facility membership / encounter ownership |
| Actor roles | `resolveActorRoleCodes(req)` — covers `userRole`, `user.roleCodes`, `user.roles` |

### D. Service

| Step (required order) | Pre-fix | Post-fix |
|-----------------------|-----------|------------|
| Auth / facility / load | ✔ | ✔ |
| Already CLOSED → idempotent success | partial / inconsistent | ✔ `idempotent: true`, no audit duplicate |
| `expectedVersion` concurrency | absent | ✔ typed `ENCOUNTER_CLOSE_STALE_VERSION` |
| Advisory classification | three sequential hard gates | **one** `classifyEncounterCloseAdvisory` |
| Missing ack → typed advisory | 400 hard codes | **409** `ENCOUNTER_PENDING_CLINICAL_ITEMS` + preflight |
| Ack present → role check | incomplete / after blockers | ✔ `canAcknowledgeD4c7jClosure` |
| Close transactionally | ✔ | ✔ — encounter lifecycle only |
| Preserve pending items | intended | ✔ — no order/MAR/result mutation |
| One audit event | sometimes skipped / duplicated on retry | ✔ `buildD4c7jCloseAuditMetadata` once |

### E. Error shape (post-fix)

Advisory without acknowledgement:

```json
{
  "statusCode": 409,
  "code": "ENCOUNTER_PENDING_CLINICAL_ITEMS",
  "message": "Des éléments cliniques sont encore en attente. Cette rencontre peut être clôturée après confirmation.",
  "acknowledgementVersion": "d4c7j.v1",
  "preflight": { "…": "…" },
  "overrideAllowed": true,
  "nonOverridable": []
}
```

---

## 5. Exact root cause

**Server:** `EncountersService.executeEncounterClose` evaluated three clinical hard gates **before** any pending-items override:

1. Documentation deficiencies → `ENCOUNTER_CLOSE_DEFICIENCIES_NOT_ACKNOWLEDGED` (400)
2. Non-overridable readiness blockers → `ENCOUNTER_CLOSE_NON_OVERRIDABLE_BLOCKERS` (400) for `ACTIVE_INFUSION_RUNNING`
3. Disposition safety blockers → `ENCOUNTER_CLOSE_DISPOSITION_SAFETY_BLOCKED` (400) for `PROVIDER_DOCUMENTATION_UNSIGNED` (applied across care settings, not only ER/UC)

**Client:** After the first 400, the ambulatory workspace auto-retried with only `acknowledgeDeficiencies: true`, which never satisfied gates (2)/(3), producing the observed paired 400s within ~300 ms.

**Not the root cause:** proxy dropping the body (facility was forwarded; body forwarding is intact), cache, or a Clinic-only close endpoint.

---

## 6. Readiness-guard findings

`computeDispositionSafetyReadiness` still **detects** active infusions, critical/unacknowledged results, and pending orders. D4C.7J reclassifies former non-overridable / disposition codes via `D4C7J_BLOCKER_CODE_CLASSIFICATION` into advisory or priority-advisory categories. `clinicalBlockers` / `nonOverridable` on the close path are always empty arrays for clinical items.

Extended: `advisoryCounts.unacknowledgedResults` / `criticalUnacknowledgedResults` so critical results surface in the priority list.

---

## 7. Proxy body-forwarding conclusion

Acknowledgement boolean, version, reason, `clientRequestId`, `expectedVersion`, facility header, authorization, and request id all reach Nest unchanged. One upstream call per proxy invocation. Advisory 409 and idempotent 200 projections pass through without rewrite.

---

## 8. Migration / seed

| Item | Status |
|------|--------|
| Prisma migration | **None** — acknowledgement stored in existing generic audit metadata |
| Seed | **Unchanged** |
| Schema stop condition | Not triggered — `SAFE_METADATA_KEYS` extended with D4C.7J keys |

---

## 9. Deferrals captured for certification

1. Live browser UAT against the exact production encounter UUID (read-only diagnosis only; no production mutation in this milestone).
2. Multi-tab live push (still invalidation + navigation; no websocket fleet — Phase 4 offline / later).
3. Referrals as a separate pending counter beyond current readiness mapping (category reserved; count may be 0 until enterprise referral queue is wired).
4. Mandatory free-text reason for every priority category (optional reason field is present; policy can tighten later without schema change).
