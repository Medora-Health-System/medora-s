const VERSION_RE = /^[A-Za-z0-9._+\-]{1,64}$/;

export const FHIR_TERMINOLOGY_SYSTEMS = Object.freeze({
  ICD10_CM: "http://hl7.org/fhir/sid/icd-10-cm",
  LOINC: "http://loinc.org",
  UCUM: "http://unitsofmeasure.org",
  SNOMED_CT: "http://snomed.info/sct",
} as const);

const VERSION_ENV_BY_SYSTEM: Readonly<Record<string, string>> = Object.freeze({
  [FHIR_TERMINOLOGY_SYSTEMS.ICD10_CM]: "FHIR_ICD10CM_VERSION",
  [FHIR_TERMINOLOGY_SYSTEMS.LOINC]: "FHIR_LOINC_VERSION",
  [FHIR_TERMINOLOGY_SYSTEMS.UCUM]: "FHIR_UCUM_VERSION",
  [FHIR_TERMINOLOGY_SYSTEMS.SNOMED_CT]: "FHIR_SNOMEDCT_VERSION",
});

/**
 * Returns only an explicitly configured, syntactically bounded terminology release version.
 * Medora never fabricates a version from today's date or from a code value.
 */
export function verifiedTerminologyVersion(system: string): string | undefined {
  const envName = VERSION_ENV_BY_SYSTEM[system];
  if (!envName) return undefined;
  const value = String(process.env[envName] ?? "").trim();
  if (!value) return undefined;
  if (!VERSION_RE.test(value)) throw new Error(`Invalid ${envName}`);
  return value;
}

export function verifiedCoding(system: string, code: string, display?: string) {
  const version = verifiedTerminologyVersion(system);
  return {
    system,
    ...(version ? { version } : {}),
    code,
    ...(display ? { display } : {}),
  };
}

export function terminologyConfigurationEvidence() {
  return Object.entries(VERSION_ENV_BY_SYSTEM).map(([system, envName]) => ({
    system,
    environmentVariable: envName,
    configured: Boolean(verifiedTerminologyVersion(system)),
  }));
}
