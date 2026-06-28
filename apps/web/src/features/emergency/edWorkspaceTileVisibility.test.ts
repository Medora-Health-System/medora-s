import { describe, expect, it } from "vitest";
import {
  applyEdWorkspaceEncounterTileFilter,
  edWorkspaceTileToSection,
  getDefaultEdWorkspaceTile,
  getVisibleEdWorkspaceTiles,
  resolveEdWorkspaceRoleGroup,
} from "./edWorkspaceTileVisibility";

/*
 * UX sketch (MEDUI.ED.ROLE.1):
 * Current:  T | ME | O | M | R | Dx | CD | NA | N | D | S
 * Admin:     T | ME | O | M | R | Dx | CD | NA | N | D | S
 * Provider:     ME | O | R | Dx | CD | N | D | S
 * RN:        T | O | M | R | NA | N | D | S
 * Tech:      T | O | R | N | D | S
 */

function tileLetters(ids: ReturnType<typeof getVisibleEdWorkspaceTiles>): string {
  const map: Record<string, string> = {
    TRIAGE: "T",
    MEDICAL_EXAM: "ME",
    ORDERS: "O",
    MEDICATIONS: "M",
    RESULTS: "R",
    DIAGNOSTICS: "Dx",
    CLINICAL_DATA: "CD",
    NURSING_ASSESSMENT: "NA",
    NOTES: "N",
    DISPOSITION: "D",
    SUMMARY: "S",
  };
  return ids.map((id) => map[id]).join("|");
}

