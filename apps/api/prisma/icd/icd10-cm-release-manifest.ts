/**
 * Checked-in manifests for official ICD-10-CM releases supported by Medora.
 * Checksums are computed from the exact CDC/NCHS artifacts used — never invented.
 */
import {
  selectIcd10CmReleaseVersionForDateOfService,
  uniqueOfficialIcd10CmReleaseWindows,
  type Icd10CmReleaseWindow,
} from "@medora/shared";

export type Icd10CmReleaseManifest = {
  codeSystem: "ICD-10-CM";
  releaseYear: number;
  releaseVersion: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string | null;
  sourceAuthority: "CDC/NCHS";
  /** Outer ZIP as published on CDC FTP. */
  artifactFileName: string;
  artifactSha256: string;
  sourceUrl: string;
  /** Preferred CMS order file inside the ZIP. */
  preferredInnerFile: string;
  preferredInnerFileSha256: string;
  expectedOrderRows: number;
  expectedBillableRows: number;
  notes: string;
};

/** FY2026 annual release (effective 2025-10-01 through 2026-09-30). */
export const ICD10_CM_FY2026_MANIFEST: Icd10CmReleaseManifest = {
  codeSystem: "ICD-10-CM",
  releaseYear: 2026,
  releaseVersion: "FY2026",
  effectiveFrom: "2025-10-01",
  effectiveTo: "2026-09-30",
  sourceAuthority: "CDC/NCHS",
  artifactFileName: "icd10cm-Code-Descriptions-2026.zip",
  artifactSha256: "a852eb91b3344ae38476e63816976ee1eeb94dcced7151118324f060e8499f88",
  sourceUrl:
    "https://ftp.cdc.gov/pub/health_statistics/nchs/publications/ICD10CM/2026/icd10cm-Code%20Descriptions-2026.zip",
  preferredInnerFile: "icd10cm-order-2026.txt",
  preferredInnerFileSha256: "6dc95c9c7e96c734806e1682f4bf9df76251d60e99199bba0d375ba3dd11026b",
  expectedOrderRows: 98186,
  expectedBillableRows: 74719,
  notes:
    "Official FY2026 Code Descriptions package (CDC/NCHS). April-2026 mid-year Code Descriptions ZIP on CDC FTP currently publishes PDF notes only; use this annual order file as the production text catalog unless a later text order file is supplied.",
};

/** FY2027 annual release (effective 2026-10-01). Does not replace FY2026 rows. */
export const ICD10_CM_FY2027_MANIFEST: Icd10CmReleaseManifest = {
  codeSystem: "ICD-10-CM",
  releaseYear: 2027,
  releaseVersion: "FY2027",
  effectiveFrom: "2026-10-01",
  effectiveTo: null,
  sourceAuthority: "CDC/NCHS",
  artifactFileName: "icd10cm-code-descriptions-2027.zip",
  artifactSha256: "93e3ad6004badf470c55bfe679b748ae88fd9b2b421851e409eec382c7713b9a",
  sourceUrl:
    "https://ftp.cdc.gov/pub/health_statistics/nchs/publications/ICD10CM/2027/icd10cm-code-descriptions-2027.zip",
  preferredInnerFile: "icd10cm-code-descriptions-2027/icd10cm-order-2027.txt",
  preferredInnerFileSha256: "38981fb2c1226e2b92393cef7d921d2293494dd184b5ad039dde08e4b364265f",
  expectedOrderRows: 98403,
  expectedBillableRows: 74879,
  notes:
    "Official FY2027 Code Descriptions package (CDC/NCHS), hashed from the CDC FTP ZIP on 2026-09-06. Use for dates of service on/after 2026-10-01. Do not overwrite FY2026 catalog rows.",
};

/** Local demo sample only — never certify production against this. */
export const ICD10_CM_DEV_SAMPLE_MANIFEST: Icd10CmReleaseManifest = {
  codeSystem: "ICD-10-CM",
  releaseYear: 2026,
  releaseVersion: "FY2026-MEDORA-DEV-SAMPLE",
  effectiveFrom: "2025-10-01",
  effectiveTo: null,
  sourceAuthority: "CDC/NCHS",
  artifactFileName: "icd10-cm-sample-dev.csv",
  artifactSha256: "",
  sourceUrl: "apps/api/prisma/data/icd10-cm-sample-dev.csv",
  preferredInnerFile: "icd10-cm-sample-dev.csv",
  preferredInnerFileSha256: "",
  expectedOrderRows: 106,
  expectedBillableRows: 106,
  notes: "Development-only representative sample. Not production-complete.",
};

export const ICD10_CM_RELEASE_MANIFESTS: Record<string, Icd10CmReleaseManifest> = {
  "2026": ICD10_CM_FY2026_MANIFEST,
  FY2026: ICD10_CM_FY2026_MANIFEST,
  "2027": ICD10_CM_FY2027_MANIFEST,
  FY2027: ICD10_CM_FY2027_MANIFEST,
  "FY2026-MEDORA-DEV-SAMPLE": ICD10_CM_DEV_SAMPLE_MANIFEST,
};

export function resolveIcd10CmReleaseManifest(release: string): Icd10CmReleaseManifest {
  const key = release.trim();
  const manifest = ICD10_CM_RELEASE_MANIFESTS[key] ?? ICD10_CM_RELEASE_MANIFESTS[`FY${key}`];
  if (!manifest) {
    throw new Error(
      `Unsupported ICD-10-CM release "${release}". Known: ${Object.keys(ICD10_CM_RELEASE_MANIFESTS).join(", ")}`,
    );
  }
  return manifest;
}

export function officialIcd10CmReleaseWindows(): Icd10CmReleaseWindow[] {
  return uniqueOfficialIcd10CmReleaseWindows(Object.values(ICD10_CM_RELEASE_MANIFESTS));
}

export function selectOfficialIcd10CmReleaseForDateOfService(
  dateOfService: string | Date,
): Icd10CmReleaseManifest {
  const version = selectIcd10CmReleaseVersionForDateOfService(dateOfService, officialIcd10CmReleaseWindows());
  return resolveIcd10CmReleaseManifest(version);
}

export function requireExplicitIcd10CmReleaseArg(release: string | undefined): string {
  const value = (release ?? "").trim();
  if (!value) {
    throw new Error("Missing --release=<FY2026|FY2027|...>. Do not silently assume FY2026 or latest loaded.");
  }
  return resolveIcd10CmReleaseManifest(value).releaseVersion;
}
