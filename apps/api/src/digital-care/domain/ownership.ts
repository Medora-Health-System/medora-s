export const DIGITAL_CARE_OWNED_CONCEPTS = [
  "conversations",
  "message-threads",
  "patient-facing-notifications",
  "portal-preferences",
  "telemedicine-sessions",
  "patient-education-assignments",
  "patient-questionnaires",
  "digital-care-proxy-relationships",
  "digital-consent-workflows",
  "remote-monitoring-engagement",
  "patient-facing-ai-interactions",
] as const;

export const DIGITAL_CARE_EXTERNAL_SOURCES_OF_TRUTH = [
  "patient-clinical-chart",
  "encounter",
  "diagnosis",
  "medication",
  "allergy",
  "laboratory-result",
  "radiology-result",
  "pharmacy-order",
  "provider-staff-identity",
  "facility",
  "organization",
  "billing-ledger",
  "insurance-data",
  "authentication-credentials",
  "global-authorization-definitions",
  "fhir-canonical-clinical-resources",
] as const;

export type DigitalCareOwnedConcept = (typeof DIGITAL_CARE_OWNED_CONCEPTS)[number];
export type DigitalCareExternalSourceOfTruth =
  (typeof DIGITAL_CARE_EXTERNAL_SOURCES_OF_TRUTH)[number];
