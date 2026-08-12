# INP.1B.4 Nursing Admission Simplification — Implementation

The clinician rail exposes six stages only: Arrival & Identity; Immediate Assessment; History & Reconciliation; Safety & Physical Function; Psychosocial & Education; Review & Complete. The compatible twenty section IDs remain internal persistence keys. The former expandable twenty-item navigation was removed.

The rapid controls and explicit-save behavior are retained, including the state update that prevents a selected chip from being overwritten by a stale render closure. Enterprise integration panels continue to project and write through their existing authorities.

The Nursing Admission card in Inpatient Overview continues to consume `ops.nursing.admissionAssessmentComplete` and deep-links to the admission workspace. Completion is updated by the existing save/sign service; Overview owns no persistence.

The server remains the sole source for Summary/print. The normal legal renderer now groups findings into clinical sections, maps canonical codes to human-readable EN/FR labels, localizes dates, omits encounter/facility implementation IDs and revision integers, and hides domain linkage counts, technical warnings, and raw key/value dumps. Addenda remain append-only and display as dated human-readable entries without implementation IDs.
