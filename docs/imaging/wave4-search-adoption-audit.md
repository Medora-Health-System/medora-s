# Wave 4 Search Adoption Audit (Phase 2E.8E)

**Phase:** 2E.8E — read-only search discoverability audit  
**Date:** 2026-06-01  
**Scope:** Wave 4 batches **XR-3** (7) · **CT-3** (24)  
**Method:** `ImagingCatalogService.search()` on **production** — default classifier terminology flags (**off**), matching deployed API

**Parent:** [`wave4-production-stabilization-audit.md`](wave4-production-stabilization-audit.md)

---

## 1. Summary

| Result | Detail |
|--------|--------|
| **Overall** | **PASS WITH OBSERVATIONS** |
| Production validation smokes | **8/8 PASS** |
| User-requested extended matrix | **13/15 PASS** (strict) |
| Blocking failures | **None** |

---

## 2. Production validation smokes (authoritative)

From production `wave4-staging-validation.ts` after seed run 1 (2026-06-01):

| Query | Expected code(s) | Result |
|-------|------------------|--------|
| `ac joint left` | `XR_AC_JOINT_LEFT_2V` | **PASS** |
| `clavicule gauche` | `XR_CLAVICLE_LEFT_2V` | **PASS** |
| `scapula gauche` | `XR_SCAPULA_LEFT` | **PASS** |
| `ct sinus` | `CT_SINUSES_WO_CONTRAST` | **PASS** |
| `TDM orbites` | `CT_ORBITS_WO_CONTRAST` | **PASS** |
| `soft tissue neck` | `CT_STN_*` | **PASS** |
| `ct knee left` | `CT_KNEE_LEFT_WO_CONTRAST` | **PASS** |
| `perfusion cérébrale` | `CT_BRAIN_PERFUSION` | **PASS** |
| `ct head` (regression) | No `CT_HEAD` | **PASS** |

---

## 3. Extended adoption matrix (production)

**Evidence:** Read-only `ImagingCatalogService.search()` on production Postgres (2026-06-01).

### XR-3 (shoulder girdle)

| Query | Wave 4 hit(s) | Pass | Notes |
|-------|---------------|------|-------|
| `ac joint left` | `XR_AC_JOINT_LEFT_2V` | **YES** | Production smoke |
| `clavicle left` | `XR_CLAVICLE_LEFT_2V` | **YES** | |
| `clavicule gauche` | `XR_CLAVICLE_LEFT_2V` | **YES** | Production smoke |
| `scapula left` | `XR_SCAPULA_LEFT` | **YES** | |
| `scapula gauche` | `XR_SCAPULA_LEFT` | **YES** | Production smoke |
| `ac joint` | `XR_AC_JOINT_*` (3 codes) | **YES** | Bilateral + L/R |

### CT-3 (head / neck)

| Query | Wave 4 hit(s) | Pass | Notes |
|-------|---------------|------|-------|
| `ct sinus` | `CT_SINUSES_WO_CONTRAST` | **YES** | Production smoke |
| `ct orbit` | `CT_ORBITS_WO_CONTRAST` | **YES** | |
| `tdm orbites` | `CT_ORBITS_WO_CONTRAST` | **YES** | Production smoke |
| `soft tissue neck` | `CT_STN_WO_CONTRAST`, `CT_STN_W_IV_CONTRAST`, `CT_STN_W_WO_CONTRAST` | **YES** | OBS-W4-S-01: multiple contrast variants returned |
| `ct neck soft tissue` | — | **NO** | OBS-W4-S-02: use `soft tissue neck` or `parties molles du cou` |

### CT-3 (MSK / perfusion)

| Query | Wave 4 hit(s) | Pass | Notes |
|-------|---------------|------|-------|
| `ct knee left` | `CT_KNEE_LEFT_WO_CONTRAST` | **YES** | Production smoke |
| `brain perfusion` | `CT_BRAIN_PERFUSION` | **YES** | |
| `perfusion cerebrale` | — | **NO** | OBS-W4-S-03: ASCII-only; use `perfusion cérébrale` or `brain perfusion` |
| `perfusion cérébrale` | `CT_BRAIN_PERFUSION` | **YES** | Production smoke |

**User-list strict pass rate:** **13 / 15** (86.7%).

---

## 4. Observations (non-blocking)

### OBS-W4-S-01 — `soft tissue neck` returns multiple STN rows

| Field | Value |
|-------|--------|
| **Impact** | Clinician may need to pick wo / w / w&wo variant |
| **Mitigation** | Prefer `CT_STN_WO_CONTRAST` label in UI; or refine alias to single default later |
| **Severity** | Low |

### OBS-W4-S-02 — `ct neck soft tissue` returns empty

| Field | Value |
|-------|--------|
| **Mitigation** | `soft tissue neck`, `parties molles du cou`, `CT_STN_*` display names |
| **Severity** | Low |

### OBS-W4-S-03 — `perfusion cerebrale` (no accent) returns empty

| Field | Value |
|-------|--------|
| **Mitigation** | `perfusion cérébrale`, `brain perfusion`, `CT perfusion` aliases on `CT_BRAIN_PERFUSION` |
| **Severity** | Low |

### OBS-W4-S-04 — Global duplicate alias groups (carry-forward)

Six pre-existing groups from Waves 1–3 era — unchanged; not introduced by Wave 4.

---

## 5. Verdict

| Criterion | Result |
|-----------|--------|
| Wave 4 clinically representative discovery | **PASS** |
| French order-entry phrases (XR, CT head) | **PASS** |
| CT MSK + perfusion discoverable | **PASS** |
| **Search adoption (2E.8E)** | **PASS WITH OBSERVATIONS** |

---

*End of Wave 4 search adoption audit (Phase 2E.8E).*
