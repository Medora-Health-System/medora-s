/** M1.6F — Enterprise formulary Tranche A pilot activation marker. */
export const ENTERPRISE_M16F_TRANCHE_A_PILOT_MARKER = "ENTERPRISE_M16F_TRANCHE_A_PILOT";

export const ENTERPRISE_M16F_PILOT_GOVERNANCE_NOTES_PREFIX =
  "M1.6F Enterprise Tranche A pilot — formulary approved; provider search unchanged (M1.5F deferred).";

export function mergeEnterpriseFormularyPilotGovernanceNotes(
  existingNotes: string | null,
  pilotNote: string
): string {
  const lines = (existingNotes ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  const hasMarker = lines.some((line) => line.includes(ENTERPRISE_M16F_TRANCHE_A_PILOT_MARKER));
  const hasPrefix = lines.some(
    (line) =>
      line === ENTERPRISE_M16F_PILOT_GOVERNANCE_NOTES_PREFIX ||
      line.includes("M1.6F Enterprise Tranche A pilot")
  );
  const hasPilotLine = lines.some((line) => line.startsWith("Pilot:"));

  const out = [...lines];
  if (!hasPrefix) out.push(ENTERPRISE_M16F_PILOT_GOVERNANCE_NOTES_PREFIX);
  if (!hasMarker) out.push(ENTERPRISE_M16F_TRANCHE_A_PILOT_MARKER);
  if (!hasPilotLine) out.push(`Pilot: ${pilotNote.trim() || "M1.6F Tranche A"}`);
  return out.join("\n");
}

export function stripEnterpriseFormularyPilotGovernanceLines(notes: string | null): string {
  if (!notes) return "";
  return notes
    .split("\n")
    .filter(
      (line) =>
        !line.includes(ENTERPRISE_M16F_TRANCHE_A_PILOT_MARKER) &&
        !line.includes(ENTERPRISE_M16F_PILOT_GOVERNANCE_NOTES_PREFIX) &&
        !line.startsWith("Pilot:")
    )
    .join("\n")
    .trim();
}

export function productHasEnterpriseFormularyPilotMarker(governanceNotes: string | null): boolean {
  return (governanceNotes ?? "").includes(ENTERPRISE_M16F_TRANCHE_A_PILOT_MARKER);
}
