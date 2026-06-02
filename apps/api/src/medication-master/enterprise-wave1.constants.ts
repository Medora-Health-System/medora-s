/** Marks M1.6B Wave 1 canonical linkage (inactive until explicit activation). */
export const ENTERPRISE_M16B_WAVE1_LINKAGE_MARKER = "ENTERPRISE_M16B_WAVE1_FORMULARY";

export const ENTERPRISE_M16B_WAVE1_GOVERNANCE_NOTES_PREFIX =
  "M1.6B Enterprise Wave 1 formulary — billing + governance validated; inactive until activation.";

/**
 * M1.6B.3 — Idempotently append Wave 1 governance marker + prefix; preserve M1.5E and other lines.
 */
export function mergeEnterpriseWave1GovernanceNotes(existingNotes: string | null): string {
  const lines = (existingNotes ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  const hasMarker = lines.some((line) => line.includes(ENTERPRISE_M16B_WAVE1_LINKAGE_MARKER));
  const hasPrefix = lines.some(
    (line) =>
      line === ENTERPRISE_M16B_WAVE1_GOVERNANCE_NOTES_PREFIX ||
      line.includes("M1.6B Enterprise Wave 1 formulary")
  );

  const out = [...lines];
  if (!hasPrefix) {
    out.push(ENTERPRISE_M16B_WAVE1_GOVERNANCE_NOTES_PREFIX);
  }
  if (!hasMarker) {
    out.push(ENTERPRISE_M16B_WAVE1_LINKAGE_MARKER);
  }
  return out.join("\n");
}

export function productHasEnterpriseWave1GovernanceMarker(governanceNotes: string | null): boolean {
  return (governanceNotes ?? "").includes(ENTERPRISE_M16B_WAVE1_LINKAGE_MARKER);
}
