# Wave 2 → Wave 3 Impact Assessment (Phase 2E.6E)

**Phase:** 2E.6E — read-only impact assessment  
**Date:** 2026-06-01  
**Prerequisite:** Wave 2 production stabilized (this phase)  
**Reference plan:** [`enterprise-imaging-wave-plan.md`](enterprise-imaging-wave-plan.md) §4

**Parent:** [`wave2-production-stabilization-audit.md`](wave2-production-stabilization-audit.md)

---

## 1. Executive answer

| Question | Answer |
|----------|--------|
| **Any Wave 2 issues that block Wave 3?** | **NO** |
| **Wave 3 planning may proceed?** | **YES** (design, staging, authorization package — not production apply without future gate) |
| **Production safety after Wave 2** | **SAFE** |

---

## 2. Wave 2 production state (baseline for impact)

| Metric | Value | Stable? |
|--------|------:|:-------:|
| Active imaging | **141** | Yes |
| Wave 1 active | **37** | Yes |
| Wave 2 active | **61** | Yes |
| Classifier FK (Wave 2) | **61/61** | Yes |
| Idempotent re-seed | Confirmed (run 2) | Yes |
| Regression invariants | All **PASS** | Yes |

---

## 3. Planned Wave 3 scope

Per enterprise wave plan:

| Batch | Rows | Focus | Pilot defer? |
|-------|-----:|-------|:------------:|
| **MRI-2** | 14 | MSK MRI, pelvis, cholangiogram | No |
| **MRA-1** | 5 | New `MODALITY_MRA` | **Yes** (optional) |
| **US-2** | 10 | Carotid + LE/UE arterial + UE venous | Partial optional |
| **US-3** | 3 | Breast L/R/bilateral | **Yes** (optional) |
| **FL-1** | 4 | Greenfield fluoroscopy | **Yes** (optional) |
| **NM-1** | 5 | Greenfield nuclear medicine | **Yes** (optional) |
| **Total** | **41** | | |

**Post–Wave 3 catalog (full plan):** 141 + 41 = **182** active (if no retirements).

**Pilot-minimum Wave 3 example:** MRI-2 + US-2 subset ≈ **18** rows.

---

## 4. Blocker analysis

| Potential blocker | Wave 2 status | Blocks Wave 3? |
|-------------------|---------------|:--------------:|
| Catalog count / growth integrity | 141 stable, no dup active codes | **No** |
| Classifier taxonomy / FK regressions | 61/61 Wave 2 complete | **No** |
| Idempotent seed path | Run 2 zero net inserts | **No** |
| Forbidden code boundaries (`CT_HEAD`, `US_ABD`, etc.) | Honored | **No** |
| US tuple / protocol governance | 15 mappings, 2 protocol FKs, no conflicts | **No** |
| Search adoption failures | 1 optional phrase (`heel xray`); mitigations exist | **No** |
| Billing activation | Still deferred (Gate W2) | **No** (same deferral as Wave 2) |
| Phase 2D retirement execution | Not run | **No** (Wave 3 design must still respect successors) |
| Global duplicate aliases | Pre-existing 6 groups | **No** (document in Wave 3 alias QA) |

---

## 5. Wave 3-specific risks (inherited, not introduced by Wave 2)

These are **planned** Wave 3 considerations from the wave plan — not regressions from Wave 2:

| Risk | Mitigation in planning |
|------|------------------------|
| **MRA-1** new modality classifier | Staging modality-filter smoke before production |
| **US-2** overlap with `DOPPLER_VEIN` / venous naming | Enforce “no duplicate `US_VENOUS_DOPPLER_LE`” exit criterion |
| **FL-1 / NM-1** greenfield modalities | Pilot defer; modality filter QA if included |
| **US-3** breast imaging | Pilot defer acceptable |
| Catalog size (+41) | Staging validation script pattern from 2E.6B |

---

## 6. Dependencies satisfied for Wave 3 authorization track

| Dependency | Status |
|------------|--------|
| Wave 1 production stable | **Closed** (2E.5C) |
| Wave 2 production executed | **Closed** (2E.6D operator run) |
| Wave 2 stabilization audit | **Closed** (2E.6E — this document) |
| Gate W2 workbook / per-wave sign-off | **Open** (process artifacts) |
| Wave 3 implementation package (2E.7x) | **Not started** — next engineering phase |

---

## 7. Recommendations (planning only — no implementation)

1. **Proceed** with Wave 3 **design + staging** package (MRI-2, US-2 minimum; defer MRA/FL/NM/breast per pilot matrix).
2. **Reuse** Wave 2 patterns: manifest TS module, seed hook, read-only `wave3-staging-validation.ts`, production authorization gate.
3. **Carry forward** search QA: test MRA/FL/NM modality filters; avoid duplicate venous US codes; include French display smoke.
4. **Do not** execute Wave 3 production seed until a future **2E.7D-style** authorization closes preflight gates (same discipline as 2E.6C.1A / 2E.6D).
5. **Optional** (future scoped): add alias `heel` → calcaneus XR-2 if clinical staff request; not required for Wave 3.

---

## 8. Verdict

| Criterion | Result |
|-----------|--------|
| Wave 2 blocks Wave 3? | **NO** |
| Wave 3 planning readiness | **YES** |
| Production remains safe for current clinicians | **SAFE** |

---

*End of Wave 2 → Wave 3 impact assessment (Phase 2E.6E).*
