# M1.6E — Enterprise Formulary Risk Register

**Date:** 2026-06-02  
**Scope:** 134 enterprise medications (W1=45, W2=89) on Railway staging

---

## CRITICAL

| ID | Risk | Domain | Status | Mitigation |
|----|------|--------|--------|------------|
| R-C01 | Bulk activation could expose 134 unreviewed products | Activation | **Open** | No bulk path; tranche pilot only |
| R-C02 | Anticoagulation / high-alert activation without pharmacy workflow | Governance | **Open** | Exclude from tranche 1; witness + verification required |
| R-C03 | Billing enable on `J3490` unclassified without pharmacist review | Billing | **Open** | 13 W1 oral rows + review queue; block billing enable until cleared |

---

## HIGH

| ID | Risk | Domain | Status | Mitigation |
|----|------|--------|--------|------------|
| R-H01 | 100% billing profiles flagged `requiresManualReview` | Billing | **Open** | Clear in governance UI before billing step |
| R-H02 | Wave 2 controlled substances (4) activated without DEA workflow | Governance | **Open** | Defer controlled rows to dedicated tranche |
| R-H03 | Provider search cutover (M1.5F) conflated with formulary activation | Search | **Open** | Document separation; legacy catalog remains |
| R-H04 | Facility formulary not pre-linked to enterprise packages | Operational | **Open** | Create `FacilityFormularyItem` during pilot setup |
| R-H05 | Wave 2 ER critical meds (propofol, ketamine, etc.) in breadth set | Operational | **Open** | Exclude from early tranches |

---

## MEDIUM

| ID | Risk | Domain | Status | Mitigation |
|----|------|--------|--------|------------|
| R-M01 | Combined manifest search mock score 55% (pair coverage) | Search | **Monitoring** | DB aliases 100%; improve pair coverage in M1.6C follow-up |
| R-M02 | Wave 1 J-code coverage 32/45 (orals on J3490) | Billing | **Accepted** | Manual review + payer mapping |
| R-M03 | LASA groups not assigned on enterprise Wave 2 rows | Governance | **Monitoring** | LASA manifest applies at platform level; per-concept LASA optional |
| R-M04 | Seed log `wave2ReadinessPct=10` misread as failure | Operational | **Closed** | M1.6D.1 fixed; SQL confirms 89/89 |
| R-M05 | Concept inactive blocks provider search gate | Activation | **By design** | Activate concept in step 3 of workflow |

---

## LOW

| ID | Risk | Domain | Status | Mitigation |
|----|------|--------|--------|------------|
| R-L01 | Duplicate wave markers if re-seed bug regresses | Canonical | **Closed** | M1.6D.1 regression test; 0 dual markers on staging |
| R-L02 | Alias drift between manifest and DB | Search | **Monitoring** | Re-run alias seed idempotent; 750 aliases on staging |
| R-L03 | Wave 2 breadth increases governance review load | Operational | **Accepted** | Phased activation by category |
| R-L04 | Inactive products invisible in provider search | Search | **By design** | Expected until activation sequence complete |

---

## Risk summary

| Severity | Open | Closed |
|----------|-----:|-------:|
| CRITICAL | 3 | 0 |
| HIGH | 5 | 0 |
| MEDIUM | 4 | 1 |
| LOW | 3 | 1 |

**Overall posture:** Data layer is sound; **operational and workflow risks dominate**. No CRITICAL data-integrity defects on staging.

---

## Canonical / billing / search / activation risk crosswalk

| Domain | Primary risk | Staging evidence |
|--------|--------------|------------------|
| **Canonical** | Orphan / duplicate linkage | 0 orphans, 0 duplicate legacy |
| **Billing** | Revenue without review | 134/134 manual review flag |
| **Governance** | High-alert bypass | Gates + REVIEW_REQUIRED on all |
| **Search** | Undiscoverable meds | 134/134 alias on catalog; cutover pending |
| **Activation** | Uncontrolled go-live | 0 active, 0 order search |
