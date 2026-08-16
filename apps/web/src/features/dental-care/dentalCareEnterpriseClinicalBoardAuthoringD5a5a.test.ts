import { describe, expect, it } from "vitest";
import {
  D5A5A_CERTIFICATION_ID,
  D5A5_DENTAL_HISTORY_REVIEW_KEY,
  D5A5_OVERVIEW_SECTIONS,
  canAuthorDentalClinicalBoard,
  isDentalClinicalBoardEditable,
  normalizeBulkToothCodes,
  resolveDentalWorkspaceAccess,
} from "@medora/shared";

describe("MEDUI.D5A.5A web dental clinical board authoring", () => {
  it("certification and overview domains", () => {
    expect(D5A5A_CERTIFICATION_ID).toBe("MEDUI.D5A.5A");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("alertsHistory");
    expect(D5A5_OVERVIEW_SECTIONS).toContain("documents");
    expect(D5A5_DENTAL_HISTORY_REVIEW_KEY).toBe("dentalHistoryReviewV1");
  });

  it("FACILITY_ADMIN and ADMIN+PROVIDER can author; platform-only cannot", () => {
    const both = resolveDentalWorkspaceAccess({
      roleCodes: ["ADMIN", "PROVIDER"],
      dentalCareEnabled: true,
    });
    expect(canAuthorDentalClinicalBoard(both)).toBe(true);
    expect(isDentalClinicalBoardEditable({ access: both, encounterStatus: "OPEN" })).toBe(true);

    const admin = resolveDentalWorkspaceAccess({
      roleCodes: ["ADMIN"],
      dentalCareEnabled: true,
    });
    expect(canAuthorDentalClinicalBoard(admin)).toBe(true);

    const platform = resolveDentalWorkspaceAccess({
      roleCodes: ["MEDORA_SUPER_ADMIN"],
      dentalCareEnabled: true,
    });
    expect(canAuthorDentalClinicalBoard(platform)).toBe(false);
  });

  it("multi-tooth odontogram bulk preserves per-tooth codes", () => {
    expect(normalizeBulkToothCodes(["PERM_12", "PERM_13", "PERM_14"])).toEqual([
      "PERM_12",
      "PERM_13",
      "PERM_14",
    ]);
  });
});
