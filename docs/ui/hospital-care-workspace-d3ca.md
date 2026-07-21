# D3CA — Hospital Care workspace

**Certification:** `MEDUI.HOSPITAL_CARE_WORKSPACE.D3CA`  
**Closure:** `MEDUI.HOSPITAL_CARE_WORKSPACE.D3CA.CLOSURE`
**Scope:** UI + navigation (+ minimal read-only placement list API).
**Not in scope:** Observation/Inpatient documentation, MAR, orders, progress notes, migrations, feature-flag enablement.

## Navigation audit (before → after)

| Before | After |
|--------|--------|
| Sidebar: Observation & short stay / Observation et court séjour | **Hospital Care** / **Soins hospitaliers** |
| Freestanding ER LAB/RAD alias: **Observation** for `/app/hospitalisation` | Same **Hospital Care** / **Soins hospitaliers** (no role alias) |
| Group: Soins et dossiers | **Accueil** (peer to Urgences) |
| Landing: operational INPATIENT floor board | **Hospital Care home** with section tiles |
| Floor board | `/app/hospitalisation/floor-board` — labeled **Floor Board** / **Tableau des unités** |

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
| `/app/hospitalization` | Legacy EN spelling → redirect to home |

## Placement data

`GET /internal-placement` — facility-scoped queue.

| Flag | Response |
|------|----------|
| OFF | `{ availability: "FEATURE_DISABLED", items: [] }` — **before** Prisma (no InternalPlacementRequest SQL) |
| ON | `{ availability: "ENABLED", items: [...] }` — Prisma errors propagate (never converted to empty lists) |

## Section visibility (module name unchanged)

| Section | Roles |
|---------|--------|
| Home | ADMIN, PROVIDER, RN, LAB, RADIOLOGY |
| Placement queue / Admissions | ADMIN, PROVIDER, RN |
| Observation / Inpatient shells | ADMIN, PROVIDER, RN, LAB, RADIOLOGY |
| Beds | ADMIN, RN, LAB, RADIOLOGY |
| Transfers | ADMIN, PROVIDER, RN |

UI filtering is complementary; API + facility JWT remain authoritative for data.

## Routing rule

ED remains primary until destination arrival. After arrival, patients appear under Observation or Inpatient shells by `requestedEncounterType`. ED Summary and HospitalEpisode are not removed. Hospital Care home does **not** auto-redirect to the floor board.

## Validation

```bash
pnpm placement:validate
pnpm trackboard:validate
pnpm encounter:validate:critical
pnpm verify
pnpm build
git diff --check
```
