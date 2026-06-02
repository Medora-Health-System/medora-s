# Provider Search Canonical Cutover — Risk Register (M1.5F)

**Date:** 2026-06-02  
**Phase:** M1.5F audit only  
**Parent:** [provider-search-canonical-cutover-audit.md](./provider-search-canonical-cutover-audit.md)

---

## Risk matrix

| ID | Risk | Severity | Likelihood | Category | Mitigation |
|----|------|----------|------------|----------|------------|
| R-PS-01 | **Canonical-only cutover** exposes 904 acetaminophen + insulin clone rows | **CRITICAL** | Low if gated | Pollution | Never activate quarantine classes; deny-list in M1.5D |
| R-PS-02 | **Duplicate search results** (legacy catalog + canonical product both visible) | **HIGH** | High on naive cutover | Duplicate | Strategy D: one visible authority; enable `orderSearchEnabled` only per Haiti row |
| R-PS-03 | **Brand/generic alias collision** (Tylenol, Rocephin, Ativan, Glucophage) | **HIGH** | Medium | Alias | Manual review rows; dedupe by `catalogMedicationId` in API |
| R-PS-04 | **Removing M1.5E marker** drops Haiti rows from search | **HIGH** | Medium | Regression | Remove marker only when enabling search per runbook |
| R-PS-05 | **60 baseline 19G1-ACET links** suppress wrong catalog in search | **HIGH** | Current | Linkage | Unlink baseline before T1; M1.5E clean chains only |
| R-PS-06 | **256 unlinked catalogs** bypass gate → inconsistent behavior vs linked | **MEDIUM** | Current | Governance | Expected until M1.5E; document gate applies only when FK set |
| R-PS-07 | **Canonical alias path** adds rows when product `isActive` | **MEDIUM** | Post-M1.5G | Pollution | Keep products inactive until pilot; alias path requires active product |
| R-PS-08 | **Orders still use catalog ID** — product/package orders not pilot-ready | **HIGH** | Certain | Workflow | Defer `medicationProductId` on OrderItem to post-pilot schema phase |
| R-PS-09 | **Billing HCPCS drift** if catalog code changes | **HIGH** | Low | Billing | Immutable catalog codes; no code rewrite on cutover |
| R-PS-10 | **M1.3 safety not on canonical profile** at activation | **MEDIUM** | High | Governance | Run governance seeds on Haiti `conceptId` before T3 |
| R-PS-11 | **acetaminophen e2e flake** (lifecycle harness) | **MEDIUM** | Known | Test | Pre-existing; not cutover blocker but signals search ambiguity |
| R-PS-12 | **Performance regression** on gate query (N linked products) | **LOW** | Medium | Performance | Batch `filterProviderSearchCatalogIds`; cap search `limit` |
| R-PS-13 | **French/English display split** on same catalog row | **LOW** | Low | UX | Keep `displayNameFr` authoritative; enrich only |
| R-PS-14 | **MANUAL_REVIEW manifest rows (55)** activated by mistake | **HIGH** | Medium | Safety | Block activation in M1.5G tooling without reviewer flag |
| R-PS-15 | **Hybrid dual-index search (Strategy C)** | **CRITICAL** | Medium if chosen | Architecture | **Reject** Strategy C for MVP |

---

## Duplicate category summary

| Category | Severity |
|----------|----------|
| Acetaminophen canonical clone family | **CRITICAL** |
| Insulin clone family | **CRITICAL** |
| Blocked-med test concepts | **CRITICAL** |
| Brand/generic dual-label (same catalog row) | **HIGH** |
| Shared clinical shortcut aliases | **HIGH** |
| Multi-strength same INN (intentional SKUs) | **MEDIUM** |
| NDC duplicate clusters | **MEDIUM** |
| Duplicate catalog codes | **LOW** |

---

## Open issues (from M1.5A–E)

| Issue | Owner phase |
|-------|-------------|
| 0 `billingCodeDefault` locally | M1.4B seed on pilot |
| 0 persisted high-alert/LASA profiles | M1.3C–E on pilot concepts |
| Production DB not verified | M1.5H |
| Wrong 60 legacy links | Remediation before T1 |

---

## Sign-off criteria (for cutover readiness = YES)

- [ ] M1.5E backfill PASS on staging (192 links, 0 quarantine conflicts)  
- [ ] Search cardinality test: `acetaminophen` returns **≤1** Haiti row per intended policy  
- [ ] T1 pilot ≤82 enablements with before/after search diff captured  
- [ ] No increase in total visible search rows >5% without approved clinical list  
- [ ] Billing + MAR smoke on T1 sample (10 meds)  
- [ ] Rollback drill completed once
