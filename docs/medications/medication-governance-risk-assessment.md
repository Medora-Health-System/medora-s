# Medication Governance — Risk Assessment (M1.3F.9)

**Phase:** M1.3F.9  
**Date:** 2026-06-02  
**Scope:** Operational and technical risks for production rollout of M1.3B–M1.3F.8  

**Overall program risk:** **LOW–MEDIUM**  
**Architecture stability:** **STABLE**  
**Legal chart:** **VERIFIED** (see rollout audit Part 4)  
**Billing foundation:** **VERIFIED WITH GAPS** (future enterprise billing)

---

## Risk summary

| Category | Level | Headline |
|----------|-------|----------|
| Clinical safety (runtime) | **LOW–MEDIUM** | Enforcement wired; catalog coverage gaps remain |
| Data integrity | **LOW** | Append-only MAR + governance rows; transaction-bound persist |
| Legal / audit | **LOW** | PHI-safe audit metadata; chart export integration tested |
| Performance | **LOW–MEDIUM** | Batched queries; minor duplicate load on export |
| Operational | **MEDIUM** | Requires migrate + seed discipline |
| Billing / revenue | **MEDIUM** | Admin billing exists; waste/pharmacy/controlled billing future |

---

## Part 5 — Performance & operational risk (detailed)

### Queries introduced (M1.3C–F.8)

| Path | Additional work | Pattern | Risk |
|------|-----------------|---------|------|
| **MAR create** | `resolve*MarGovernance` × up to 4 domains | `medicationProduct.findFirst` + `pharmacyVerification.findFirst` per create | **MEDIUM** — bounded per administration, not N+1 across list |
| **Chart export `getManifest`** | `loadMedicationGovernanceEncounterBundle` | 4× `findMany` by `encounterId` + `marIds` / `orderItemIds` | **LOW** |
| **Unified timeline `getUnifiedTimeline`** | Same bundle loader after MAR `findMany` | 1 MAR query + 4 governance queries | **LOW** |
| **Full chart export** | `getManifest` also calls `buildUnifiedTimelineForExport` | **Potential duplicate** governance bundle load in one request | **MEDIUM** — optimize later by sharing bundle |
| **Orders list (medication)** | `loadLatestPharmacyVerificationByOrderItemId` | Batched by order item IDs where used | **LOW** |
| **Medication search** | None from governance program | — | **LOW** |

### N+1 assessment

| Area | N+1? | Notes |
|------|------|-------|
| Chart export governance | **No** | Single batch per encounter |
| MAR administration list UI | **Not audited in F.9** | List views should use existing encounter-scoped queries |
| Pharmacy verification on order detail | **No** | Batch maps in `orders.service` |

### Index coverage (F.1 schema)

Governance tables include indexes on:

- `facilityId`, `encounterId`, `medicationAdministrationId`, `orderItemId`
- `verificationType`, `verificationStatus`, `overrideType`, `createdAt`

**Risk:** **LOW** for expected clinic encounter sizes.

### Production scaling concerns

| Concern | Severity | Mitigation |
|---------|----------|------------|
| Large encounter MAR count (50+ admins) | Low | Batch `in: marIds` still single round-trip per table |
| Frequent chart export on open encounters | Medium | Cache manifest per snapshot; export already encourages closed encounter |
| Audit log volume from governance | Low | PHI-safe compact metadata; standard retention policy |
| Seed re-run on production | Medium | Idempotent upserts; run in controlled window |

---

## Safety governance risk matrix

| Workflow | Failure mode if misconfigured | Likelihood | Impact | Residual risk |
|----------|------------------------------|------------|--------|---------------|
| Witness not captured | Controlled admin without witness row | Low (UI blocks) | High | **LOW** after training |
| Pharmacy bypass | Override without reason | Low (validation) | High | **LOW** |
| LASA wrong drug | Ack without selection when required | Low | High | **LOW** |
| Catalog not seeded | No gates for unmatched drug | Medium (ops) | High | **MEDIUM** — ops checklist |
| Override without audit | Would be critical | Very low | Critical | **LOW** (persist + audit in tx) |

---

## Legal & compliance risks

| Risk | Level | Control |
|------|-------|---------|
| PHI in audit metadata | **LOW** | `phiSafeGovernanceMetadata` patterns; chart summary excludes free-text reasons |
| Missing governance on legal export | **LOW** | F.8 manifest + tests |
| Snapshot tampering | **LOW** | Manifest hash + signature utilities (Phase 5F) |
| ROI parallel manifest drift | **LOW** | ROI uses chart export snapshots only |

---

## Billing foundation risks

| Future capability | Current state | Blocker? |
|-------------------|---------------|----------|
| NDC on MAR | Snapshot at create | No |
| HCPCS / J-code charge | Suggestion fields only | **Observation** — manual billing review |
| Infusion billing | Rules + MAR phases | No blocker for governance deploy |
| Waste billing | Documentation only | Not a governance blocker |
| Controlled substance reporting | Audit + flags | Regulatory reporting is future |

**Verdict:** **PASS WITH OBSERVATIONS** — deploy governance without waiting for enterprise billing.

---

## Deployment risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Migration not applied | **HIGH** if skipped | Pre-deploy SQL check |
| Seed skipped | **HIGH** for enforcement | Run `seed-catalogs`; verify counts in logs |
| Partial deploy (API only) | **MEDIUM** | API + web together |
| Rollback | **LOW** | Additive schema; rollback = disable UI + avoid new MAR with governance (old rows remain) |

---

## Risk register (top 8)

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Production DB missing F.1–F.7 migrations | High | Ops checklist + enum verification |
| 2 | Governance seed not run | High | Mandatory seed step in readiness doc |
| 3 | Drug on MAR not in governed catalog | Medium | Formulary gap program M1.2 |
| 4 | Tramadol / manual-review substances | Medium | Clinical policy decision |
| 5 | Duplicate governance load on export | Low | Engineering optimization |
| 6 | Known acetaminophen search e2e flake | Low | Track separately (M1.3B.1) |
| 7 | No eMAR due times | Low | Document as deferred; not a rollout blocker |
| 8 | Billing not tied to waste/pharmacy verify | Medium | M1.4 billing integrity phase |

---

## SAFE / NOT SAFE

| Scope | Verdict |
|-------|---------|
| Deploy M1.3B–F.8 code to pilot clinic (with migrate + seed) | **SAFE (conditional)** |
| Enterprise medication platform sign-off | **NOT SAFE** — catalog, search, billing, eMAR still partial |
| Legal chart / ROI for governed administrations | **SAFE** |

---

## Related

- [medication-governance-production-rollout-audit.md](./medication-governance-production-rollout-audit.md)
- [medication-governance-production-readiness.md](./medication-governance-production-readiness.md)
