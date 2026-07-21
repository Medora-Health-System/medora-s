# D2.5 — Dedicated Disposition Boards + Medical Screening Examination

**Certification ID:** `MEDUI.ED_DISPOSITION_DEDICATED_BOARDS_AND_MSE_D2_5`  
**Schema:** JSON-only (no Prisma migration)  
**D3B:** Unapplied migration preserved; `hospitalEpisodeFoundationEnabled` remains OFF

## Root cause (shared Home platform)

`EmergencyDispositionPanel` mounted `ProviderDischargeDocumentationSection` for HOME, AMA, LWBS, OTHER, and TRANSFER. Pathway headings were cosmetic; AMA/LWBS still participated in the Home discharge packet UI and save path.

## Architecture

```
EmergencyDispositionPanel
├── HomeDischargeBoard (ProviderDischargeDocumentationSection) — HOME only
├── AmaDispositionBoard
├── LwbsDispositionBoard
├── ElopementDispositionBoard
├── DeceasedDispositionBoard
├── AdmissionDispositionShell (existing)
├── ExternalTransferDispositionShell (existing extras)
└── GovernedOtherDispositionBoard
```

## MSE ownership

- Key: `nursingAssessment.medicalScreeningExaminationV1`
- Provider-owned legal **status** (NOT_STARTED → COMPLETED with SIGNED)
- Never claims EMTALA/legal compliance
- Never inferred from triage/vitals/registration alone
- Legacy `erProviderMseV1` narrative → LEGACY IN_PROGRESS (not COMPLETED)

## Pathway storage

- `erAmaDispositionV1`, `erLwbsDispositionV1`, `erElopementDispositionV1`, `erDeceasedDispositionV1`, `erOtherDispositionV1`
- First-class discharge modes: LWBS / Elopement (legacy OTHER+lwbsNarrative still reads as LWBS)

## Readiness

Single engine: `computeDispositionSafetyReadiness`  
Home instruction blockers → **HOME only**  
Pathway blockers → AMA / LWBS / ELOPEMENT / DECEASED / OTHER via shared evaluators

## Print routing

Home Discharge print layout → HOME only  
Other pathways → pathway print kind (archive/summary routing; panel guards Home layout)

## Authority (selective)

| Surface | Authority |
|---------|-----------|
| Home board | Authoritative (D2 preserved) |
| AMA / LWBS / Elopement / Deceased / Other boards | Structured MVP boards + readiness blockers |
| MSE status | Authoritative for NOT_STARTED vs SIGNED COMPLETED |
| Full MSE clinical form UI | Existing `EmergencyProviderMsePanel` (reuse) |
| Pathway print HTML templates | Routing authoritative; dedicated print HTML may expand |
| Closure | Existing readiness + close-check |

## Validation

```bash
pnpm ed-disposition:d25:validate:unit
pnpm ed-disposition:d25:validate:critical
pnpm ed-disposition:d25:validate:full
pnpm mse:validate:critical
```

## Rollout

1. Deploy JSON writers (flag-free; additive keys)
2. Keep D3B migration unapplied
3. Expand deceased/organ/ME/funeral print packages and MSE deep-link UI as review items
