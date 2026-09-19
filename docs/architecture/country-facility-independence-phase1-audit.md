# MEDORA Country & Facility Independence — Phase 1 Architecture Audit

**Phase:** 1 of 6 — audit only  
**Scope:** country separation, facility tenant isolation, facility capability independence, clinical module/workflow enforcement  
**Implementation changes:** none  
**Database migration:** none

## Executive finding

Medora already has a strong **facility-scoped tenant and configuration foundation**. Each facility has its own identity, service lines, care profile, and canonical `FacilityConfiguration` record with revision history. Clinical records across major domains are facility-scoped and multiple authorization tests fail closed for cross-facility access.

However, the requested model is **not yet complete end-to-end**:

1. Country exists as authoritative facility metadata and is used by selected jurisdiction-sensitive flows, but there is no canonical country configuration/capability authority equivalent to `FacilityConfiguration`.
2. Facility module independence is strong for top-level service lines/modules, but not every clinical surface consumes the canonical facility configuration.
3. Some clinical features still depend on deployment-wide environment flags or hard-coded availability. Inpatient Care Plan is a confirmed example.
4. Therefore, Medora can already represent many Facility A vs Facility B differences, but cannot yet certify that *every* disabled clinical capability is blocked across navigation, UI, API, writes, integrations, and patient-facing surfaces.

The next implementation phases should extend the existing authority. They must **not create country-specific application forks, duplicate order/result engines, or a second competing facility feature matrix**.

## 1. Existing authoritative hierarchy

Current effective architecture:

```
Medora platform
  -> Facility identity
       - country
       - timezone
       - defaultLanguage
       - facilityType
       - serviceLinesJson
       - facilityCareProfileJson
  -> FacilityConfiguration (one canonical row per facility)
       - modules
       - clinical/workflow settings
       - patient portal / digital care
       - ancillary services
       - integrations
  -> role / profession / department authorization
  -> facility-scoped clinical records
```

Target hierarchy after the later phases:

```
Medora global safety invariants
  -> Country policy/defaults
  -> Facility type/service-line eligibility
  -> Facility configuration/overrides
  -> Role/profession/department authorization
  -> Encounter/patient/resource facility boundary
```

A facility override may narrow a country capability. It must not enable a capability prohibited for that country.

## 2. Facility configuration authority — PASS / strong foundation

`packages/shared/src/facility/facilityConfiguration.ts` defines the canonical configuration document.

Top-level configurable modules include:

- emergency
- urgentCare
- clinic
- observation
- hospital
- laboratory
- radiology
- pharmacy
- billing
- scheduling
- digitalCare
- patientPortal
- telemedicine
- ai

Each module has runtime state that resolves to `LIVE`, `MAINTENANCE`, `READ_ONLY`, `HIDDEN`, or `DISABLED`.

The same document includes granular settings for Digital Care, Patient Portal, clinical rules, workflow, scheduling, telehealth, billing, laboratory, radiology, pharmacy, medication, AI, security, documents, consent, discharge, result release, messaging, and integrations.

`FacilityConfiguration.facilityId` is unique. `FacilityConfigurationRevision` provides append-only configuration history keyed by facility and revision.

Existing migrations backfilled one configuration row for every existing facility.

**Conclusion:** Facility A and Facility B can own different configuration documents without separate deployments or code forks.

## 3. Facility type and service-line independence — PASS / strong foundation

Configuration seeding derives module availability from:

- `facilityType`
- configured service lines
- optional modules
- language / facility identity

Hospital activation is derived from `HOSPITAL` or inpatient service lines. Emergency, urgent care, clinic, observation, laboratory, radiology and pharmacy are independently projected.

Existing D4C.9 governance explicitly establishes a single configuration authority and rejects a second `FacilityFeatureOverride`-style matrix.

Navigation already has capability-aware route gates, and existing design states that facility ADMIN does not override an absent facility capability.

**Conclusion:** The architecture already supports a U.S. hospital, Dominican clinic and Haitian clinic exposing different top-level service lines.

