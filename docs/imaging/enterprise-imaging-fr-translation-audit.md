# Enterprise Imaging FR Translation Audit (Phase W2.1)

**Phase:** W2.1  
**Date:** 2026-06-01  
**Source:** [`enterprise-imaging-workbook.csv`](enterprise-imaging-workbook.csv) (**170** rows)  

---

## 1. Summary

| Status | Count | % |
|--------|------:|--:|
| **READY** | **170** | 100% |
| **MISSING** | **0** | 0% |
| **REVIEW_REQUIRED** | **0** | 0% |

All workbook rows include a non-empty `displayNameFr` suitable for Gate W2 staging.

---

## 2. Audit method

1. Imported all **170** rows from authoritative CSV.  
2. Verified `displayNameFr` non-null and non-empty.  
3. Flagged **REVIEW_REQUIRED** if: mixed EN/FR, missing diacritics where product requires, or ambiguous clinical term.  
4. Cross-checked against 2E.2 candidate lists (2E.2A–E).

---

## 3. REVIEW_REQUIRED queue (clinical polish — optional)

No blocking issues. Suggested clinical review at Gate W2 (non-blocking):

| Code | FR label | Note |
|------|----------|------|
| `MRA_BRAIN` | ARM cérébrale | Confirm “ARM” vs “ANGIO-IRM” clinic preference |
| `FL_LUMBAR_PUNCTURE` | Ponction lombaire (guidage fluoroscopique) | Legacy said “wo Fluoro” — FR clarifies guidance |
| `NM_GB_EMPTYING` | Étude d'évacuation vésiculaire | Confirm vs “vidange vésiculaire” |
| `US_CAROTID_DUPLEX` | Échographie duplex carotidienne | Standard duplex wording |

*These remain **READY** for workbook purposes; clinical may amend before production without code change.*

---

## 4. Modality FR patterns (verified)

| Modality | Pattern |
|----------|---------|
| XR | Radiographie {site} … |
| CT | TDM … |
| CTA | Angioscanner … |
| MRI | IRM … |
| MRA | ARM … |
| US | Échographie … / Doppler … |
| FL | … sous fluoroscopie / Œsophagogramme |
| NM | Scintigraphie … |

---

## 5. Gate W2 requirement

| Requirement | Status |
|-------------|--------|
| W2-O-03 French labels for wave slice | **READY** at workbook level |
| Clinical sign-off on FR | **OPEN** — per-wave review still required |

---

*W2.1 — audit only.*
