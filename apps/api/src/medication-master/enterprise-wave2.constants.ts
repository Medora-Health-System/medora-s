/** Marks M1.6D Wave 2 canonical linkage (inactive until explicit activation). */
export const ENTERPRISE_M16D_WAVE2_LINKAGE_MARKER = "ENTERPRISE_M16D_WAVE2_FORMULARY";

export const ENTERPRISE_M16D_WAVE2_GOVERNANCE_NOTES_PREFIX =
  "M1.6D Enterprise Wave 2 formulary — billing + governance validated; inactive until activation.";

/** Idempotently append Wave 2 governance marker + prefix; preserve M1.5E / Wave 1 and other lines. */
export function mergeEnterpriseWave2GovernanceNotes(existingNotes: string | null): string {
  const lines = (existingNotes ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  const hasMarker = lines.some((line) => line.includes(ENTERPRISE_M16D_WAVE2_LINKAGE_MARKER));
  const hasPrefix = lines.some(
    (line) =>
      line === ENTERPRISE_M16D_WAVE2_GOVERNANCE_NOTES_PREFIX ||
      line.includes("M1.6D Enterprise Wave 2 formulary")
  );

  const out = [...lines];
  if (!hasPrefix) {
    out.push(ENTERPRISE_M16D_WAVE2_GOVERNANCE_NOTES_PREFIX);
  }
  if (!hasMarker) {
    out.push(ENTERPRISE_M16D_WAVE2_LINKAGE_MARKER);
  }
  return out.join("\n");
}

export function productHasEnterpriseWave2GovernanceMarker(governanceNotes: string | null): boolean {
  return (governanceNotes ?? "").includes(ENTERPRISE_M16D_WAVE2_LINKAGE_MARKER);
}