## 4. Facility clinical data isolation — PASS / broad existing coverage

Facility identity is present across major clinical and operational domains, including encounters, patients/facility links, orders, results, clinical documentation, care plans, appointments, hospital episodes, inventory, medication workflows, lab policies, exports and other records.

Existing tests/evidence include cross-facility denial behavior for admin exports, encounter operations and other protected resources. Patient Portal reads are constrained by both authorized `patientId` and `facilityId`; client-supplied country/facility ownership is not authoritative.

FHIR administrative/resource resolution is also constrained to the effective facility and hides foreign resources behind non-enumerating behavior.

**Conclusion:** The database/security model is already substantially facility-oriented. Phase 5 will certify breadth rather than replace this design.

## 5. Country identity — PARTIAL

`Facility.country` is authoritative facility metadata and is included in authenticated facility context. Facility creation/configuration exposes country, timezone and language.

FHIR foundation work already rejects request-supplied jurisdiction and derives jurisdiction from `Facility.country`.

International architecture documentation explicitly requires one canonical Medora clinical domain rather than separate Dominican/Haiti/U.S. servers or code forks.

What is missing is a canonical country capability/configuration authority that answers questions such as:

- Is a feature supported/permitted in this country?
- What are the country defaults for a hospital vs clinic?
- Which regulatory/billing/public-health/integration behaviors apply?
- Which facility settings may be overridden locally?
- Which country rules are mandatory and cannot be overridden?

No `CountryConfiguration`, country capability registry, or equivalent canonical inheritance layer was found in this audit.

**Conclusion:** Country is an identity/jurisdiction input today, not yet a complete clinical capability boundary.

## 6. Radiology example — SUPPORTED structurally, enforcement certification required

Radiology is represented in:

- top-level facility modules
- facility service lines / optional modules
- radiology-specific configuration
- Patient Portal controls
- integration configuration
- role/worklist/order/result infrastructure

This is sufficient to represent:

```
Clinic A: radiology enabled
Clinic B: radiology disabled
```

But Phase 4 must prove that disabled means disabled across every route and write path, not only navigation/configuration.

## 7. Care Plan example — PARTIAL / confirmed governance gap

Care Plans are facility-scoped clinical records through canonical `EncounterCarePlan*` authority, and Digital Care / Patient Portal each have facility configuration switches.

However, inpatient Care Plan availability still has deployment-level environment flags:

- `INPATIENT_CARE_PLAN_ENABLED`
- `NEXT_PUBLIC_INPATIENT_CARE_PLAN_ENABLED`

The inpatient UI consumes the browser flag. This is not sufficient for Facility A ON / Facility B OFF when both facilities run in the same deployment.

The Care Plan controller/service correctly uses authenticated `facilityId` for record isolation, but record isolation is different from feature availability.

**Conclusion:** Care Plan data is facility-isolated, but complete per-facility feature enablement is not yet certified and requires later remediation.

## 8. Deployment-wide flags / hard-coded capability risk — GAP

Search identified clinical surfaces that still use process environment flags for workflow availability, including inpatient operations/chart certification/direct admission families.

Additionally, inpatient operations contains capability projection code with ancillary values such as laboratory/radiology/pharmacy represented as always true in at least one projection path.

These patterns are valid for staged rollout/deployment safety, but a deployment-wide flag cannot serve as the final tenant-specific authority.

Required rule for later phases:

```
deployment safety gate
AND country eligibility
AND facility configuration
AND role/profession authority
= effective capability
```

Deployment flags may globally suppress a feature, but must never independently grant it to a facility.

## 9. Medora Staff / platform boundary — PARTIAL for explicit country scoping

Platform authority and customer facility roles are intentionally separate. Facility roles remain facility-scoped, while Medora Staff uses `MedoraStaffProfile + PlatformCapabilityGrant`.

The repository exposes facility country in platform/facility context, but this audit did not find a canonical `allowedCountries` / `countryScopes` field on `MedoraStaffProfile` or `PlatformCapabilityGrant`.

