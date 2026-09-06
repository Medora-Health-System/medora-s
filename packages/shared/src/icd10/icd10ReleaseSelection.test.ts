import { describe, expect, it } from "vitest";
import {
  icd10CmDateOfServiceKey,
  ICD10_CM_OFFICIAL_RELEASE_WINDOWS,
  selectIcd10CmReleaseVersionForDateOfService,
  selectOfficialIcd10CmReleaseVersionForDateOfService,
  uniqueOfficialIcd10CmReleaseWindows,
} from "./icd10ReleaseSelection.js";

const WINDOWS = [
  { releaseVersion: "FY2026", effectiveFrom: "2025-10-01", effectiveTo: "2026-09-30" },
  { releaseVersion: "FY2027", effectiveFrom: "2026-10-01", effectiveTo: null },
  { releaseVersion: "FY2026-MEDORA-DEV-SAMPLE", effectiveFrom: "2025-10-01", effectiveTo: null },
];

describe("ICD-10-CM date-of-service release selection", () => {
  it("selects FY2026 through 2026-09-30 and FY2027 from 2026-10-01", () => {
    expect(selectIcd10CmReleaseVersionForDateOfService("2026-09-06", WINDOWS)).toBe("FY2026");
    expect(selectIcd10CmReleaseVersionForDateOfService("2026-09-30", WINDOWS)).toBe("FY2026");
    expect(selectIcd10CmReleaseVersionForDateOfService("2026-10-01", WINDOWS)).toBe("FY2027");
    expect(selectIcd10CmReleaseVersionForDateOfService("2027-03-01T15:00:00.000Z", WINDOWS)).toBe("FY2027");
  });

  it("does not prefer latest-loaded or FY2026 when the date is FY2027", () => {
    const loadedLatestFirst = [
      { releaseVersion: "FY2027", effectiveFrom: "2026-10-01", effectiveTo: null },
      { releaseVersion: "FY2026", effectiveFrom: "2025-10-01", effectiveTo: "2026-09-30" },
    ];
    expect(selectIcd10CmReleaseVersionForDateOfService("2026-09-15", loadedLatestFirst)).toBe("FY2026");
    expect(selectIcd10CmReleaseVersionForDateOfService("2026-10-15", loadedLatestFirst)).toBe("FY2027");
  });

  it("ships non-overlapping official FY2026/FY2027 windows", () => {
    expect(ICD10_CM_OFFICIAL_RELEASE_WINDOWS.map((row) => row.releaseVersion)).toEqual(["FY2026", "FY2027"]);
    expect(selectOfficialIcd10CmReleaseVersionForDateOfService("2026-09-06")).toBe("FY2026");
    expect(selectOfficialIcd10CmReleaseVersionForDateOfService("2026-10-01")).toBe("FY2027");
  });

  it("ignores DEV-SAMPLE and rejects overlapping official windows", () => {
    expect(uniqueOfficialIcd10CmReleaseWindows(WINDOWS).map((row) => row.releaseVersion)).toEqual([
      "FY2026",
      "FY2027",
    ]);
    expect(() =>
      selectIcd10CmReleaseVersionForDateOfService("2026-10-01", [
        { releaseVersion: "FY2026", effectiveFrom: "2025-10-01", effectiveTo: null },
        { releaseVersion: "FY2027", effectiveFrom: "2026-10-01", effectiveTo: null },
      ]),
    ).toThrow(/OVERLAPPING_ICD10_RELEASE_WINDOWS/);
  });

  it("rejects unknown dates and dates with no window", () => {
    expect(() => icd10CmDateOfServiceKey("not-a-date")).toThrow(/INVALID_DATE_OF_SERVICE/);
    expect(() => selectIcd10CmReleaseVersionForDateOfService("2024-01-01", WINDOWS)).toThrow(
      /NO_ICD10_RELEASE_FOR_DATE_OF_SERVICE/,
    );
  });
});
