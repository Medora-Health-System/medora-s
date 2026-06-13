import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getLandingRouteForNavigationProfile,
  getVisibleNavigationAreas,
  resolveWorkspacePermissions,
} from "@medora/shared";
import { getVisibleEdWorkspaceTiles } from "@/features/emergency/edWorkspaceTileVisibility";
import {
  getVisibleHospitalTechnicianTiles,
  isHospitalFloorTechnicianProfile,
} from "./hospitalTechnicianTiles";
import { hospitalFloorDepartmentCodesForTests } from "./hospitalTechnicianTiles";
import { hospitalTechnicianActiveWorkspacePath } from "./hospitalTechnicianWorkspace";
import { isAppPathAllowedForRoles } from "@/lib/landingRoute";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("hospitalTechnicianWorkspaceK10B14 (MEDUI.HOSP.TECH.1)", () => {
  const activeEdView = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
  const hospitalActiveView = readSrc("features/hospitalization/HospitalTechnicianActiveWorkspaceView.tsx");
  const marController = readFileSync(
    join(webSrcRoot, "../../../apps/api/src/medication-administration/medication-administration.controller.ts"),
    "utf8"
  );

  it.each(hospitalFloorDepartmentCodesForTests())(
    "%s technician sees Vitals, Notes, Summary",
    (departmentCode) => {
      const input = { roleCodes: ["LAB"], departmentCode };
      expect(getVisibleHospitalTechnicianTiles(input)).toEqual(["VITALS", "NOTES", "SUMMARY"]);
      const perms = resolveWorkspacePermissions({ profession: "TECHNICIAN", department: departmentCode as never });
      expect(perms.canDocumentVitals).toBe(true);
      expect(perms.canPerformMedicalExam).toBe(false);
      expect(perms.canAdministerMedication).toBe(false);
      expect(perms.canAccessDiagnostics).toBe(false);
    }
  );

  it("floor departments hide MAR, Medical Exam, Diagnostics in hospital tile registry", () => {
    const tiles = getVisibleHospitalTechnicianTiles({ roleCodes: ["LAB"], departmentCode: "ICU" });
    expect(tiles).not.toContain("MEDICATIONS");
    expect(tiles).not.toContain("MEDICAL_EXAM");
    expect(tiles).not.toContain("DIAGNOSTICS");
  });

  it("ED technician workspace unchanged (MEDUI.ED.ROLE.1A)", () => {
    expect(getVisibleEdWorkspaceTiles({ roleCodes: ["LAB"] })).toContain("TRIAGE");
    expect(getVisibleEdWorkspaceTiles({ roleCodes: ["LAB"] })).not.toContain("MEDICATIONS");
    expect(activeEdView).toContain("EmergencyActiveWorkspaceView");
    expect(activeEdView).toContain("canDocumentEdTriage");
    expect(hospitalActiveView).not.toContain("MedicationAdministrationTab");
  });

  it("lab technician routed to lab workspace", () => {
    const profile = { roleCodes: ["LAB"], prismaDepartmentCode: "LAB" };
    expect(getLandingRouteForNavigationProfile(profile)).toBe("/app/lab-worklist");
    expect(getVisibleNavigationAreas(profile)).toContain("LABORATORY");
    expect(isHospitalFloorTechnicianProfile(profile)).toBe(false);
  });

  it("radiology technician routed to radiology workspace", () => {
    const profile = { roleCodes: ["RADIOLOGY"], prismaDepartmentCode: "RAD" };
    expect(getLandingRouteForNavigationProfile(profile)).toBe("/app/rad-worklist");
    expect(getVisibleNavigationAreas(profile)).toContain("RADIOLOGY");
    expect(isHospitalFloorTechnicianProfile(profile)).toBe(false);
  });

  it("ICU technician lands on hospital board and can open active workspace route", () => {
    const profile = { roleCodes: ["LAB"], departmentCode: "ICU" };
    expect(getLandingRouteForNavigationProfile(profile)).toBe("/app/hospitalisation");
    expect(
      isAppPathAllowedForRoles("/app/hospitalisation/active/enc-1", ["LAB"], {
        navigationProfile: profile,
      })
    ).toBe(true);
    expect(hospitalTechnicianActiveWorkspacePath("enc-1")).toBe("/app/hospitalisation/active/enc-1");
  });

  it("MAR API remains RN/Provider/Admin only", () => {
    expect(marController).toContain("RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)");
    expect(marController).not.toContain("RoleCode.LAB");
  });

  it("hospital board links floor technicians to active workspace", () => {
    const board = readSrc("features/hospitalization/HospitalizationBoardView.tsx");
    expect(board).toContain("hospitalTechnicianActiveWorkspacePath");
    expect(board).toContain("isHospitalFloorTechnicianProfile");
  });
});
