export const DIGITAL_CARE_MIGRATION_STAGES = [
  {
    id: "coexistence",
    objective: "Introduce Digital Care contracts without changing current patient or staff behavior.",
    entryCriteria: ["DC-1A through DC-1G contracts accepted"],
    exitCriteria: ["Existing patient portal, staff portal, APIs, auth, FHIR, and notifications remain regression-free"],
    rollback: "Remove Digital Care registration/contracts; existing workflows remain authoritative.",
  },
  {
    id: "read-adapters",
    objective: "Add read-only adapters over existing Medora capabilities behind Digital Care contracts.",
    entryCriteria: ["Central authorization adapter available", "Scope isolation tests passing"],
    exitCriteria: ["Read parity demonstrated without duplicate ownership"],
    rollback: "Disable adapters and return clients to existing APIs.",
  },
  {
    id: "capability-cutover",
    objective: "Migrate one Digital Care capability at a time behind independently controlled release boundaries.",
    entryCriteria: ["Capability-specific tests and audit coverage passing"],
    exitCriteria: ["Live client uses Digital Care API with parity and rollback proof"],
    rollback: "Route that capability back to the prior implementation without affecting other capabilities.",
  },
  {
    id: "write-ownership",
    objective: "Move write ownership only after a capability has proven read parity and authorization correctness.",
    entryCriteria: ["No unresolved data divergence", "Audit and idempotency controls validated"],
    exitCriteria: ["Digital Care is authoritative for its owned objects"],
    rollback: "Pause writes and reconcile before restoring prior authoritative path.",
  },
  {
    id: "legacy-retirement",
    objective: "Retire duplicated legacy paths only after sustained production validation.",
    entryCriteria: ["Rollback window completed", "Operational sign-off recorded"],
    exitCriteria: ["No active client depends on retired path"],
    rollback: "Restore retained compatibility path within the approved rollback window.",
  },
] as const;

export const DIGITAL_CARE_MIGRATION_INVARIANTS = [
  "No destructive database migration is authorized by DC-1H.",
  "Existing Medora authentication and authorization remain authoritative throughout migration.",
  "Organization, facility, and country isolation must pass before any capability is enabled.",
  "Current patient portal, staff portal, admin, billing, pharmacy, laboratory, radiology, email, FHIR, and deployment behavior must remain available until explicitly replaced by a validated capability cutover.",
  "Clinical chart, encounter, diagnosis, medication, allergy, lab, radiology, pharmacy, billing, identity, organization, facility, and canonical FHIR ownership remain outside Digital Care.",
  "Each capability requires an independent rollback path; migration is never all-or-nothing.",
  "Patient-facing Flutter clients may ship UI before a backend capability is live, but unavailable actions must remain non-destructive and clearly disconnected from production writes.",
] as const;

export type DigitalCareMigrationStageId =
  (typeof DIGITAL_CARE_MIGRATION_STAGES)[number]["id"];
