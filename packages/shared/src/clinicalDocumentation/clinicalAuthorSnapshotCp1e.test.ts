import { describe, expect, it } from "vitest";
import {
  buildClinicalAuthorSnapshotPersist,
  projectClinicalAuthorFromSnapshots,
  resolveClinicianProfessionalTitle,
} from "./clinicalAuthorSnapshotCp1e.js";

describe("clinicalAuthorSnapshotCp1e (MEDUI.CP.1E)", () => {
  it("builds persistable display name + profession title from identity", () => {
    const snap = buildClinicalAuthorSnapshotPersist({
      userId: "u1",
      firstName: "Marie",
      lastName: "Claire",
      professionCodes: ["REGISTERED_NURSE"],
      roleCode: "RN",
    });
    expect(snap.displayNameSnapshot).toBe("Marie Claire");
    expect(snap.professionalTitleSnapshot).toBe("RN");
  });

  it("prefers profession title over RoleCode for providers", () => {
    expect(
      resolveClinicianProfessionalTitle({
        professionCodes: ["PHYSICIAN_MD"],
        roleCode: "PROVIDER",
      })
    ).toBe("MD");
    expect(
      resolveClinicianProfessionalTitle({
        professionCodes: ["PHYSICAL_THERAPIST"],
        roleCode: "PATIENT_CARE_TECH",
      })
    ).toBe("PT");
  });

  it("projects unavailable when display snapshot is missing", () => {
    const projected = projectClinicalAuthorFromSnapshots({
      displayNameSnapshot: null,
      professionalTitleSnapshot: null,
      roleSnapshot: "RN",
    });
    expect(projected.attributionUnavailable).toBe(true);
    expect(projected.displayName).toBeNull();
  });

  it("projects frozen snapshot without live User dependency", () => {
    const projected = projectClinicalAuthorFromSnapshots({
      displayNameSnapshot: "Marie Claire",
      professionalTitleSnapshot: "RN",
    });
    expect(projected.attributionUnavailable).toBe(false);
    expect(projected.displayName).toBe("Marie Claire");
    expect(projected.credentials).toBe("RN");
  });
});
