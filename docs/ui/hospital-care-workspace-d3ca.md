# D3CA — Hospital Care workspace

**Certification:** `MEDUI.HOSPITAL_CARE_WORKSPACE.D3CA`  
**Scope:** UI + navigation (+ minimal read-only placement list API).  
**Not in scope:** Observation/Inpatient documentation, MAR, orders, progress notes, migrations, feature-flag enablement.

## Navigation audit (before → after)

| Before | After |
|--------|--------|
| Sidebar: Observation & short stay / Observation et court séjour | **Hospital Care** / **Soins hospitaliers** |
| Group: Soins et dossiers | **Accueil** (peer to Urgences) |
| Landing: operational INPATIENT floor board | **Hospital Care home** with section tiles |
| Floor board | `/app/hospitalisation/floor-board` (preserved) |

## Routes

| Path | Surface |
|------|---------|
| `/app/hospitalisation` | Home |
| `/app/hospitalisation/placement-queue` | Placement queue (D3C read-only) |
| `/app/hospitalisation/observation` | Observation census shell |
| `/app/hospitalisation/inpatient` | Inpatient census shell |
| `/app/hospitalisation/admissions` | Admissions table (D3C) |
| `/app/hospitalisation/beds` | Bed management shell |
| `/app/hospitalisation/transfers` | Transfers placeholder |
| `/app/hospitalisation/floor-board` | Legacy operational board |
| `/app/hospitalisation/active/[id]` | Technician workspace (unchanged) |

## Placement data

`GET /internal-placement` — facility queue, soft-empty when `INTERNAL_PLACEMENT_WORKFLOW_ENABLED` is OFF. No mutations from Hospital Care UI.

## Routing rule

ED remains primary until destination arrival. After arrival, patients appear under Observation or Inpatient shells by `requestedEncounterType`. ED Summary and HospitalEpisode are not removed.

## Validation

```bash
pnpm verify
pnpm build
pnpm placement:validate
pnpm trackboard:validate
git diff --check
```
