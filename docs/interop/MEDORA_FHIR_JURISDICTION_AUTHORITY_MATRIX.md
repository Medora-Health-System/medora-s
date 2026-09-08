# Medora FHIR jurisdiction authority and applicability matrix

**Evidence date:** 2026-09-08  
**Classification:** versioned P0.3A evidence; not a conformance or certification claim

## Verification constraint

Direct requests from this execution environment to `hl7.org` and `healthit.gov` failed with an
HTTP 403 CONNECT-tunnel response on 2026-09-08. Consequently, this change pins only the already
normative FHIR R4 base version (`4.0.1`). It deliberately does **not** guess a current US Core,
USCDI, or SMART version. Dominican and Haitian national FHIR guides also remain unverified. A
release owner must repeat applicability review with official sources before enabling a package.

| Jurisdiction / layer | Official authority to verify | Canonical publication | Selected version | Status | Applicability and gap |
|---|---|---|---|---|---|
| FHIR R4 base | HL7 International | `https://hl7.org/fhir/R4/` | 4.0.1 | ARCHITECTURALLY_SUPPORTED | Base JSON structures only; normative package validation is NOT IMPLEMENTED. |
| United States / US Core | HL7 International | `https://hl7.org/fhir/us/core/` | Not selected | PENDING_AUTHORITY_CONFIRMATION | No US Core profiles are enabled or advertised. Not evidence of ONC certification. |
| United States / USCDI | ASTP/ONC, HealthIT.gov | `https://www.healthit.gov/isp/uscdi` | Not selected | PENDING_AUTHORITY_CONFIRMATION | Data-element applicability and selected publication require legal/product confirmation. |
| United States / SMART | HL7 International | `https://hl7.org/fhir/smart-app-launch/` | Not selected | PENDING_AUTHORITY_CONFIRMATION | OAuth discovery, authorization/token endpoints, JWKS, audience, launch context, PKCE, and backend services are NOT IMPLEMENTED and NOT ADVERTISED. |
| Dominican Republic | MISPAS / RNSIS | Official source not verified in this environment | None | PENDING_AUTHORITY_CONFIRMATION | Repository workflows are not treated as a national FHIR IG. No national profile is enabled or advertised. |
| Haiti | MSPP / national authority | Official source not verified in this environment | None | PENDING_AUTHORITY_CONFIRMATION | Repository MSPP workflows are not treated as a national FHIR IG. No national profile is enabled or advertised. |

## U.S. data/profile gap foundation

“Available” below means a repository canonical domain exists, not that it satisfies a current
USCDI element or US Core profile. Every row remains unvalidated against an applicable US package.

| Domain | Canonical Medora source | Availability / terminology / provenance | Candidate resource and current interaction | Validation | Phase / blocker |
|---|---|---|---|---|---|
| Patient demographics | `Patient` | Available subset; local MRN and recorded demographics | Patient read | Structural only | P0.3B; applicable US profile unselected |
| Encounter | `Encounter` | Available; canonical workflow timestamps/status | Encounter read | Structural only | P0.3B mapping completion |
| Vitals | `Encounter.vitals`, `Patient.latestVitalsJson` | Partial LOINC mapping; effective-time limitation documented | Observation read/search | Structural only | P0.3C canonical timestamp work |
| Problems/diagnoses | `Diagnosis` | ICD-backed records exist; profile mapping absent | Condition, NOT IMPLEMENTED | None | P0.3C |
| Allergies | canonical allergy domain | Repository domain exists; mapping not evidenced here | AllergyIntolerance, NOT IMPLEMENTED | None | P0.3C |
| Laboratory | Order/Result domains | Canonical data exists; terminology/provenance mapping incomplete | ServiceRequest/DiagnosticReport/Observation, NOT IMPLEMENTED | None | P0.3C |
| Imaging | Order/Result domains | Canonical data exists; mapping incomplete | ServiceRequest/DiagnosticReport, NOT IMPLEMENTED | None | P0.3C |
| Medication orders | canonical medication order domain | Available; RxNorm governance varies by record | MedicationRequest, NOT IMPLEMENTED | None | P0.3C |
| Medication administration | canonical MAR domain | Available with signed/correction history | MedicationAdministration, NOT IMPLEMENTED | None | P0.3C/G |
| Procedures | procedure/order domains | Partial canonical sources | Procedure, NOT IMPLEMENTED | None | Later approved scope |
| Care plans | `EncounterCarePlan` | Available with workflow attribution | CarePlan, NOT IMPLEMENTED | None | P0.3C |
| Documents/notes | enterprise documents and signed documentation versions | Available; immutable/signature controls must remain canonical | DocumentReference, NOT IMPLEMENTED | None | P0.3C/G |
| Provenance | audit and signed-version domains | Partial attribution; no general FHIR Provenance contract | Provenance narrow subset, NOT IMPLEMENTED | None | P0.3C/G |
| Practitioner/facility identifiers | User/Role/Facility | Internal IDs available; authoritative external identifiers incomplete | Practitioner/Organization/Location, NOT IMPLEMENTED | None | P0.3B |

No missing data is synthesized. Package activation requires authority confirmation, local pinned
artifacts and checksums, compatibility review, mapping tests, and accurate CapabilityStatement
generation.
