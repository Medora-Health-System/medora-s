/**
 * Stable id for an escalation row within a specific 7d vs 7d comparison window (V1).
 * Same disease+geo may produce a new key when the sliding window advances.
 */
export type MsppAlertKeyParts = {
  scope: "DEPARTMENT" | "COMMUNE";
  diseaseCode: string;
  departmentId: string;
  /** Null for department scope rows. */
  geoCommuneId: string | null;
  /** ISO strings from escalation API `window.currentStart` / `window.currentEnd`. */
  windowCurrentStartIso: string;
  windowCurrentEndIso: string;
};

export function computeMsppAlertKey(parts: MsppAlertKeyParts): string {
  const gc = parts.geoCommuneId?.trim() ? parts.geoCommuneId.trim() : "-";
  const dc = parts.diseaseCode.trim();
  return `v1|${parts.scope}|${dc}|${parts.departmentId}|${gc}|${parts.windowCurrentStartIso}|${parts.windowCurrentEndIso}`;
}
