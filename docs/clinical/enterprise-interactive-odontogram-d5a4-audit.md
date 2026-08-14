# MEDUI.D5A.4 — Interactive Odontogram Audit

**Prerequisites on main:** D5A.1–D5A.3, D4C.7K, D4C.8A–C  
**Branch:** `d5a4-enterprise-interactive-odontogram-tooth-findings`

## Existing reuse (unchanged)

| Domain | Authority |
|---|---|
| Patient / Encounter / Facility | Enterprise models |
| Lifecycle | D4C.7K OPEN / CLOSED / REOPEN |
| Closed legal record shell | D4C.8A Viewer + D4C.8B composition |
| Dental workspace | D5A.3 `EnterpriseDentalEncounterWorkspace` |
| Capabilities | D5A.2 `ODONTOGRAM_VIEW` / `ODONTOGRAM_EDIT` |
| Audit | `AuditLog` + Prisma `AuditAction` enum |
| Canonical tooth key helper | D5A.1 `buildCanonicalToothIdentityKey` |

## Gaps (require D5A.4)

- No Prisma tooth / dentition / finding tables
- Odontogram section is a D5A.3 placeholder only
- No interactive SVG tooth chart
- No encounter/patient odontogram API
- D4C.8B has no Dental findings section

## Normalized persistence decision

**Migration: REQUIRED (additive).**

Tooth-level clinical state is a true new domain. Do **not** force findings into untyped JSON as clinical authority.

### Models

| Model | Role |
|---|---|
| `PatientDentitionState` | Facility-scoped dentition type + numbering preference (PRIMARY / MIXED / PERMANENT) |
| `ToothFinding` | Append-oriented clinical events (whole-tooth or surface-specific) with amend/void metadata |

Surfaces stored as structured string array on `ToothFinding` (canonical surface codes). Separate `ToothSurfaceFinding` table deferred — array is normalized vocabulary, not free-text geometry.

Current odontogram visual state = **projection** from non-voided, non-superseded findings.

## Architectural forks (STOP)

`DentalPatient` · `DentalEncounter` · `DentalMedicalRecord` · `DentalClosedChart` · browser/localStorage clinical authority

## Closed / reopen behavior

- CLOSED encounter → odontogram read-only; no new findings
- Reopen (D4C.7K) restores OPEN workflow; does **not** rewrite historical findings
- D4C.8 legal record lists structured findings for the encounter (not a screenshot)

## Multi-tooth bulk edit

**Deferred** — provenance risk. Document single-tooth documentation for D5A.4.

## Deferrals

Treatment plan engine (D5A.5) · Periodontal (D5A.6) · Orthodontics (D5A.7+) · Image–tooth associations (D5A.9) · Licensed CDT catalogs
