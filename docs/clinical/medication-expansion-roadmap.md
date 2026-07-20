# Medication Expansion Roadmap

## COMPLETED

Medication Intelligence Phases 1–18
Status: complete and operationally certified

**Medication Knowledge Expansion Wave 2**
Emergency Medicine Catalog
Status: certified with review items (measured net-new never padded)

**Medication Knowledge Expansion Wave 3**
Import-Driven Comprehensive Formulary
Measured: 2006 distinct generics
Status: `MEDICATION_KNOWLEDGE_EXPANSION_WAVE_3_CERTIFIED`

**Medication Knowledge Expansion Wave 4**
Clinical Medication Library Expansion
Measured: 5206 distinct generics
Status: `MEDICATION_KNOWLEDGE_EXPANSION_WAVE_4_CERTIFIED`

**Medication Orderable Catalog Completion**
Universal Provider Ordering
Measured coverage: 99.68% (10380 orderable / 33 non-orderable clinical)
Status: `MEDICATION_ORDERABLE_CATALOG_COMPLETION_CERTIFIED`

**Medication Formulation & Strength Completion**
Provider-Orderable Clinical Completeness (local-DB certification — invalidated for production UI)
Status: superseded for production by runtime availability remediation

**Medication Runtime Provider Availability Completion**
Production Railway DB + real `MedicationCatalogService.search` (Wayne Urgent Care)
Measured: hard acceptance PASS (Jardiance 10+25 mg, Biktarvy); 40-family inventory 100%
Status: `MEDICATION_RUNTIME_PROVIDER_AVAILABILITY_CERTIFIED_WITH_REVIEW_ITEMS`

## COMPLETED (also)

- Universal common medication orderability
- Production universal catalog APPLY (Railway)

## ACTIVE

**Permanent Medication Validation Suite**
Provider-facing regression protection via real `MedicationCatalogService.search`
Certification: `MEDUI.PERMANENT_MEDICATION_VALIDATION_SUITE`
Commands: `pnpm medication:validate:unit|critical|full|deployment`

## FUTURE

- Clinical medication knowledge
- Dosing intelligence
- Interaction intelligence
- Renal/hepatic considerations
- Scheduled source-version ingestion / licensed commercial knowledge (if licensed)

Do not begin FUTURE programs in the permanent validation suite project.
