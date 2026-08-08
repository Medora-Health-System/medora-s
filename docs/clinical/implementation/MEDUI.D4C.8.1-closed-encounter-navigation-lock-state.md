# MEDUI.D4C.8.1 — Implementation record

## Implemented projection

`projectEncounterListLifecycle` centralizes the consultations-list presentation rule. It returns:

- `isClosed` only when `status === "CLOSED"`;
- `closedAt` only for a CLOSED encounter with authoritative metadata; and
- the canonical `/app/encounters/:encounterId` href for every lifecycle state.

The consultations table uses that projection to render a persistent neutral lock badge on CLOSED rows. The badge has visible localized text, a decorative lock glyph, an accessible status role, an accessible label, and a matching tooltip. When `closedAt` exists, the row presents it with the active encounter locale. The badge is outside the permission-controlled action cell, so its visibility does not depend on reopen or encounter-navigation authorization.

OPEN rows retain the prior status presentation and encounter action. No alternate encounter viewer or clinical workflow was added.

## Localization

English and French messages were added for the closed-lock badge and closure timestamp. Existing encounter-status localization continues to supply the localized `Closed`/`Fermée` status badge.

## Data and lifecycle impact

The audited patient encounter list already supplies the required lifecycle fields through `ENCOUNTER_LIST_SELECT`; therefore the API and D4C.7K lifecycle authority are unchanged.

- Local migration: not required.
- Production migration: not required.
- Local seed: not required.
- Production seed: not required.
