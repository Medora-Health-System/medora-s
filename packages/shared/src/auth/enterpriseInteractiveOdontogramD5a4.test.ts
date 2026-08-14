import { describe, expect, it } from "vitest";
import {
  D5A4_CERTIFICATION_ID,
  D5A4_FINDING_CATALOG,
  D5A4_PERMANENT_TEETH,
  D5A4_PRIMARY_TEETH,
  assertNoDentalEncounterForkInSource,
  assertNoDentalPatientForkInSource,
  formatToothDisplayLabel,
  getCanonicalTooth,
  listTeethForDentition,
  normalizeSurfaceCodes,
  projectCurrentToothFindings,
  projectEncounterDentalFindingsSummary,
} from "./enterpriseInteractiveOdontogramD5a4.js";

describe("MEDUI.D5A.4 interactive odontogram domain", () => {
  it("exposes certification and catalogs", () => {
    expect(D5A4_CERTIFICATION_ID).toBe("MEDUI.D5A.4");
    expect(D5A4_PERMANENT_TEETH).toHaveLength(32);
    expect(D5A4_PRIMARY_TEETH).toHaveLength(20);
    expect(D5A4_FINDING_CATALOG).toContain("CARIES");
  });

  it("keeps canonical identity stable across numbering systems", () => {
    const t = getCanonicalTooth("PERM_14")!;
    expect(t.code).toBe("PERM_14");
    expect(formatToothDisplayLabel(t, "FDI")).toBe("14");
    expect(formatToothDisplayLabel(t, "UNIVERSAL")).toBe("5");
    expect(formatToothDisplayLabel(t, "PALMER")).toBe("UR4");
  });

  it("lists permanent and primary arches", () => {
    expect(listTeethForDentition("PERMANENT", "MAXILLARY")).toHaveLength(16);
    expect(listTeethForDentition("PRIMARY", "MANDIBULAR")).toHaveLength(10);
    expect(listTeethForDentition("MIXED", "MAXILLARY").length).toBeGreaterThan(16);
  });

  it("projects current state without losing history events", () => {
    const events = [
      {
        id: "a",
        toothCode: "PERM_14",
        scope: "SURFACE_SPECIFIC",
        surfaces: ["OCCLUSAL"],
        findingType: "CARIES",
        clinicalState: "OBSERVED",
        documentedAt: "2026-08-14T10:00:00.000Z",
        encounterId: "e1",
      },
      {
        id: "b",
        toothCode: "PERM_14",
        scope: "SURFACE_SPECIFIC",
        surfaces: ["OCCLUSAL"],
        findingType: "CARIES",
        clinicalState: "AMENDED",
        documentedAt: "2026-08-20T10:00:00.000Z",
        encounterId: "e2",
        supersedesFindingId: "a",
      },
      {
        id: "c",
        toothCode: "PERM_14",
        scope: "SURFACE_SPECIFIC",
        surfaces: ["MESIAL", "OCCLUSAL", "DISTAL"],
        findingType: "EXISTING_RESTORATION",
        clinicalState: "COMPLETED",
        documentedAt: "2026-08-27T10:00:00.000Z",
        encounterId: "e2",
      },
    ];
    const current = projectCurrentToothFindings(events);
    expect(current.map((x) => x.id).sort()).toEqual(["c"]);
    expect(events).toHaveLength(3);
    expect(projectEncounterDentalFindingsSummary(events, "e2")[0]?.findingType).toBe(
      "EXISTING_RESTORATION"
    );
  });

  it("normalizes multi-surface selection", () => {
    expect(normalizeSurfaceCodes(["mesial", "OCCLUSAL", "MESIAL", "DISTAL"])).toEqual([
      "MESIAL",
      "OCCLUSAL",
      "DISTAL",
    ]);
  });

  it("forbids DentalPatient / DentalEncounter type forks in source samples", () => {
    expect(assertNoDentalPatientForkInSource("export function x() {}")).toBe(true);
    expect(assertNoDentalPatientForkInSource("class DentalPatient {}")).toBe(false);
    expect(assertNoDentalEncounterForkInSource("type DentalEncounter = {}")).toBe(false);
  });
});
