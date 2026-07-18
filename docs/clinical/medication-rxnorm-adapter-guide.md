# RxNorm Adapter Guide

Wave 3 does **not** CREATE catalog rows from RxNorm.

- Existing: `prisma/medications/rxnorm/*` staging + verification
- Term-type policy: `MK_EXPANSION_WAVE3_RXNORM_TERM_TYPE_POLICY` (IN/PIN/MIN may match generics; BN = alias; SCD/SBD = product variants)
- Preserve RxCUI + release version when mapping exists
- Never fabricate RxCUI
- RxNorm is terminology, not full CDS