This does not invalidate facility tenant isolation, but it means explicit country-scoped Medora Staff authority should be re-certified against the intended operational policy in Phase 5. Do not infer country access merely from UI filtering.

## 10. Patient-facing surfaces — PARTIAL

Patient Portal configuration already has granular per-facility controls including:

- enabled
- appointments
- visits
- documents
- messages
- invoices
- medications
- labResults
- radiology
- carePlans
- telehealth
- notifications
- language

Digital Care has its own granular facility settings.

Patient authorization itself is facility-bound. Phase 4 must verify that all patient-facing endpoints and UI surfaces consume the same effective facility/country capability rather than only configuration presentation.

## 11. Billing, regulatory and interoperability — country-sensitive, not yet unified under country configuration

Billing already has facility-specific identity/workflow configuration. Interoperability uses facility-derived jurisdiction in important paths.

These are positive foundations, but they do not yet constitute a single country policy layer. U.S.-specific billing behavior, Dominican workflows, Haitian workflows, public-health rules, terminology and integrations must be inventoried and attached to one country authority in Phase 2 rather than scattered country checks.

## 12. Phase 1 capability matrix

| Domain | Facility data isolation | Per-facility capability model | Country policy model | Phase 1 result |
|---|---|---|---|---|
| Facility identity | Yes | Yes | Country stored | Strong |
| Emergency / UC / Clinic / Hospital | Yes | Service-line/module based | No canonical country inheritance | Strong facility / country gap |
| Laboratory | Yes | Yes | No canonical country inheritance | Strong facility / country gap |
| Radiology | Yes | Yes | No canonical country inheritance | Strong facility / enforcement audit needed |
| Pharmacy | Yes | Yes | No canonical country inheritance | Strong facility / country gap |
| Care Plans | Yes | Partial across surfaces | No | Gap confirmed |
| Patient Portal | Yes | Granular | Country via facility context/language only | Partial |
| Digital Care | Yes | Granular | No canonical country inheritance | Partial |
| Billing | Facility-scoped | Facility workflow/identity | Country-sensitive but decentralized | Partial |
| Integrations/FHIR | Facility-scoped | Facility authorization/config | Some jurisdiction derivation | Partial |
| Medora Staff | Separate platform authority | Capability grants | Explicit country grant not found | Re-certify |
| Clinical feature flags | N/A | Mixed facility + deployment flags | No | Gap |

## 13. Non-negotiable invariants for Phases 2–6

1. One Medora application and one canonical clinical domain; no U.S./DR/Haiti code forks.
2. Existing `FacilityConfiguration` remains the single facility configuration authority.
3. Country configuration becomes an upstream policy/default layer, not a competing facility matrix.
4. Country policy may prohibit a capability; a facility cannot override a prohibition.
5. Facility configuration may narrow eligible capabilities.
6. Role/profession/department permissions may further narrow access; they cannot resurrect a disabled capability.
7. UI hiding is never sufficient. API/write boundaries must enforce effective capability.
8. Historical signed/closed clinical records remain readable according to authorization even when a module is later disabled; disabling must not rewrite history.
9. No duplicate Orders, Results, Care Plan, Patient, Encounter or documentation engines per country/facility.
10. Platform/Super Admin exceptions must be explicit, audited and must not silently broaden ordinary clinical authority.

## 14. Exit decision

**Phase 1 status: COMPLETE as architecture audit.**

Proceed to Phase 2 with these implementation objectives:

- define the canonical country configuration/policy authority for U.S., Dominican Republic and Haiti;
- define inheritance/precedence with existing facility type/service lines and `FacilityConfiguration`;
- normalize country identifiers without breaking existing `Facility.country` data;
- distinguish country **eligibility/mandatory policy** from facility **preference/configuration**;
- add tests proving country policy cannot be bypassed by facility settings;
- preserve existing facility configuration and clinical engines.

Phase 2 should begin with schema/API design and compatibility tests before UI work.
