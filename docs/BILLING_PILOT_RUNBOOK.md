# Medora-S — Billing pilot runbook (operational)

**Audience:** billing staff, billing lead, clinical operations, administrators.  
**Purpose:** repeatable daily steps and pilot boundaries for clinic billing readiness. This document does not change product behavior; it describes how to operate the current billing features safely.

---

## 1. Pilot scope

| In scope | Out of scope (pilot) |
|----------|----------------------|
| **Manual billing review only** — staff classify order lines via the manual review queue and persisted decisions (`APPROVED`, `NEEDS_INFO`, `DO_NOT_BILL`). | **No auto-billing** — do not rely on or expect automatic charge generation from clinical events beyond what the product already does; pilot assumes human review drives billing readiness. |
| **Encounter billing ledger review** — verify lines, readiness/autobill *decision* display, and exports. | **No claim submission** to a payer or clearinghouse **without explicit billing lead approval** (pilot gate: lead confirms completeness and policy before any send/preview that could be treated as production). |
| **Exports** — CSV/JSON billing item export per encounter for audit and handoff. | **No expansion** of code catalogs, CPT/HCPCS seeding, or chargemaster content during the pilot unless a separate change request is approved. |

---

## 2. Daily workflow

Recommended order of operations each business day:

1. **Generate coverage report**  
   Run from repo root (or as documented in your deployment environment):

   ```bash
   pnpm exec tsx scripts/generate-billing-coverage-report.ts
   ```

   Use the output to spot catalog gaps, unmapped triggers, and concentration risk **before** deep-diving individual encounters.

2. **Review manual billing queue**  
   - **API:** `GET /billing/manual-review` (authenticated; facility-scoped JWT).  
   - **UI:** Billing → **Manual billing review** (`/app/billing/manual-review`).  
   Work items are grouped by billing status and category; each row should eventually have a **latest decision** and a visible **audit trail** after changes.

3. **Resolve decisions**  
   For each item requiring review:
   - **`APPROVED`** — acceptable to proceed for claim packaging/export *after* other blockers (below) are clear.  
   - **`NEEDS_INFO`** — clinical or coding follow-up required; document notes; do not treat as cleared for finalization until superseded or clarified.  
   - **`DO_NOT_BILL`** — line excluded from billable claim assembly paths that honor manual review; ensure stakeholders agree.

4. **Verify encounter ledger**  
   Open the encounter billing page: check ledger lines, readiness/autobill decision columns, and **manual review decision** column where order lines match. Confirm no unexpected **manual review gate** banner for encounters you intend to finalize.

5. **Export billing data**  
   - **API:** `GET /billing/encounters/{encounterId}/export?format=csv` (or `format=json`).  
   - Replace `{encounterId}` with the encounter UUID.  
   Attach exports to the pilot log or ticket for traceability.

6. **Billing lead signoff**  
   Billing lead confirms: queue cleared or intentionally deferred, exports archived, and **no claim submission** steps taken without documented approval.

---

## 3. Hard blocks (do not bypass)

Treat the following as **stop conditions** until resolved or explicitly accepted by billing lead (and clinical lead if patient care data is uncertain):

| Block | Meaning for staff |
|-------|-------------------|
| **Unresolved manual-review items** | Order lines still require a persisted decision that satisfies the claim gate (typically `APPROVED` or `DO_NOT_BILL` where applicable). `NEEDS_INFO` or missing decision blocks finalization/preview paths that enforce the gate. |
| **Missing billing status / readiness** | Readiness data unavailable or row not classifiable — do not assume billable; fix data or escalate. |
| **Pending-license CPT / chargemaster** | Items flagged as needing licensed CPT or facility chargemaster review must not be promoted to “ready” without that review. |
| **Medication candidate-only without policy** | Medication lines in **candidate-only** state require an explicit **manual billing policy** decision (often `NEEDS_INFO` with notes, `DO_NOT_BILL`, or `APPROVED` only after lead-approved rules). |

---

## 4. Roles and responsibilities

| Role | Responsibilities |
|------|------------------|
| **Billing clerk** | Runs coverage report; works the manual review queue; records `APPROVED` / `NEEDS_INFO` / `DO_NOT_BILL` with notes where required; pulls encounter exports; documents blockers. |
| **Billing lead** | Approves pilot-day closure; authorizes any claim preview/submission-like steps; adjudicates policy for candidate-only and pending-license items; signs off on GO/NO-GO. |
| **Clinical lead** | Responds to `NEEDS_INFO` that require diagnosis, orders, or documentation clarification; confirms clinical facts affecting billability. |
| **Admin / ops** | User access and roles (`BILLING`, `ADMIN`, facility context); coordinates environment, backups, and audit retention; ensures staff training on this runbook. |

---

## 5. Reference commands and endpoints

| Kind | Value |
|------|--------|
| **Coverage script** | `pnpm exec tsx scripts/generate-billing-coverage-report.ts` |
| **Manual review list (API)** | `GET /billing/manual-review` |
| **Encounter billing export (API)** | `GET /billing/encounters/{encounterId}/export?format=csv` (or `format=json`) |

**Note:** All API calls require authentication and a facility-scoped session as enforced by the API. Paths use `encounterId` (UUID), not a shorthand `:id`.

---

## 6. GO / NO-GO checklist (end of day or before any “submission” discussion)

Use this before declaring the pilot day successful or before billing lead allows downstream claim activity.

### GO — all must be true

- [ ] Coverage report generated and reviewed; critical gaps logged with owners.  
- [ ] Manual review queue triaged: no item left **unresolved** where the encounter is intended for billing finalization (or deferrals documented).  
- [ ] All `NEEDS_INFO` items either resolved or explicitly on a dated follow-up list approved by billing lead.  
- [ ] Encounter ledgers for in-scope visits spot-checked; exports stored for sampled encounters.  
- [ ] Billing lead **written signoff** (ticket/email) for the day or for any exception.  
- [ ] **No claim submission** (or equivalent production send) occurred without billing lead approval.

### NO-GO — any one triggers stop / escalate

- [ ] Unresolved manual-review gate on an encounter billed as “ready.”  
- [ ] Missing or inconsistent billing readiness for high-volume CPT-sensitive visits without lead waiver.  
- [ ] Pending-license or medication candidate-only lines pushed to “final” without documented policy.  
- [ ] Staff cannot access audit trail / decisions needed for external questions.  
- [ ] **Claim submission** or clearinghouse send attempted without billing lead approval.

---

## Document control

| | |
|--|--|
| **Migration** | Not required for this runbook. |
| **Seed data** | Not required for this runbook. |
| **Owner** | Billing lead + ops (update when pilot scope changes). |
