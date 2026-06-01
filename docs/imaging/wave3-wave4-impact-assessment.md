# Wave 3 → Wave 4 Impact Assessment (Phase 2E.7E)

**Phase:** 2E.7E — read-only impact assessment  
**Date:** 2026-06-01  
**Prerequisite:** Wave 3 production **STABILIZED**  
**Reference plan:** [`enterprise-imaging-wave-plan.md`](enterprise-imaging-wave-plan.md) §5

**Parent:** [`wave3-production-stabilization-audit.md`](wave3-production-stabilization-audit.md)

---

## 1. Executive answer

| Question | Answer |
|----------|--------|
| **Any Wave 3 issues that block Wave 4?** | **NO** |
| **Wave 4 authorization may begin immediately?** | **YES** |
| **Production safety after Wave 3** | **SAFE** |

---

## 2. Wave 3 production state (baseline for Wave 4)

| Metric | Value | Stable? |
|--------|------:|:-------:|
| Active imaging | **182** | Yes |
| Haiti baseline active | **43** | Yes |
| Wave 1 active | **37** | Yes |
| Wave 2 active | **61** | Yes |
| Wave 3 active | **41** | Yes |
| Wave 3 aliases | **86** | Yes |
| Classifier FK (Wave 3) | **41/41** | Yes |
| Idempotent re-seed | Confirmed | Yes |
| Governance regression | **PASS** | Yes |
| Search adoption | **PASS WITH OBSERVATIONS** | Non-blocking |

---

## 3. Planned Wave 4 scope (roadmap)

Per [`enterprise-imaging-wave-plan.md`](enterprise-imaging-wave-plan.md):

| Batch | Rows | Focus | Pilot defer? |
|-------|-----:|-------|:------------:|
| **XR-3** | **7** | AC / clavicle / scapula | Partial |
| **XR-3b** *(optional)* | **33** | Extended XR parity | **Yes** |
| **CT-3** | **24** | Advanced CT anatomy / trauma-adjacent | **Yes** |

| Metric | Value |
|--------|------:|
| **Core Wave 4 rows** | **31** (XR-3 + CT-3) |
| **Optional XR-3b** | **+33** |
| **Total if full parity** | **64** |
| **Billing review (est.)** | **31–64** |
| **Alias strings (est.)** | **~40–90** (core); **~120–180** (with XR-3b) |

### Projected active imaging

| Scenario | Calculation | Active total |
|----------|-------------|-------------:|
| **After Wave 4 core** | 182 + 31 | **213** |
| **After Wave 4 + XR-3b** | 182 + 64 | **246** |
| **Enterprise core target (170 net-new)** | Haiti 43 + waves | **213** at Wave 4 core *(43+37+61+41+31)* |

*170 net-new design target is reached at **Wave 4 core** (127 prior net-new from W1–W3 + 31 = 158 catalog growth from 44 Haiti baseline; workbook accounting uses phased batches).*

---

## 4. Blocker analysis

| Potential blocker | Wave 3 status | Blocks Wave 4? |
|-------------------|---------------|:--------------:|
| Catalog count integrity | 182 stable, 0 dup codes | **No** |
| Classifier regressions | 41/41 complete | **No** |
| Idempotent seed | Confirmed | **No** |
| Forbidden / predecessor codes | Honored | **No** |
| Search gaps | 2 optional phrases + scope N/A MRI anatomy | **No** |
| Billing activation | Still deferred | **No** (same Gate W3 policy) |
| Phase 2D retirement | Not executed | **No** (separate gate) |
| CT-3 pilot scope | N/A | Plan deferral only |

---

## 5. Wave 4 risks (inherited — not Wave 3 regressions)

| Risk | Mitigation in planning |
|------|------------------------|
| **CT-3** scope / capability (24 rows) | Haiti pilot may defer full CT-3; authorize XR-3 first |
| **XR-3b** optional 33 rows | Defer unless enterprise XR parity required |
| Catalog size (+31 to +64) | Staging validation + rollback per batch |
| Advanced CT vs existing CTA/CT rows | Distinct codes; French labels; search QA |

---

## 6. Recommendations (planning only)

1. **Proceed** with Wave 4 **2E.8A** authorization package (XR-3 + CT-3 core; XR-3b optional).
2. **Reuse** Wave 1–3 patterns: manifest module, seed hook, `wave4-staging-validation.ts`, production gate discipline.
3. **Pilot option:** Ship **XR-3 only** (7 rows) before full CT-3 if clinic CT capability is limited.
4. **Do not** execute Wave 4 production until future authorization closes preflight (same as Waves 1–3).

---

## 7. Verdict

| Criterion | Result |
|-----------|--------|
| Wave 3 blocks Wave 4? | **NO** |
| Wave 4 authorization can begin? | **YES** |
| **SAFE / NOT SAFE** | **SAFE** |

---

*End of Wave 3 → Wave 4 impact assessment (Phase 2E.7E).*
