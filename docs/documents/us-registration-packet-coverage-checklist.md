# US Registration Packet — Coverage & Compliance Checklist

## Packet types

| Package | Expandable disclosures | Distinct from ER language | Config-gated EMTALA/Medicare | Status |
|---------|------------------------|---------------------------|------------------------------|--------|
| Freestanding ER | YES | N/A (ER-specific medicare notice) | YES | PENDING_LEGAL_APPROVAL |
| Urgent Care | YES | YES (no freestanding fee language unless configured) | N/A medicare ER notice | PENDING_LEGAL_APPROVAL |
| Clinic | YES | YES (no ER safety/belongings defaults) | N/A | PENDING_LEGAL_APPROVAL |
| Hospital | YES | YES + optional EMTALA when configured | YES | PENDING_LEGAL_APPROVAL |

## Brand / legacy scan

| Check | Expected |
|-------|----------|
| Priority ER in packet wizard/i18n/seed content | ABSENT |
| Legacy dollar amounts in packet content | ABSENT |
| Hard-coded Wayne / Priority addresses in reusable templates | ABSENT |
| Facility name from active facility on cards/PDF | PRESENT |

## Specialized documents (separate, not buried in general consent)

NO_SURPRISES_NOTICE, NO_SURPRISES_NOTICE_AND_CONSENT, ROI_AUTHORIZATION, INSURANCE_APPEAL_REPRESENTATIVE, TELEHEALTH_CONSENT, RESEARCH_CONSENT, MARKETING_PHOTO_AUTHORIZATION, and related codes — seeded inactive for future-ready use.

## Historical safety

- New version creates new EnterpriseDocument + PacketSource
- Finalized packets cannot re-render in place
- Template v2.0 does not rewrite v1.0 snapshots
