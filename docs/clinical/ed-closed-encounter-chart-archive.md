# Closed encounter chart — read-only archive workflow

## Decision

All Encounters → **View chart** for a **closed** ED encounter opens the existing
**Encounter Clinical Summary** in `CLOSED_READ_ONLY` mode on
`/app/emergency/chart/:id`. It does **not** open the editable Full Encounter /
active workspace by default.

## Reuse

- Same summary surface: `EmergencyErSummaryClosureSurface` →
  `EmergencyVisitSummaryPanel` → `EncounterClinicalRecordSummaryView`
- Display mode: `ACTIVE_SUMMARY` | `CLOSED_READ_ONLY`
  (`edClosedChartDisplayMode.ts`)
- Same loaders, data contract, domains, i18n, results/diagnostics links
- No duplicated summary component; no archive snapshot tables; no migration

## Routing

| Source | Behavior |
|--------|----------|
| All Encounters → View chart | `/app/emergency/chart/:id` — if server status is CLOSED/CANCELLED → archive summary |
| Open encounter → Chart / active flows | Unchanged active chart / workspace |
| Manual `/app/emergency/active/:id` for closed | Redirect to chart (closed summary) |
| Back from closed chart | `/app/emergency/trackboard?board=allEncounters` |

Closure status is taken from the **server** encounter payload, not the table label alone.

## Presentation

- Muted page shell and section accents
- Badge: CLOSED · READ ONLY / CLÔTURÉE · LECTURE SEULE
- High-contrast clinical text retained
- No triage / nursing / provider / order / disposition editors

## Controlled post-closure actions

Preserved when already authorized (not invented here):

- Billing review (role-gated link)
- Print from closed summary surface
- Admin-only controlled full chart link (generic encounter), not primary action

## Migration

**Required: NO**
