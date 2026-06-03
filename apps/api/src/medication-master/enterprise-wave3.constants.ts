/** Marks M1.7B Wave 3 canonical linkage (inactive until explicit activation). */
export const ENTERPRISE_M17B_WAVE3_LINKAGE_MARKER = "ENTERPRISE_M17B_WAVE3_FORMULARY";

export const ENTERPRISE_M17B_WAVE3_GOVERNANCE_NOTES_PREFIX =
  "M1.7B Enterprise Wave 3 formulary — strict localization + billing; inactive until activation.";

/** Idempotently append Wave 3 governance marker + prefix; preserve prior wave markers. */
export function mergeEnterpriseWave3GovernanceNotes(existingNotes: string | null): string {
  const lines = (existingNotes ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  const hasMarker = lines.some((line) => line.includes(ENTERPRISE_M17B_WAVE3_LINKAGE_MARKER));
  const hasPrefix = lines.some(
    (line) =>
      line === ENTERPRISE_M17B_WAVE3_GOVERNANCE_NOTES_PREFIX ||
      line.includes("M1.7B Enterprise Wave 3 formulary")
  );

  const out = [...lines];
  if (!hasPrefix) {
    out.push(ENTERPRISE_M17B_WAVE3_GOVERNANCE_NOTES_PREFIX);
  }
  if (!hasMarker) {
    out.push(ENTERPRISE_M17B_WAVE3_LINKAGE_MARKER);
  }
  return out.join("\n");
}

export function productHasEnterpriseWave3GovernanceMarker(governanceNotes: string | null): boolean {
  return (governanceNotes ?? "").includes(ENTERPRISE_M17B_WAVE3_LINKAGE_MARKER);
}
