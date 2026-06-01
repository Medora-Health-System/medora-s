# Medication Governance — Design Authorization (M1.3A)

**Phase:** M1.3A — Controlled Substance & High-Alert Governance Audit & Design  
**Date:** 2026-05-31  
**Type:** Design authorization only (no implementation, seed, migration, or production change)

---

## 1. Authorization summary

| Gate | Status |
|------|--------|
| M1.3A design complete | **YES** |
| M1.3B implementation | **NOT AUTHORIZED** (await explicit approval) |
| M1.3C–G implementation | **NOT AUTHORIZED** |
| Production catalog changes | **NOT AUTHORIZED** |
| Production DB writes | **NOT AUTHORIZED** |

---

## 2. Design artifacts approved (documentation)

| Document | Scope |
|----------|-------|
| [controlled-substance-governance-design.md](./controlled-substance-governance-design.md) | Parts 1–2 |
| [high-alert-medication-governance-design.md](./high-alert-medication-governance-design.md) | Parts 3–4 |
| [medication-safety-profile-design.md](./medication-safety-profile-design.md) | Parts 5–6 |
| [medication-edoc-integration-audit.md](./medication-edoc-integration-audit.md) | Part 7 |
| [medication-governance-risk-register.md](./medication-governance-risk-register.md) | Part 10 |
| [medication-governance-roadmap.md](./medication-governance-roadmap.md) | Parts 8–9, 11, 13 |

**Prerequisites satisfied:** M1.1A architecture audit, M1.1B data quality audit.

---

## 3. Architecture decisions (frozen for M1.3B+)

| ID | Decision |
|----|----------|
| AD-1 | **Canonical source of truth** for safety = `MedicationSafetyProfile` at concept level |
| AD-2 | **Controlled classifiers** = `CONTROLLED_NONE` … `CONTROLLED_OTHER` (string enum) |
| AD-3 | **High-alert classifiers** = `HIGH_ALERT_NONE` … `HIGH_ALERT_OTHER` (string enum) |
| AD-4 | **LASA** = `MedicationLasaGroup` + pair table (design); `lasaGroupId` on profile |
| AD-5 | **Legacy denorm** on `CatalogMedication` until explicit cutover (M1.6+) |
| AD-6 | **EDOC.8** remains legal documentation for HA infusion; not replaced by MAR |
| AD-7 | **Soft warnings** remain non-blocking until policy phase explicitly enables gates |
| AD-8 | **Clinical sign-off manifests** required before M1.3C/D seed/backfill |

---

## 4. SAFE / NOT SAFE

| Scope | Verdict |
|-------|---------|
| **M1.3A design package** | **SAFE** — documentation-only, no runtime change |
| **Enterprise medication safety (production)** | **NOT SAFE** — profiles unpopulated; controlled inconsistent |
| **Continued MVP use** | **SAFE (conditional)** — legacy catalog + EDOC.8 + soft warnings |

---

## 5. Clinical sign-off required (before implementation)

| Manifest | Owner | Blocks |
|----------|-------|--------|
| Controlled substance list + classifiers | Medical director / pharmacy | M1.3C |
| High-alert ISMP subset for Haiti ER | Pharmacy + nursing lead | M1.3D |
| LASA pairs | Pharmacy safety | M1.3E |
| EDOC card enablement list | Clinical ops | M1.3F |

---

## 6. Production readiness (post-design, unchanged from M1.1B)

| Domain | Score | Notes |
|--------|------:|-------|
| Catalog | 62 | Local dev |
| Search | 52 | |
| Safety governance | 12 | Design does not change score until implementation |
| Order workflow | 48 | |
| **Enterprise** | **44** | |

Production verification still **outstanding**.

---

## 7. Git

No commit in M1.3A. When approved:

```bash
git add docs/medications/*.md
git commit -m "Design medication safety governance architecture"
```

---

## 8. Sign-off block

| Role | Name | Date | Approve design (Y/N) |
|------|------|------|----------------------|
| Engineering lead | | | |
| Clinical lead | | | |
| Pharmacy lead | | | |

Implementation phases (M1.3B+) require separate authorization rows per phase.
