import {
  D5A5A_CERTIFICATION_ID,
  D5A5_DENTAL_HISTORY_REVIEW_KEY,
  D5A5_OVERVIEW_SECTIONS,
  canAuthorDentalClinicalBoard,
  isDentalClinicalBoardEditable,
  resolveDentalWorkspaceAccess,
} from "@medora/shared";

describe("MEDUI.D5A.5A API clinical board authoring", () => {
  it("exports D5A.5A certification and history review key", () => {
    expect(D5A5A_CERTIFICATION_ID).toBe("MEDUI.D5A.5A");
    expect(D5A5_DENTAL_HISTORY_REVIEW_KEY).toBe("dentalHistoryReviewV1");
  });

  it("authorized dentist + OPEN => clinical board writable", () => {
    const access = resolveDentalWorkspaceAccess({
      roleCodes: ["PROVIDER"],
      dentalCareEnabled: true,
    });
    expect(canAuthorDentalClinicalBoard(access)).toBe(true);
    expect(isDentalClinicalBoardEditable({ access, encounterStatus: "OPEN" })).toBe(true);
  });

  it("wrong capability / closed => denied", () => {
    const billing = resolveDentalWorkspaceAccess({
      roleCodes: ["BILLING"],
      dentalCareEnabled: true,
    });
    expect(canAuthorDentalClinicalBoard(billing)).toBe(false);
    const provider = resolveDentalWorkspaceAccess({
      roleCodes: ["PROVIDER"],
      dentalCareEnabled: true,
    });
    expect(isDentalClinicalBoardEditable({ access: provider, encounterStatus: "CLOSED" })).toBe(false);
  });

  it("overview sections include history + documents (consent projection)", () => {
    expect(D5A5_OVERVIEW_SECTIONS).toEqual(
      expect.arrayContaining(["alertsHistory", "documents", "treatmentAcceptance", "procedures"])
    );
  });
});
