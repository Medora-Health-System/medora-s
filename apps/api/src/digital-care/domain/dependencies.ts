export const DIGITAL_CARE_ALLOWED_PUBLIC_DEPENDENCIES = [
  "auth",
  "authorization",
  "patients",
  "platform-staff",
  "facilities",
  "encounters",
  "results",
  "radiology",
  "pharmacy",
  "billing",
  "fhir",
  "platform-audit",
  "notifications",
] as const;

export const DIGITAL_CARE_FORBIDDEN_CROSS_DOMAIN_DEPENDENCIES = [
  "internal-repositories",
  "orm-models",
  "private-services",
  "internal-controllers",
  "implementation-only-files",
] as const;

export const DIGITAL_CARE_INTEGRATION_CHANNELS = [
  "public-contracts",
  "commands",
  "queries",
  "events",
  "explicitly-exported-interfaces",
] as const;

export const DIGITAL_CARE_AUTHORIZATION_INVARIANT =
  "Digital Care must never bypass Medora's central authorization model." as const;