describe("edWorkspaceTileVisibility (MEDUI.ED.ROLE.1)", () => {
  describe("Admin", () => {
    it("sees all tiles", () => {
      const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["ADMIN"] });
      expect(tiles).toHaveLength(11);
      expect(tileLetters(tiles)).toBe("T|ME|O|M|R|Dx|CD|NA|N|D|S");
    });

    it("admin role priority overrides provider and RN role codes", () => {
      expect(
        resolveEdWorkspaceRoleGroup({ roleCodes: ["ADMIN", "PROVIDER", "RN"] })
      ).toBe("ADMIN");
      expect(
        resolveEdWorkspaceRoleGroup({ roleCodes: ["MEDORA_SUPER_ADMIN", "RN"] })
      ).toBe("ADMIN");
    });
  });

  describe("Provider", () => {
    it("sees ME/O/R/Dx/CD/N/D/S", () => {
      const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["PROVIDER"] });
      expect(tileLetters(tiles)).toBe("ME|O|R|Dx|CD|N|D|S");
    });

    it("does not see T/M/NA", () => {
      const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["PROVIDER"] });
      expect(tiles).not.toContain("TRIAGE");
      expect(tiles).not.toContain("MEDICATIONS");
      expect(tiles).not.toContain("NURSING_ASSESSMENT");
    });

    it("resolves from PROVIDER roleCode", () => {
      expect(resolveEdWorkspaceRoleGroup({ roleCodes: ["PROVIDER"] })).toBe("PROVIDER");
    });

    it("resolves from canPrescribe when roleCode omitted", () => {
      expect(
        resolveEdWorkspaceRoleGroup({ roleCodes: [], canPrescribe: true })
      ).toBe("PROVIDER");
    });
  });

  describe("RN", () => {
    it("sees T/O/M/R/NA/N/D/S", () => {
      const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["RN"] });
      expect(tileLetters(tiles)).toBe("T|O|M|R|NA|N|D|S");
    });

    it("does not see ME/Dx", () => {
      const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["RN"] });
      expect(tiles).not.toContain("MEDICAL_EXAM");
      expect(tiles).not.toContain("DIAGNOSTICS");
    });

    it("confirms Disposition is visible", () => {
      expect(getVisibleEdWorkspaceTiles({ roleCodes: ["RN"] })).toContain("DISPOSITION");
    });

    it("resolves from RN roleCode", () => {
      expect(resolveEdWorkspaceRoleGroup({ roleCodes: ["RN"] })).toBe("RN");
    });

    it("resolves from canAdministerMedication", () => {
      expect(
        resolveEdWorkspaceRoleGroup({ roleCodes: [], canAdministerMedication: true })
      ).toBe("RN");
    });
  });

  describe("Technician", () => {
    it("sees T/O/R/N/D/S for LAB", () => {
      const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["LAB"] });
      expect(tileLetters(tiles)).toBe("T|O|R|N|D|S");
    });

    it("sees T/O/R/N/D/S for RADIOLOGY", () => {
      const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["RADIOLOGY"] });
      expect(tileLetters(tiles)).toBe("T|O|R|N|D|S");
    });

    it("does not see ME/M/NA/Dx", () => {
      for (const roleCodes of [["LAB"], ["RADIOLOGY"]] as const) {
        const tiles = getVisibleEdWorkspaceTiles({ roleCodes: [...roleCodes] });
        expect(tiles).not.toContain("MEDICAL_EXAM");
        expect(tiles).not.toContain("MEDICATIONS");
        expect(tiles).not.toContain("NURSING_ASSESSMENT");
        expect(tiles).not.toContain("DIAGNOSTICS");
      }
    });

    it("confirms Notes and Disposition are visible", () => {
      const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["LAB"] });
      expect(tiles).toContain("NOTES");
      expect(tiles).toContain("DISPOSITION");
    });

    it("resolves only from existing LAB/RADIOLOGY role codes", () => {
      expect(resolveEdWorkspaceRoleGroup({ roleCodes: ["LAB"] })).toBe("TECH");
      expect(resolveEdWorkspaceRoleGroup({ roleCodes: ["RADIOLOGY"] })).toBe("TECH");
      expect(resolveEdWorkspaceRoleGroup({ roleCodes: ["PHARMACY"] })).toBe("UNKNOWN");
    });
  });

  describe("Unknown", () => {
    it("sees O/R/S only", () => {
      const tiles = getVisibleEdWorkspaceTiles({ roleCodes: ["FRONT_DESK"] });
      expect(tileLetters(tiles)).toBe("O|R|S");
    });
  });

  describe("Fallback defaults", () => {
    it("Provider default = MEDICAL_EXAM", () => {
      expect(getDefaultEdWorkspaceTile({ roleCodes: ["PROVIDER"] })).toBe("MEDICAL_EXAM");
      expect(edWorkspaceTileToSection(getDefaultEdWorkspaceTile({ roleCodes: ["PROVIDER"] }))).toBe(
        "providerMse"
      );
    });

    it("RN default = TRIAGE", () => {
      expect(getDefaultEdWorkspaceTile({ roleCodes: ["RN"] })).toBe("TRIAGE");
    });

    it("Technician default = TRIAGE", () => {
      expect(getDefaultEdWorkspaceTile({ roleCodes: ["LAB"] })).toBe("TRIAGE");
    });

    it("Unknown default = SUMMARY", () => {
      expect(getDefaultEdWorkspaceTile({ roleCodes: ["BILLING"] })).toBe("SUMMARY");
    });

    it("Admin default = TRIAGE", () => {
      expect(getDefaultEdWorkspaceTile({ roleCodes: ["ADMIN"] })).toBe("TRIAGE");
    });
  });

  describe("ED technician encounter filter (MEDUI.ED.ROLE.1A)", () => {
    it("TECH keeps triage tile on EMERGENCY encounter", () => {
      const tiles = applyEdWorkspaceEncounterTileFilter(
        getVisibleEdWorkspaceTiles({ roleCodes: ["LAB"] }),
        { roleCodes: ["LAB"], encounterType: "EMERGENCY" }
      );
      expect(tiles).toContain("TRIAGE");
    });

    it("TECH hides triage tile on INPATIENT encounter", () => {
      const tiles = applyEdWorkspaceEncounterTileFilter(
        getVisibleEdWorkspaceTiles({ roleCodes: ["LAB"] }),
        { roleCodes: ["LAB"], encounterType: "INPATIENT" }
      );
      expect(tiles).not.toContain("TRIAGE");
    });
  });
});
