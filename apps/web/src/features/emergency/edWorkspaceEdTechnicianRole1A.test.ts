import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { canDocumentEdTriage } from "@medora/shared";
import { getVisibleEdWorkspaceTiles } from "./edWorkspaceTileVisibility";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("edWorkspaceEdTechnician (MEDUI.ED.ROLE.1A)", () => {
  const activeView = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
  const marController = readFileSync(
    join(
      webSrcRoot,
      "../../../apps/api/src/medication-administration/medication-administration.controller.ts"
    ),
    "utf8"
  );

  it("ED tech can document triage on EMERGENCY via shared helper", () => {
    expect(canDocumentEdTriage({ roleCodes: ["LAB"], encounterType: "EMERGENCY" })).toBe(true);
    expect(canDocumentEdTriage({ roleCodes: ["RADIOLOGY"], encounterType: "EMERGENCY" })).toBe(true);
  });

  it("ED tech cannot document triage outside ED", () => {
    expect(canDocumentEdTriage({ roleCodes: ["LAB"], encounterType: "INPATIENT" })).toBe(false);
  });

  it("active workspace uses canDocumentEdTriage for triage save path", () => {
    expect(activeView).toContain("canDocumentEdTriage");
    expect(activeView).toContain("canFetchEncounterTriage = useMemo");
  });

  it("ED tech sees triage tile in role matrix", () => {
    expect(getVisibleEdWorkspaceTiles({ roleCodes: ["LAB"] })).toContain("TRIAGE");
  });

  it("ED tech still does not see MAR, Medical Exam, Nursing Assessment, Diagnostics", () => {
    const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["LAB"] });
    expect(tiles).not.toContain("MEDICATIONS");
    expect(tiles).not.toContain("MEDICAL_EXAM");
    expect(tiles).not.toContain("NURSING_ASSESSMENT");
    expect(tiles).not.toContain("DIAGNOSTICS");
  });

  it("MAR remains blocked for technician at API layer", () => {
    expect(marController).toContain("RequireRoles(RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN)");
    expect(marController).not.toContain("RoleCode.LAB");
    expect(marController).not.toContain("RoleCode.RADIOLOGY");
  });

  it("Provider/RN/Admin triage gates unchanged in helper", () => {
    expect(canDocumentEdTriage({ roleCodes: ["PROVIDER"], encounterType: "INPATIENT" })).toBe(true);
    expect(canDocumentEdTriage({ roleCodes: ["RN"], encounterType: "INPATIENT" })).toBe(true);
    expect(canDocumentEdTriage({ roleCodes: ["ADMIN"], encounterType: "INPATIENT" })).toBe(true);
  });
});
