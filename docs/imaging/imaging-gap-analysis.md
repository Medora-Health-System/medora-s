# Imaging Gap Analysis

**Phase:** 3A (audit-only)

## Summary

| Metric | Count |
|--------|------:|
| **Total legacy studies** | **267** |
| **FULL coverage** | **23** |
| **PARTIAL coverage** | **107** |
| **MISSING** | **137** |
| **Medora seed rows (reference)** | **44** |

## Missing by modality family

| Family | Total | FULL | PARTIAL | MISSING |
|--------|------:|-----:|--------:|--------:|
| X-Ray | 118 | 3 | 62 | 53 |
| CT | 43 | 5 | 13 | 25 |
| CTA | 12 | 3 | 5 | 4 |
| MRI | 27 | 1 | 12 | 14 |
| MRA | 5 | 0 | 0 | 5 |
| Ultrasound | 53 | 11 | 15 | 27 |
| Nuclear Medicine | 5 | 0 | 0 | 5 |
| Fluoroscopy | 4 | 0 | 0 | 4 |

## Top missing study clusters (by clinical theme)

- **X-Ray — spine/specialty (C/T/L-spine, ribs, sinus, skull, etc.):** 53 legacy orderables
- **US — breast, vascular (arterial/carotid/UE), specialty:** 27 legacy orderables
- **CT — MSK/extremity, facial, perfusion, STN:** 25 legacy orderables
- **MRI — body/MSK/cholangiogram/sella:** 14 legacy orderables
- **MRA — entire modality:** 5 legacy orderables
- **Nuclear Medicine — entire modality:** 5 legacy orderables
- **CTA — extremity angiography:** 4 legacy orderables
- **Fluoroscopy — entire modality:** 4 legacy orderables

## Repository infrastructure notes (read-only)

| Area | Path | Role |
|------|------|------|
| Imaging seed | `apps/api/prisma/data/haiti-imaging-studies.ts` | 44 `CatalogImagingStudy` codes |
| Billing examples | `apps/api/prisma/data/billing-catalog-common.ts` | 20/44 example CPT mappings |
| CPT review queue | `apps/api/prisma/data/imaging-cpt-mapping-review.ts` | 44 pending_license rows |
| Search shortcuts | `apps/api/src/order-catalog/imaging-catalog.service.ts` | 9 exact-query alias maps |
| Duplicate governance | `apps/api/src/terminology/imaging-catalog-successor-map.ts` | 5 predecessor→successor pairs |
| MRV classifiers | `apps/api/prisma/data/mrv-classifier-foundation.ts` | BODY_REGION/MODALITY/VIEW/CONTRAST slices |