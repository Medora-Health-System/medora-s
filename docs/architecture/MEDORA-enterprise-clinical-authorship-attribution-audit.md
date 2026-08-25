# MEDORA enterprise clinical authorship attribution audit

**Certification context:** MEDUI.CP.1E (Care Plan care-setting + clinical authorship attribution convergence)  
**Scope:** Read-only enterprise sample. **Do not remediate unrelated domains in CP.1E.**  
**Worktree / branch:** `.worktrees/cp1e` · `medui-cp1e-care-plan-authorship-attribution-convergence`  
**Base:** `origin/main` @ `04b06b5b7` (CP.1D merged)

## Master Medora rule (recorded)

For every human-authored clinical documentation input persisted in Medora, the system must preserve authoritative attribution sufficient to display:

- Author name  
- Professional title / credentials  
- Date  
- Time  

Internal identifiers (user UUID, RoleCode, permission codes, D3/D4 labels, JSON, audit-event IDs) must never substitute for clinician-readable attribution in Workspace / Summary / Print.

**Authorship immutability:** User A may correct User A. User B documents forward under User B’s identity.

## Classification criteria

| Class | Meaning |
|---|---|
| **COMPLIANT** | Durable author user ID + frozen display-name snapshot (or equivalent) + professional title/credentials at documentation time + documented timestamp; Summary/Print use snapshot (not live User rewrite) |
| **PARTIAL** | Author ID + timestamp, but live name join and/or missing title/credentials snapshot |
| **NONCOMPLIANT** | No durable author identity and/or another user can overwrite authored content as if they were the author |
| **NOT APPLICABLE** | Domain not represented as human clinical documentation in current MVP |

## Domain matrix (sample)

| Domain | Classification | Evidence | Gap / next remediation (later phase) |
|---|---|---|---|
| Nursing Admission | **COMPLIANT** | `documentOwnerUserId`, `nurseSignature.{displayName,credentials,signedAt}`; INP.2G attribution projector | Completed-by name only when owner ≡ signer |
| Nursing Assessment / Reassessment | **COMPLIANT** | Inpatient assessment author fields + EDOC `authorDisplayNameSnapshot` / `authorRoleSnapshot` | Current JSON pointer is author-gated last-write |
| Provider H&P | **PARTIAL** | `signedByUserId` / `signedAt`; Summary live-joins User | No name/credentials snapshot on `hpDraft` |
| Progress Notes | **PARTIAL** | `EncounterNote` snapshots **COMPLIANT**; inpatient workspace progress items often ID+time only | Dual path — converge workspace path to Note/EDOC pattern |
| Consult Notes | **COMPLIANT** | Durable legal record = `EncounterNote` snapshots (D4B.8) | Soft note-type taxonomy |
| Procedure Notes | **COMPLIANT** | `EncounterNote` snapshots | Soft note-type taxonomy |
| Medication Administration | **PARTIAL** | `administeredByUserId` + `administeredAt`; corrections append-only | No display-name/title snapshot; chart live-joins User |
| Orders | **PARTIAL** | `Order.orderedBy` + `OrderEvent.roleSnapshot` | No name snapshot; UI live User enrichment |
| Laboratory result authoring | **NONCOMPLIANT** | `Result.verifiedByUserId` / upsert restamp | Last-write-wins content; live name join; no title snapshot |
| Radiology result authoring | **NONCOMPLIANT** | Same `Result` authority | Same as laboratory |
| RT | **PARTIAL** | EDOC.12 → clinical documentation entry snapshots when used | Many RT surfaces still `REFERENCE_VIRTUAL` |
| PT / OT / SLP | **PARTIAL** | Durable only when backed by EDOC / `EncounterNote` | Primary rehab surfaces often virtual |
| Care Management | **PARTIAL** | Virtual adapters with in-memory author args | No durable CM note store with frozen attribution |
| Discharge documentation | **PARTIAL** | JSON display name/title/time keys present | No durable `authorUserId`; mergeable aggregate JSON |
| Care Plan (post CP.1E) | **COMPLIANT** | `EncounterCarePlan*` snapshot columns + server `buildClinicalAuthorSnapshotPersist`; projector prefers snapshots; historical null → attribution unavailable (no live rewrite) | Pre-CP.1E rows may show unavailable attribution |

## Care Plan CP.1E snapshot authority (reference)

Canonical typed concept: `ClinicalAuthorSnapshot` (`packages/shared/.../clinicalAuthorSnapshotCp1e.ts`).

Persisted as **explicit nullable columns** (Medora Note/EDOC convention — not opaque JSON):

| Model | Snapshot fields |
|---|---|
| `EncounterCarePlan` | `activatedByDisplayNameSnapshot`, `activatedByProfessionalTitleSnapshot` |
| `EncounterCarePlanComponent` | `createdBy*` + `correctedBy*` + `correctedAt` + `correctionReason` |
| `EncounterCarePlanProgress` | `authorDisplayNameSnapshot`, `authorProfessionalTitleSnapshot` (+ existing `authorRoleSnapshot`) |
| `EncounterCarePlanReview` | `reviewerDisplayNameSnapshot`, `reviewerProfessionalTitleSnapshot` |
| `EncounterCarePlanTransition` | `actorDisplayNameSnapshot`, `actorProfessionalTitleSnapshot` |

Identity FKs remain authoritative. Write-time capture is server-side only.

## Care-setting note (Care Plan)

| Setting | Care Plan durable attach | Attribution surface |
|---|---|---|
| Inpatient | Yes | Workspace + Summary + Print |
| Observation (INPATIENT lane) | Yes (same engine) | Workspace; Summary placeholder still limited |
| ED / Clinic / Dental | No expand in CP.1E | Read-only enterprise audit only |

## Explicit non-goals of this document

- Does **not** authorize remediating Lab/Rad/MAR/Orders/H&P in CP.1E  
- Does **not** authorize production migration/seed outside release approval  
- Does **not** invent historical Care Plan attribution for pre-migration rows  

---

*Generated as part of MEDUI.CP.1E certification package. Remediation of PARTIAL/NONCOMPLIANT domains requires separate milestones.*
