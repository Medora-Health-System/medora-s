# Medora-S — Observation & short-stay positioning (Phase 13A)

**Status:** Governance + terminology + operational alignment only.  
**Operational workflow (Phase 13B):** see [OBSERVATION_OPERATIONAL_WORKFLOW.md](./OBSERVATION_OPERATIONAL_WORKFLOW.md).  
**Billing & exports (Phase 13C):** see [OBSERVATION_BILLING_AND_DOCUMENTATION.md](./OBSERVATION_BILLING_AND_DOCUMENTATION.md).  
**Product readiness & pilot (Phase 13D):** see [OBSERVATION_PRODUCT_READINESS.md](./OBSERVATION_PRODUCT_READINESS.md).  
**Not in scope for this phase:** Inpatient feature build, encounter lifecycle changes, billing math, MAR behavior, Prisma/API field renames, persisted disposition string changes.

## 1. Terminology standard

### Preferred (product & marketing)

| Concept | English | French (product UI) |
|--------|---------|---------------------|
| Core capability | Observation; Observation & short stay; Observation care | Observation ; Observation et court séjour ; Soins d’observation |
| Worklist / board (current INPATIENT open encounters) | Observation board; Observation care board | Tableau d’observation ; File d’observation |
| Encounter type `INPATIENT` (UI label only) | Observation & short stay | Observation et court séjour |
| LOS (future) | Observation LOS | Durée d’observation |

### Avoid in outward positioning (use only where legally/clinically required)

- “Full inpatient hospital EMR”, hospital floor, med-surg census, ICU, perioperative enterprise, national inpatient platform.

### Temporary compatibility (do not break)

| Item | Rule |
|------|------|
| Routes `/app/hospitalisation`, `/app/hospitalization` | **Keep.** Canonical UI is `/app/hospitalisation`; EN legacy redirects to FR spelling. |
| Prisma `EncounterType.INPATIENT` | **Keep** code and DB enum value. Relabel in UI only until a future phase defines a dedicated type if ever needed. |
| Persisted ER disposition mode string `Admission / hospitalisation` | **Keep** in TypeScript/backend constants and stored payloads. UI labels may use friendlier “Admission / observation (short stay)” where they are **display-only** and not used as equality keys against stored data. |
| Public-health / MSPP “hospitalized” (case report) | **Keep** field semantics; epidemiological “hospitalized” ≠ observation unit branding. Documented here; labels may be clarified later without renaming DTO fields. |
| API French error strings mentioning “hospitalisation” | **Unchanged** in 13A where they align with server rules; reduces risk of support confusion. |

### Future deprecation path (later phases)

1. Optional new encounter subtype or metadata for “observation level of care” without renaming `INPATIENT` immediately.  
2. If disposition vocabulary is ever versioned, introduce a migration mapping from `Admission / hospitalisation` to a neutral machine code while retaining read compatibility.  
3. Route alias `/app/observation` could mirror `/app/hospitalisation` once bookmarks and RBAC are fully mapped — **not done in 13A**.

## 2. Audit — where “hospitalization / hospitalisation” appeared (high level)

### Frontend — UI & routes

| Area | Nature |
|------|--------|
| `apps/web/app/app/hospitalisation/page.tsx` | Route shell; **path name unchanged**. |
| `apps/web/app/app/hospitalization/page.tsx` | Server redirect to canonical route. |
| `apps/web/src/features/hospitalization/*` | Feature folder name + components (**identifiers unchanged** in 13A). |
| `apps/web/src/components/app-shell/sidebarNavConfig.ts` | `href: /app/hospitalisation`, `labelKey: nav.hospitalisation`. |
| `SidebarNavIcons.tsx` | Icon keyed by path — **unchanged**. |
| `apps/web/src/lib/landingRoute.ts` | RBAC prefix + legacy redirect — **unchanged**. |
| `apps/web/src/lib/uiLabels.ts` | Legacy FR merge: `nav.hospitalisation`, `encounter.types.INPATIENT`. |
| `apps/web/src/i18n/messages/en.ts`, `fr.ts` | Nav, board, encounter chrome, timeline, operational handoff, emergency disposition **labels**, EMTALA/trackboard disposition labels, closeEncounter documentation defs. |
| `apps/web/src/i18n/messages/erTriage.en.ts`, `erTriage.fr.ts` | EMTALA disposition display strings. |
| `apps/web/app/app/encounters/[id]/page.tsx` | `showEncounterHospitalizationBanner` — **variable name / logic unchanged** (still `INPATIENT`). |

