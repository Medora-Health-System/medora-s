/** Marks M1.7C Wave 4 ED/Hospital canonical linkage (inactive until explicit activation). */
export const ENTERPRISE_M17C_WAVE4_ED_HOSPITAL_LINKAGE_MARKER =
  "ENTERPRISE_M17C_WAVE4_ED_HOSPITAL";

export const ENTERPRISE_M17C_WAVE4_ED_HOSPITAL_GOVERNANCE_NOTES_PREFIX =
  "M1.7C Enterprise Wave 4 ED/Hospital formulary — billing + governance validated; inactive until activation.";

/** Idempotently append Wave 4 governance marker + prefix; preserve prior wave markers. */
export function mergeEnterpriseWave4EdHospitalGovernanceNotes(existingNotes: string | null): string {
  const lines = (existingNotes ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  const hasMarker = lines.some((line) =>
    line.includes(ENTERPRISE_M17C_WAVE4_ED_HOSPITAL_LINKAGE_MARKER)
  );
  const hasPrefix = lines.some(
    (line) =>
      line === ENTERPRISE_M17C_WAVE4_ED_HOSPITAL_GOVERNANCE_NOTES_PREFIX ||
      line.includes("M1.7C Enterprise Wave 4 ED/Hospital formulary")
  );

  const out = [...lines];
  if (!hasPrefix) {
    out.push(ENTERPRISE_M17C_WAVE4_ED_HOSPITAL_GOVERNANCE_NOTES_PREFIX);
  }
  if (!hasMarker) {
    out.push(ENTERPRISE_M17C_WAVE4_ED_HOSPITAL_LINKAGE_MARKER);
  }
  return out.join("\n");
}

export function productHasEnterpriseWave4EdHospitalGovernanceMarker(
  governanceNotes: string | null
): boolean {
  return (governanceNotes ?? "").includes(ENTERPRISE_M17C_WAVE4_ED_HOSPITAL_LINKAGE_MARKER);
}
