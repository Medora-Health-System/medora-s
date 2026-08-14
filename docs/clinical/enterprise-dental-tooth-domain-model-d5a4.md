# MEDUI.D5A.4 — Dental tooth domain model

## Authority layers

```
ToothFinding events (clinical authority)
        ↓
Current-state projection (rebuildable)
        ↓
Interactive odontogram UI (presentation)
```

## Canonical tooth identity

Internal codes (notation-independent):

- Permanent: `PERM_11` … `PERM_48` (FDI quadrant alignment)
- Primary: `PRIM_51` … `PRIM_85`

Display systems: `FDI` · `UNIVERSAL` · `PALMER` (architectural readiness; FDI + UNIVERSAL active in D5A.4 UI).

## Surfaces (canonical)

`MESIAL` · `DISTAL` · `OCCLUSAL` · `INCISAL` · `BUCCAL` · `FACIAL` · `LINGUAL` · `PALATAL`

Scope:

- `WHOLE_TOOTH` — surfaces empty
- `SURFACE_SPECIFIC` — one or more surfaces

## Clinical states

`OBSERVED` · `EXISTING` · `PLANNED` · `IN_PROGRESS` · `COMPLETED` · `RESOLVED` · `AMENDED` · `VOIDED`

PLANNED / IN_PROGRESS support readiness for D5A.5 treatment plans without merging plan engine into findings.

## Finding catalog (seed codes, not licensed CDT)

`CARIES` · `EXISTING_RESTORATION` · `FRACTURE` · `MISSING` · `IMPACTED` · `UNERUPTED` · `PARTIALLY_ERUPTED` · `RETAINED_PRIMARY` · `CROWN` · `BRIDGE_ABUTMENT` · `PONTIC` · `IMPLANT` · `ROOT_CANAL_TREATED` · `PERIAPICAL_CONCERN` · `WEAR` · `EROSION` · `ATTRITION` · `ABRASION` · `MOBILITY` · `SENSITIVITY` · `OTHER`

## Amendment / void

- Prefer new event with `supersedesFindingId` (amend)
- Soft void via `voidedAt` / reason — never silent hard delete of signed/closed history
- Same OPEN encounter may void an unsigned mistake created in that encounter

## Keys & indexes

- `facilityId` + `patientId`
- `patientId` + `toothCode`
- `encounterId`
- `facilityId` + `encounterId`
