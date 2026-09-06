/**
 * ICD-10-CM release is selected by date of service, never "latest loaded".
 * Windows come from checked-in manifests. Overlap is an error.
 */

export type Icd10CmReleaseWindow = {
  releaseVersion: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string | null;
};

export function icd10CmDateOfServiceKey(raw: string | Date): string {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) {
      throw new Error("INVALID_DATE_OF_SERVICE");
    }
    return raw.toISOString().slice(0, 10);
  }
  const trimmed = raw.trim();
  const isoDay = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!isoDay) {
    throw new Error(`INVALID_DATE_OF_SERVICE: ${trimmed}`);
  }
  return isoDay[1]!;
}

export function icd10CmDateInReleaseWindow(dateKey: string, window: Icd10CmReleaseWindow): boolean {
  if (dateKey < window.effectiveFrom) return false;
  if (window.effectiveTo == null) return true;
  return dateKey <= window.effectiveTo;
}

export function selectIcd10CmReleaseVersionForDateOfService(
  dateOfService: string | Date,
  windows: readonly Icd10CmReleaseWindow[],
): string {
  const dateKey = icd10CmDateOfServiceKey(dateOfService);
  const official = windows.filter((window) => !window.releaseVersion.includes("DEV-SAMPLE"));
  const matches = official.filter((window) => icd10CmDateInReleaseWindow(dateKey, window));
  if (matches.length > 1) {
    throw new Error(
      `OVERLAPPING_ICD10_RELEASE_WINDOWS for ${dateKey}: ${matches.map((row) => row.releaseVersion).join(", ")}`,
    );
  }
  if (matches.length === 0) {
    throw new Error(`NO_ICD10_RELEASE_FOR_DATE_OF_SERVICE: ${dateKey}`);
  }
  return matches[0]!.releaseVersion;
}

export function uniqueOfficialIcd10CmReleaseWindows(
  manifests: readonly Icd10CmReleaseWindow[],
): Icd10CmReleaseWindow[] {
  const seen = new Set<string>();
  const out: Icd10CmReleaseWindow[] = [];
  for (const window of manifests) {
    if (window.releaseVersion.includes("DEV-SAMPLE")) continue;
    if (seen.has(window.releaseVersion)) continue;
    seen.add(window.releaseVersion);
    out.push(window);
  }
  return out.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
}

/** Official production windows. Checksums live in the API release manifest. */
export const ICD10_CM_OFFICIAL_RELEASE_WINDOWS: readonly Icd10CmReleaseWindow[] = [
  { releaseVersion: "FY2026", effectiveFrom: "2025-10-01", effectiveTo: "2026-09-30" },
  { releaseVersion: "FY2027", effectiveFrom: "2026-10-01", effectiveTo: null },
];

export function selectOfficialIcd10CmReleaseVersionForDateOfService(dateOfService: string | Date): string {
  return selectIcd10CmReleaseVersionForDateOfService(dateOfService, ICD10_CM_OFFICIAL_RELEASE_WINDOWS);
}
