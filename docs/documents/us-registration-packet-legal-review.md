# US Enterprise Registration Packet — Legal Review Required

**Status:** `SOURCE_GROUNDED_PENDING_LEGAL_APPROVAL`
**Technical status:** Implemented (expandable disclosures, v2 templates, facility disclosure config)
**Legal status:** **NOT APPROVED** — Cursor must not report `LEGAL_CONTENT_APPROVED` until a named facility-authorized reviewer approves.

## What was implemented

- Expandable See more / Show less for substantial sections
- Full legal text snapshotted into `sourceJson` and rendered in PDF (not summary-only)
- Facility registration disclosure configuration model (`FacilityRegistrationDisclosureConfig`)
- EMTALA applicability enum (never assumes freestanding ER = EMTALA hospital)
- Medicare/Medicaid participation from facility config only (no hard-coded non-participation claim)
- No Surprises waiver kept out of general registration AOB; separate `NO_SURPRISES_NOTICE*` templates seeded as inactive DRAFT catalog codes
- Legal source manifests:
  - `apps/api/prisma/registration-packets/legal-sources/us-federal.json`
  - `apps/api/prisma/registration-packets/legal-sources/texas.json`
- Packet templates v2.0 for FREESTANDING_ER, URGENT_CARE, CLINIC, HOSPITAL
- Historical signed packets remain immutable (`sourceJson` + PDF hashes)

## Explicitly excluded / not auto-approved

- Priority ER branding, logos, addresses, phones, websites, compliance contacts
- Legacy dollar amounts / obsolete fee ranges
- Clinical research consent, marketing photo authorization, appeal AOR, NSA waiver in general consent
- Verbatim copying of legacy 11-page third-party packet

## Required before production “legally approved” labeling

1. Named facility counsel / compliance reviewer
2. Facility-specific contacts, participation flags, fee disclosures (if any) entered in configuration
3. EMTALA applicability set intentionally
4. NSA notice/consent workflow enabled only where legally required and reviewed
5. Publish section `legalReviewStatus` → `APPROVED` / `PUBLISHED` with approver metadata
6. Record approval timestamp and change reason on new template versions only

## Seed / migration

```bash
# Migration (additive)
pnpm --filter @medora/api exec prisma migrate deploy

# Templates only (no demo)
MEDORA_SEED_MODE=templates pnpm --filter @medora/api seed
```

## Certification labels

| Label | Value |
|-------|--------|
| Technically implemented | YES |
| Source-grounded | YES |
| Pending legal approval | YES |
| Legally approved | NO |
