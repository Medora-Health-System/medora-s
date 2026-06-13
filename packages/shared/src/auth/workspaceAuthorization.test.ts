import { describe, expect, it } from "vitest";
import { resolveDepartmentCode } from "./departmentResolver.js";
import { resolveWorkspacePermissions } from "./workspaceAuthorization.js";

function tileLetters(tiles: string[]): string {
  const map: Record<string, string> = {
    TRIAGE: "T",
    MEDICAL_EXAM: "ME",
    ORDERS: "O",
    MEDICATIONS: "M",
    RESULTS: "R",
    DIAGNOSTICS: "Dx",
    NURSING_ASSESSMENT: "NA",
    NOTES: "N",
    DISPOSITION: "D",
    SUMMARY: "S",
    LAB_QUEUE: "LQ",
    RADIOLOGY_QUEUE: "RQ",
    VITALS: "V",
  };
  return tiles.map((id) => map[id] ?? id).join("|");
}

describe("workspaceAuthorization (MEDUI.AUTH.ROLE.1)", () => {
  it("Admin sees all ED tiles regardless of department", () => {
    const perms = resolveWorkspacePermissions({
      profession: "ADMIN",
      department: "ICU",
    });
    expect(tileLetters(perms.visibleTiles)).toBe("T|ME|O|M|R|Dx|NA|N|D|S");
    expect(perms.canPerformMedicalExam).toBe(true);
    expect(perms.canAdministerMedication).toBe(true);
  });

  it("Provider + Emergency", () => {
    const perms = resolveWorkspacePermissions({
      profession: "PROVIDER",
      department: "EMERGENCY",
    });
    expect(tileLetters(perms.visibleTiles)).toBe("ME|O|R|Dx|N|D|S");
    expect(perms.canPerformMedicalExam).toBe(true);
    expect(perms.canDocumentTriage).toBe(false);
    expect(perms.canAdministerMedication).toBe(false);
  });

  it("RN + Emergency", () => {
    const perms = resolveWorkspacePermissions({
      profession: "RN",
      department: "EMERGENCY",
    });
    expect(tileLetters(perms.visibleTiles)).toBe("T|O|M|R|NA|N|D|S");
    expect(perms.canDocumentTriage).toBe(true);
    expect(perms.canAdministerMedication).toBe(true);
    expect(perms.canPerformMedicalExam).toBe(false);
  });

  it("Technician + Emergency", () => {
    const perms = resolveWorkspacePermissions({
      profession: "TECHNICIAN",
      department: "EMERGENCY",
    });
    expect(tileLetters(perms.visibleTiles)).toBe("T|O|R|N|D|S");
    expect(perms.canDocumentTriage).toBe(true);
    expect(perms.canDocumentVitals).toBe(true);
    expect(perms.canAdministerMedication).toBe(false);
    expect(perms.canPerformMedicalExam).toBe(false);
  });

  it("Technician + ICU", () => {
    const perms = resolveWorkspacePermissions({
      profession: "TECHNICIAN",
      department: "ICU",
    });
    expect(tileLetters(perms.visibleTiles)).toBe("V|N|S");
    expect(perms.canDocumentVitals).toBe(true);
    expect(perms.canDocumentTriage).toBe(false);
    expect(perms.canDischargePatient).toBe(false);
  });

  it("Technician + Med-Surg floor departments share vitals/notes/summary", () => {
    for (const department of ["MEDSURG", "OBGYN", "PEDIATRICS", "OBSERVATION", "TELEMETRY"] as const) {
      const perms = resolveWorkspacePermissions({
        profession: "TECHNICIAN",
        department,
      });
      expect(tileLetters(perms.visibleTiles)).toBe("V|N|S");
      expect(perms.canDocumentVitals).toBe(true);
      expect(perms.canAdministerMedication).toBe(false);
    }
  });

  it("Technician + Laboratory", () => {
    const perms = resolveWorkspacePermissions({
      profession: "TECHNICIAN",
      department: "LABORATORY",
    });
    expect(tileLetters(perms.visibleTiles)).toBe("LQ|O|R|N|S");
    expect(perms.canDocumentNotes).toBe(true);
    expect(perms.canDocumentTriage).toBe(false);
  });

  it("Technician + Radiology", () => {
    const perms = resolveWorkspacePermissions({
      profession: "TECHNICIAN",
      department: "RADIOLOGY",
    });
    expect(tileLetters(perms.visibleTiles)).toBe("RQ|O|R|N|S");
    expect(perms.canDocumentNotes).toBe(true);
  });

  it("Unknown profession gets safe minimal tiles", () => {
    const perms = resolveWorkspacePermissions({
      profession: "UNKNOWN",
      department: null,
    });
    expect(tileLetters(perms.visibleTiles)).toBe("O|R|S");
    expect(perms.canDocumentTriage).toBe(false);
    expect(perms.canPerformMedicalExam).toBe(false);
  });

  it("Provider + null department falls back to emergency clinical matrix", () => {
    const perms = resolveWorkspacePermissions({
      profession: "PROVIDER",
      department: null,
    });
    expect(tileLetters(perms.visibleTiles)).toBe("ME|O|R|Dx|N|D|S");
  });

  it("Technician + null department with LAB role infers laboratory in GENERAL context", () => {
    const profession = "TECHNICIAN" as const;
    const department = resolveDepartmentCode({
      roleCodes: ["LAB"],
      clinicalWorkspace: "GENERAL",
    });
    const perms = resolveWorkspacePermissions({ profession, department, facilityId: null });
    expect(tileLetters(perms.visibleTiles)).toBe("LQ|O|R|N|S");
  });

  it("Technician + emergency department maps to ED technician permissions", () => {
    const perms = resolveWorkspacePermissions({
      profession: "TECHNICIAN",
      department: "EMERGENCY",
    });
    expect(perms.canDocumentTriage).toBe(true);
    expect(perms.canAdministerMedication).toBe(false);
  });
});
