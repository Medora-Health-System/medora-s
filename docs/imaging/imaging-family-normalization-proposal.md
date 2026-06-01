# Imaging Family Normalization Proposal

**Phase:** 3A (audit-only — design proposal, not implemented)

## Recommended canonical modality families

| Family code | Legacy sources | Medora today | Notes |
|-------------|----------------|--------------|-------|
| `XRAY` | Plain radiography, CR/DR, portables | `modality: XR` (17 rows) | Add laterality + view count as classifier dimensions, not separate free-text rows where possible |
| `CT` | Non-angiographic CT | `modality: CT` | Contrast phase (`WO` / `W` / `WWO`) should be classifier-backed |
| `CTA` | CT angiography | Folded into `modality: CT` today | Recommend distinct family or `MODALITY_CTA` classifier for search/billing |
| `MRI` | Magnetic resonance | `modality: MRI` (2 rows) | Contrast + spine region split required for enterprise parity |
| `MRA` | MR angiography | **Absent** | New family; do not overload `MRI` modality string |
| `ULTRASOUND` | Diagnostic US + duplex | `modality: US` | Separate `US` vs `US_DOPPLER` subfamilies for billing |
| `NUCLEAR_MEDICINE` | NM/VQ/HIDA | **Absent** | New family |
| `FLUOROSCOPY` | RF procedures | **Absent** | New family; includes fluoro-guided LP/tube/swallow |
| `ECHO` | *(not in legacy extract)* | **Absent** | Reserve for echocardiography if added later — do not conflate with `ULTRASOUND` abdominal/OB |

## Naming convention (proposed stable codes)

```
{FAMILY}_{BODY_REGION}_{LATERALITY?}_{CONTRAST?}_{VIEW?}_{PROTOCOL?}
```

Examples (future — not current Medora codes):

| Legacy label | Proposed code skeleton |
|--------------|------------------------|
| CT Head wo IV Contrast | `CT_HEAD_WO_CONTRAST` *(exists)* |
| CT Head w IV Contrast | `CT_HEAD_W_CONTRAST` |
| Knee Left 3V | `XRAY_KNEE_LEFT_3V` |
| CTA Chest Triple Rule Out | `CTA_CHEST_TRIPLE_RULE_OUT` |
| US Lower Extremity Left Venous Doppler | `US_DOPPLER_LE_VENOUS_LEFT` |

## Display name rules

| Field | English (`displayNameEn`) | French (`displayNameFr`) |
|-------|---------------------------|--------------------------|
| Source | Curated clinical English | Curated clinical French |
| Laterality | `Left` / `Right` / `Bilateral` when orderable | `Gauche` / `Droit` / `Bilatéral` |
| Contrast | `without contrast` / `with contrast` / `with and without contrast` | `sans contraste` / `avec contraste` / `avec et sans contraste` |
| Views | `(2 views)` when view count is orderable | `(2 incidences)` |

## Normalization principles

1. **Do not overload** a single Medora row with contrast + laterality + view permutations — legacy catalog treats these as distinct orderables (~267 rows).
2. **Prefer MRV classifiers** (`BODY_REGION`, `MODALITY`, `CONTRAST_TYPE`, `VIEW_COUNT`, future `LATERALITY`) over exploding row count when billing allows.
3. **Keep stable UUID `code`** immutable once orders exist; retire duplicates via Phase 2C/2D governance rather than rename.
4. **Separate angiography** (`CTA`, `MRA`) from parent modality for CPT and protocol governance.
5. **French product UI** uses `displayNameFr` only — never copy English legacy strings into French labels.

## Implementation sequencing (reference only)

1. Complete Phase 2D duplicate retirements (US/CT/CTA/XR abdomen pairs).
2. Expand MRV classifiers (laterality, view count, contrast).
3. Batch seed by family per Phase 2E roadmap (X-Ray → US → CT → MRI → Advanced).
4. Licensed CPT workbook per row before billing activation.
