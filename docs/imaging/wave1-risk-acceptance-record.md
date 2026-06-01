# Wave 1 Risk Acceptance Record (Phase W2.3)

**Phase:** W2.3  
**Date:** 2026-06-01  
**Authority:** Medora Health System  
**Companion:** [`wave1-governance-approval-record.md`](wave1-governance-approval-record.md)  

---

## 1. Purpose

Document risks Medora **accepts**, **rejects**, or **defers** for Wave 1 production catalog seed execution. This record supports Gate W2 partial closure and 2E.5A execution under conditions.

---

## 2. Accepted risks

| Risk ID | Description | Mitigation | Accepted by |
|---------|-------------|------------|-------------|
| **R-W1-01** | **PENDING_CPT_REVIEW** on all 37 Wave 1 rows — no priced CPT / charge capture | Gate W3; `billingCodeDefault` remains null; billing tests unchanged | Medora Product + Billing (defer capture) |
| **R-W1-02** | **`MRI_SPINE` intentional null contrast** (B1B) — must not regress to APPLY contrast on seed | Postflight SQL C3; never include `MRI_SPINE` in Wave 1 manifest | Engineering postflight |
| **R-W1-03** | **Predecessor codes remain active** (`CT_ABD`, `DOPPLER_VEIN`, `US_ABD`, `CT_CHEST_CTA`) until Phase 2D | Aliases point to successors where designed; Wave 1 does not insert forbidden codes | Clinical ops awareness |
| **R-W1-04** | **`CT_HEAD` inactive** — legacy orders may reference retired code in history | Successor `CT_HEAD_WO_CONTRAST`; search map excludes active `CT_HEAD` | Engineering + QA smoke |
| **R-W1-05** | **Baseline duplicate alias strings** (6 global pairs, e.g. `ct head` → inactive + active rows) | Pre-existing; not introduced by Wave 1; no Wave-1-internal duplicates | Accepted baseline debt |
| **R-W1-06** | **French search substring nuance** — `tdm tête contraste` does not match; `tdm tête avec` and legacy EN alias do | Documented in staging validation; not a Wave 1 regression; no search schema change in 2E.5A | Product / QA |
| **R-W1-07** | **Active catalog grows 43 → 80** — UI/search surface area increases | Staged Wave 1 only; rollback plan ready | Operations |
| **R-W1-08** | **Local validation ≠ production DB** until preflight C1 | Mandatory production preflight before seed | Engineering |

---

## 3. Rejected risks

| Risk ID | Description | Verdict | Action if detected |
|---------|-------------|---------|-------------------|
| **R-W1-X01** | Insert or reactivate **`CT_HEAD`** as active | **REJECTED** | Abort seed; rollback |
| **R-W1-X02** | Insert **forbidden** codes as new Wave 1 rows (`CT_ABD` duplicate row, `DOPPLER_VEIN` recreation, etc.) | **REJECTED** | Abort seed |
| **R-W1-X03** | **Billing mapping / CPT activation** during Wave 1 seed | **REJECTED** | Out of 2E.5A scope |
| **R-W1-X04** | **Hard delete** of catalog or aliases on rollback | **REJECTED** | Use `isActive=false` only |
| **R-W1-X05** | **Waves 2–4** rows in production seed | **REJECTED** | Wave 1 manifest only |
| **R-W1-X06** | **Modify W1 44-row** classifier tuples during Wave 1 apply | **REJECTED** | Seed sets only new 37 codes + `XR_CHEST` aliases |

---

## 4. Deferred risks

| Risk ID | Description | Deferred to | Blocks Wave 1 seed? |
|---------|-------------|-------------|---------------------|
| **R-W1-D01** | **CPT pricing / charge capture** for 37 rows | **Gate W3** | **No** |
| **R-W1-D02** | **Phase 2D retirement execution** (predecessor deactivation) | **2D gate** | **No** |
| **R-W1-D03** | **Search architecture** (tokenization, FR accent handling) | Future phase | **No** |
| **R-W1-D04** | **Enterprise Waves 2–4** (133 rows) | W2-Wave-2+ governance | **No** |
| **R-W1-D05** | **XR-3b optional slice** (+33 rows) | Product scope | **No** |
| **R-W1-D06** | **US tuple pass** (15 protocols on existing codes) | Wave 2 | **No** |

---

## 5. Known search nuance (explicit acceptance)

| Query | Behavior | Classification |
|-------|----------|----------------|
| `tdm tête contraste` | No match (substring) | **Accepted** |
| `tdm tête avec` | Matches `CT_HEAD_W_CONTRAST` | Expected path |
| `CT Head w IV Contrast` | Matches via alias | Expected path |

**Medora decision:** **Accepted** for Wave 1 production. Does not block 2E.5A. May be revisited under search redesign (deferred).

---

## 6. PENDING_CPT_REVIEW & MRI_SPINE (summary)

| Topic | Decision |
|-------|----------|
| **PENDING_CPT_REVIEW** | **Accepted** — catalog clinically orderable; billing not billable until W3 |
| **MRI_SPINE null contrast** | **Accepted** governance — **rejected** if postflight shows non-null FK |

---

## 7. Risk acceptance sign-off

| Role | Accept §2 | Reject §3 | Defer §4 |
|------|:---------:|:---------:|:--------:|
| Product / clinical (Medora) | ☐ | ☐ | ☐ |
| Engineering | ☐ | ☐ | ☐ |
| Operations | ☐ | ☐ | ☐ |

---

## 8. Return summary

| Field | Value |
|-------|--------|
| **Risk acceptance decision** | **Accepted with documented mitigations** (§2); **rejected** items in §3 enforced at execution |
| **PENDING_CPT_REVIEW** | **Accepted** (deferred W3) |
| **MRI_SPINE null** | **Accepted** (verify postflight) |
| **Search nuance** | **Accepted** |
| **SAFE / NOT SAFE** | **SAFE** to proceed under governance conditions · **NOT SAFE** to skip postflight or billing activation |

---

*W2.3 — no implementation.*
