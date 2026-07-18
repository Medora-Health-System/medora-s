# Medication Import Platform Architecture

Wave 3 establishes Medora as an **import-driven medication platform** that writes into the existing canonical engine.

## Pipeline

REGISTER_SOURCE → VALIDATE_INPUT → PARSE → NORMALIZE → STAGE → CLASSIFY → MATCH → DEDUPLICATE → RECONCILE → DRY_RUN → APPLY → VERIFY → REPORT

## Destination (unchanged)

CatalogMedication-first CREATE + inactive `EM_W3C_*` Concept → Product → Package dual-layer link.

## Platform components

| Component | Location |
|-----------|----------|
| Source registry | `@medora/shared` `medicationKnowledgeExpansionWave3.ts` |
| Importer | `apps/api/prisma/medications/wave3/medication-knowledge-expansion-wave3-import.ts` |
| CLI | `medication:wave3:*` |
| Curated extract | `wave3/data/medora-curated-wave3-candidates.json` |
| Job artifacts | `prisma/medications/audit-summaries/medication-knowledge-expansion-wave3-*.json` |

## Migration

**Not required.** Staging/jobs are file artifacts; RxNorm DB staging remains terminology-only.
