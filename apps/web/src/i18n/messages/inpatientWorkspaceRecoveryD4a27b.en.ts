/** D4A.2.7B — Inpatient workspace recovery (EN). */
export const inpatientWorkspaceRecoveryD4a27bEn = {
  roleLabel: "Workspace",
  roles: {
    PROVIDER: "Provider",
    NURSING: "Nursing",
    TECHNICIAN: "Technician",
    CHART: "Shared chart",
  },
  header: {
    mrn: "MRN",
    dob: "Date of birth",
    age: "Age",
    sex: "Sex",
    language: "Preferred language",
    encounterType: "Encounter type",
    hospitalDay: "Hospital day",
    admittedAt: "Admission date and time",
    unitRoomBed: "Unit / room / bed",
    attending: "Attending provider",
    rn: "Assigned RN",
    status: "Encounter status",
    chiefConcern: "Chief concern",
    codeStatus: "Code status",
    isolation: "Isolation precautions",
    allergies: "Allergies",
    quickActions: "Actions",
    actions: {
      vitals: "Document vital signs",
      orders: "Review orders",
      mar: "MAR",
      results: "Review results",
      fullChart: "Open full chart",
    },
  },
  unavailable: {
    title: "Inpatient chart unavailable",
    writersDisabled:
      "Documentation writers are disabled until the Inpatient encounter is resolved.",
    retry: "Retry",
    returnCensus: "Return to census",
    openSource: "Open source encounter",
  },
  errors: {
    MISSING_ID: "Missing Inpatient encounter id.",
    NOT_FOUND: "We could not find this encounter in the current facility.",
    FACILITY_MISMATCH: "This encounter belongs to another facility.",
    WRONG_ENCOUNTER_TYPE:
      "This encounter is not an Inpatient chart. Writers remain blocked.",
    ENCOUNTER_TYPE_MISMATCH:
      "This encounter type does not match the Inpatient workspace. Writers remain blocked.",
    ED_ENCOUNTER_REJECTED:
      "An Emergency Department encounter cannot be opened as the Inpatient workspace.",
    OBSERVATION_ENCOUNTER_REJECTED:
      "This Observation encounter must be opened in the Observation workspace.",
    LINEAGE_AMBIGUOUS:
      "Multiple linked hospital charts were found. Open the correct chart from the census or bed board.",
    UNAUTHORIZED: "Access restricted for this Inpatient chart.",
    FORBIDDEN: "You do not have permission to open this Inpatient chart.",
    FEATURE_DISABLED: "The Inpatient clinical workspace is not configured for this facility.",
    SCHEMA_COMPATIBILITY:
      "Hospital schema compatibility issue. Contact an administrator. Writers remain blocked.",
    SERVER_ERROR: "Server error while opening the Inpatient chart. Retry or contact support.",
    NETWORK: "Temporarily unavailable. Check the connection and retry.",
    UNKNOWN: "We could not resolve the active Inpatient encounter for this hospital episode.",
  },
  states: {
    LOADING: "Loading…",
    AVAILABLE: "Available",
    NO_DATA_DOCUMENTED: "No data documented",
    NOT_APPLICABLE: "Not applicable",
    NOT_CONFIGURED: "Not configured for this facility",
    TEMPORARILY_UNAVAILABLE: "Temporarily unavailable",
    ACCESS_RESTRICTED: "Access restricted",
    ENCOUNTER_MISMATCH: "Encounter mismatch",
    SOURCE_UNAVAILABLE: "Source unavailable",
    SAVE_FAILED: "Save failed",
    CONFLICT_DETECTED: "Conflict detected",
  },
  notes: {
    governedHpOnly:
      "History and physical uses the governed provider legal-record workflow. The generic note writer is not shown here.",
    governedProgressOnly:
      "Progress notes use the governed legal-record service. The generic note writer is not duplicated here.",
    governedNursingOnly:
      "Nursing documentation uses nursing admission and assessment workflows. The generic note writer is not duplicated here.",
  },
  resultsTitle: "Results and studies",
  additionalDocumentation: "Additional clinical documentation",
  admin: {
    observationOperations: "Observation operations",
  },
  save: {
    notSaved: "Not saved",
    saving: "Saving…",
    savedAt: "Saved at",
    saveFailed: "Save failed",
    conflict: "Conflict detected",
    readOnly: "Read-only",
    signed: "Signed",
    amended: "Amended",
  },
};
