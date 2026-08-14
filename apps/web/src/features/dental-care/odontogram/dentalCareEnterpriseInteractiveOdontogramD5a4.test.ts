/**
 * MEDUI.D5A.4 — web guards for interactive odontogram (no DentalPatient fork, SVG mount).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  D5A4_CERTIFICATION_ID,
  D5A4_PERMANENT_TEETH,
  D5A4_PRIMARY_TEETH,
  listTeethForDentition,
} from "@medora/shared";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

describe("MEDUI.D5A.4 interactive odontogram web", () => {
  it("mounts SVG odontogram panel in dental workspace", () => {
    const ws = readFileSync(
      resolve(__dirname, "../EnterpriseDentalEncounterWorkspace.tsx"),
      "utf8"
    );
    const panel = readFileSync(resolve(__dirname, "./EnterpriseDentalOdontogramPanel.tsx"), "utf8");
    const tooth = readFileSync(resolve(__dirname, "./DentalToothSvg.tsx"), "utf8");
    expect(ws).toContain("EnterpriseDentalOdontogramPanel");
    expect(panel).toContain("DentalToothSvg");
    expect(tooth).toContain("<svg");
    expect(tooth).toContain("MESIAL");
    expect(panel).not.toContain("localStorage");
    expect(ws).not.toMatch(/\bclass\s+DentalPatient\b/);
    expect(D5A4_CERTIFICATION_ID).toBe("MEDUI.D5A.4");
  });

  it("renders expected dentition sizes", () => {
    expect(D5A4_PERMANENT_TEETH).toHaveLength(32);
    expect(D5A4_PRIMARY_TEETH).toHaveLength(20);
    expect(listTeethForDentition("PERMANENT", "MAXILLARY")).toHaveLength(16);
    expect(listTeethForDentition("PRIMARY", "MANDIBULAR")).toHaveLength(10);
  });

  it("exposes EN/FR odontogram keys", () => {
    expect((en as any).dentalCareD5a4.title).toBeTruthy();
    expect((fr as any).dentalCareD5a4.title).toBe("Odontogramme interactif");
    expect((fr as any).dentalCareD5a4.findings.CARIES).toBe("Carie");
    expect((en as any).dentalCareD5a4.surfaces.MESIAL).toBe("Mesial");
    expect((en as any).enterpriseClosedClinicalRecordD4c8b.sections.dentalFindings).toBeTruthy();
    expect((fr as any).enterpriseClosedClinicalRecordD4c8b.sections.dentalFindings).toBeTruthy();
  });

  it("closed clinical record includes dental findings section", () => {
    const closed = readFileSync(
      resolve(__dirname, "../../../components/encounters/EnterpriseClosedEncounterClinicalRecord.tsx"),
      "utf8"
    );
    expect(closed).toContain("closed-record-dental-findings");
    expect(closed).toContain("/dental-care/encounters/");
  });
});
