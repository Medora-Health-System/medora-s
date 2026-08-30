import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../..");

function readWeb(rel: string) {
  return readFileSync(join(root, "src", rel), "utf8");
}

describe("ED.HOSP.1C presentation / contract", () => {
  it("40-47. hospital and ED surfaces use human-readable Observation vs Admission labels", () => {
    const en = readFileSync(join(root, "src/i18n/messages/en.ts"), "utf8");
    const fr = readFileSync(join(root, "src/i18n/messages/fr.ts"), "utf8");
    expect(en).toContain('outcomeOBSERVATION: "Observation"');
    expect(en).toContain('outcomeADMISSION: "Admission"');
    expect(en).toContain('inpatientAdmission: "Inpatient Admission"');
    expect(fr).toContain('outcomeOBSERVATION: "Observation"');
    expect(fr).toContain("Admission hospitalière");
    expect(en).toContain("inpatientUnavailableByFacility");
    expect(fr).toContain("inpatientUnavailableByFacility");
  });

  it("48-49. Admission Command Center does not dump raw requestedEncounterType", () => {
    const admissions = readWeb("features/hospital-care/HospitalCareAdmissionsView.tsx");
    expect(admissions).not.toContain("{row.requestedEncounterType}");
    expect(admissions).toContain("hospitalCareD3ca.destination.observation");
    expect(admissions).toContain("hospitalCareD3ca.destination.inpatientAdmission");
  });

  it("facility UI projects FSER inpatient unavailability", () => {
    const panel = readWeb("features/emergency/EmergencyDispositionPanel.tsx");
    expect(panel).toContain("localInpatientPlacementBlockedByFacilityType");
    expect(panel).toContain("ed-disposition-inpatient-unavailable");
    expect(panel).toContain("inpatientUnavailableByFacility");
  });

  it("15. no EncounterType.OBSERVATION enum and no new JSON SOT", () => {
    const dest = readFileSync(
      join(root, "../../packages/shared/src/encounters/hospitalDestinationIntent.ts"),
      "utf8"
    );
    expect(dest).toContain("InternalPlacementRequestedEncounterType");
    expect(dest).not.toContain("edHosp1cJson");
    const schema = readFileSync(join(root, "../../apps/api/prisma/schema.prisma"), "utf8");
    const enumBlock = schema.slice(schema.indexOf("enum EncounterType {"), schema.indexOf("enum EncounterVisitOrigin"));
    expect(enumBlock).toContain("INPATIENT");
    expect(enumBlock).toContain("EMERGENCY");
    expect(enumBlock).not.toMatch(/^\s*OBSERVATION\s*$/m);
  });

  it("50. 1C files do not import inpatient discharge boards", () => {
    const files = [
      "features/emergency/edHosp1bDispositionOutcomeMapping.ts",
      "features/emergency/EmergencyDispositionPanel.tsx",
      "features/hospital-care/HospitalCareAdmissionsView.tsx",
      "features/hospital-care/HospitalCarePatientCard.tsx",
    ];
    for (const rel of files) {
      const src = readWeb(rel);
      expect(src).not.toContain("InpatientDischargeBoard");
      expect(src).not.toContain("inpatientProviderDischarge");
      expect(src).not.toContain("inpatientNursingDischarge");
      expect(src).not.toContain("inpatientMedRecon");
    }
  });
});
