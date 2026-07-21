# D3D — Observation clinical workspace

**Certification:** `MEDUI.OBSERVATION_WORKSPACE.D3D`  
**Status:** Foundation + census + workspace shell + domain engines — **feature flag OFF**  
**Migrations:** none generated for D3D (reuses D3B/D3C + existing encounter clinical surfaces)  
**Do not activate:** Inpatient H&P, ICU/OR/PACU, enterprise transfers, automatic ED→Obs MAR copy

## Product identity

| Surface | Identity |
|---------|----------|
| Emergency | Originating `EMERGENCY` encounter |
| Observation | Destination receiving encounter (placement `requestedEncounterType = OBSERVATION`) |
| Inpatient | Later module (conversion pathway only in D3D) |

There is **no** `EncounterType.OBSERVATION`. Observation lane is placement type + separate receiving encounter.

## Feature flag

| Env | Default |
|-----|---------|
| `OBSERVATION_WORKSPACE_ENABLED` | OFF |
| `NEXT_PUBLIC_OBSERVATION_WORKSPACE_ENABLED` | OFF |

Flag OFF → census/shells render; clinical panels show deliberate feature-unavailable copy. No new Prisma models required for flag-OFF safety.

## Routes

| Path | Purpose |
|------|---------|
| `/app/hospitalisation/observation` | Observation census |
| `/app/hospitalisation/observation/active/[id]` | Observation workspace |
| `GET /observation-workspace/meta` | Flag availability envelope |

## Workspace tabs

Overview · Provider notes · Nursing · Orders · Results · Medications · Reassessment · Care plan · Summary · Disposition · Timeline

## Domain packages (`@medora/shared`)

- Identity / MAR / orders boundaries
- Provider note kinds, nursing surfaces
- Disposition pathways (home, convert IP, transfer, return ED, AMA, death)
- Reassessment intervals + escalation
- Chart certification deficiencies
- Timeline kinds
- ≥200 deterministic benchmark cases

## Validation

```bash
pnpm observation:validate
pnpm encounter:validate:critical
pnpm placement:validate
pnpm chart-certification:validate:unit
pnpm verify
pnpm build
```
