# Medora web UI standards

Canonical implementation lives in code. This file is the **index** for humans and agents; it does not replace reading the source.

## Source of truth

| Area | Location |
|------|----------|
| Card shell tokens, priority/sync/pathway badges | `apps/web/src/components/medora-card/medoraCardTokens.ts` |
| Card components (`MedoraCard`, `MedoraCardInner`, `MedoraCardRoomBlock`, …) | `apps/web/src/components/medora-card/` |
| Reference layouts | e.g. `apps/web/app/app/trackboard/page.tsx` (inline tokens), hospitalization feature (Tailwind aligned to same values) |

## Shell and surface

- **Default card / panel**: `MEDORA_CARD_SHELL` — white background, `1px solid #e2e8f0`, radius **16**, shadow `0 1px 2px rgba(15, 23, 42, 0.06)`.
- **Pending sync variant**: `MEDORA_CARD_PENDING_SYNC_SHELL` (see tokens file).
- **Page canvas**: `#f8fafc` is the common app background for list/dashboard views.

## Badges

- Priority soft pills: `PRIORITY_BADGE_SOFT` + `getPriorityBadgeSoft`.
- Presets: `NEUTRAL_BADGE`, `PATHWAY_BADGE`, `SYNC_PENDING_BADGE` — use via `MedoraCardBadge` (`preset` / `soft`).

## List rows vs tables vs panels

- **Clinical worklist rows** (patient/encounter lines with identity, actions): `MedoraCard` family.
- **Dense columnar data** (many comparable columns): `<table>` inside a shell when needed; keep borders aligned with `#e2e8f0`.
- **Single form/summary block**: panel using `MEDORA_CARD_SHELL` or existing panel components.

## Rule

Cursor: `.cursor/rules/medora-ui-standards-enforcement.mdc` and `.cursor/rules/medora-card-system.mdc`.
