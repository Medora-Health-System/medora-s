# MEDUI.D4C.7K — Enterprise Encounter Reopen Workflow

## Who may reopen

- Facility Administrator (`RoleCode.ADMIN`) with membership on the encounter facility
- Medora platform administrator (`MEDORA_SUPER_ADMIN`) with explicit facility context

## Who may not reopen (default)

- Provider
- RN
- Front desk / pharmacy / lab / radiology / billing / technicians

## User-facing wording

- English: **Reopen Encounter**
- French: **Rouvrir la rencontre**
- Do **not** say Unlock Chart / Unlock Encounter

## Confirmation dialog must state

1. Original closure remains in history
2. Signed notes remain signed
3. Billing is not automatically reopened
4. Prescriptions do not become editable
5. Previous room/bed is not restored
6. Reason is required

## API

```http
POST /encounters/:encounterId/reopen
```

```json
{
  "reason": "Closed accidentally",
  "reasonCode": "ADMIN_CORRECTION",
  "expectedVersion": 4,
  "clientRequestId": "uuid"
}
```

## After success

- `status = OPEN`, `closedAt = null`, `closedByUserId = null`, `reopenedAt` = now,
  `reopenedByUserId` = actor, `reopenCount` incremented
- Prior close rows in `EncounterLifecycleTransition` and the prior `ENCOUNTER_CLOSE` audit stay untouched
- Projections classify the encounter by authoritative `status`, so a reopened encounter with a historical
  `dischargedAt` still reads as OPEN
- Encounter returns to OPEN worklists for its care setting
- Room remains unassigned until authoritative room/bed assignment
- Query invalidation via care-setting adapters (`resolveReopenWorkspaceTarget`)