### Frontend — logic coupling (do not rename in 13A)

| File | Risk |
|------|------|
| `emergencyDispositionV1.ts` — `ER_DISCHARGE_MODE_ADMISSION = "Admission / hospitalisation"` | Used for **parsing and persistence mapping**. **Do not change** string value. |
| `encounterDischarge.ts` — same literal | Sync with disposition model. |
| `erTrackboardDispositionBadge.ts` — compares `mode === "Admission / hospitalisation"` | **Do not change** without data migration. |
| `apps/api/src/encounters/disposition-safety-readiness.util.ts` — `DISCHARGE_MODE_FR_ADMISSION` | Server-side readiness; **unchanged** in 13A. |

### Backend (unchanged in 13A)

- `encounters.service.ts` — French user-facing errors referencing “hospitalisation”.  
- `mspp.service.ts` / DTOs — `hospitalized` boolean for case narrative (distinct branding concern).  
- Chart export / audit enums — not relabeled in 13A.

### Docs

- `docs/ui/medora-ui-standards.md` — reference wording updated lightly.  
- `docs/PHYSICIAN_ADMISSION_MVP_VERIFICATION.md` — cross-linked to this doc; verification steps may still say “admission packet” (clinical object unchanged).

## 3. Safe UI renames applied (Phase 13A)

- Navigation label `nav.hospitalisation` (EN + legacy FR bundle): observation-oriented wording.  
- `encounterChrome` INPATIENT type label, hospitalization badge/lead for INPATIENT banner.  
- `hospitalizationBoard` i18n expanded; **HospitalizationBoardView** hardcoded French replaced with `t()`.  
- Encounter timeline / operational / emergency disposition / EMTALA / trackboard **display** strings that referred to “Hospitalization board” or inpatient-only positioning, without changing API or stored disposition constants.  
- `encounterCloseSafety` / documentation deficiency line for admission packet — clarified as structured admission (observation-capable).  
- `uiLabels.fr` nav + INPATIENT type aligned with French product terminology.

## 4. Deferred / risky renames (explicit)

- Prisma models, columns, migration folders, REST JSON field names, audit `action` / `entityType` literals.  
- Folder rename `features/hospitalization` → `features/observation` (large import churn).  
- Route path `/app/hospitalisation` → `/app/observation` without dual routes and RBAC updates.  
- Replacing stored disposition string `Admission / hospitalisation` in existing rows.  
- MSPP `hospitalized` field rename (would break API contracts and forms).

## 5. Billing / documentation impact inventory (future work only)

| Location | Future note |
|----------|-------------|
| Billing readiness / LOS | When observation billing rules are introduced, surface **observation LOS** in summaries and exports where stay length is clinically relevant; keep facility-scoped queries. |
| Chart exports & patient summaries | Replace inpatient-only phrasing in **export headers and narrative templates** once product copy is frozen; avoid changing machine keys in export JSON without a schema bump. |
| Disposition → billing bridge | Today admission path uses structured admission packet + level of care (including “Observation” in existing fields per UI help text). Deeper **observation billing** integration remains a later phase. |
| ROI / admin monitoring | No payload changes in 13A; any “hospitalization” in audit log **metadata** should be reviewed when audit message catalog is next revised. |

## 6. Non-goals (reaffirmed)

ICU, med-surg enterprise census, perioperative suite, national inpatient platform, offline inpatient ward management — **out of scope** for Medora-S positioning and for near-term roadmap unless explicitly replanned.

## 7. Verification (Phase 13A)

Run from repo root:

- `pnpm run verify:web`
- `pnpm run verify:api`
- `pnpm --filter @medora/web build`

## 8. Migration

**None** for Phase 13A (terminology and UI copy only).

## 9. Verdict

**SAFE WITH CAUTION** — Safe because identifiers, routes, APIs, enums, and persisted disposition literals are preserved; caution because observation positioning must stay aligned with **actual** capabilities (short-stay / ER-adjacent), and public-health “hospitalized” must not be conflated with the observation unit product story.

## 10. Files touched in Phase 13A implementation

- `docs/OBSERVATION_POSITIONING.md` (this document)
- `docs/ui/medora-ui-standards.md`
- `docs/PHYSICIAN_ADMISSION_MVP_VERIFICATION.md`
- `apps/web/src/i18n/messages/en.ts`, `fr.ts`, `erTriage.en.ts`, `erTriage.fr.ts`
- `apps/web/src/lib/uiLabels.ts`
- `apps/web/src/features/hospitalization/HospitalizationBoardView.tsx`
