import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatIcd10ServerResolvedOneLineDisplay } from "@medora/shared";
import { isDuplicateDischargeDiagnosis } from "./icd10DiagnosisSearchHelpers";

const webRoot = join(__dirname, "../..");

function readSrc(rel: string): string {
  return readFileSync(join(webRoot, rel), "utf8");
}

describe("P3-F.8-ES provider Spanish diagnosis workflow surfaces", () => {
  it("ED, Clinic, Inpatient, and Dental use the shared ICD-10 diagnosis path", () => {
    const panel = readSrc("components/encounters/EncounterDiagnosticsPanel.tsx");
    const autocomplete = readSrc("components/diagnosis/Icd10DiagnosisSearchAutocomplete.tsx");
    expect(panel).toContain("Icd10DiagnosisEntryPanel");
    expect(panel).toContain("createDiagnosis");
    expect(panel).toContain("description: pendingAdd.hit.shortDescription");
    expect(panel).not.toContain("description: pendingAdd.hit.displayLabel");
    expect(panel).toContain("useI18n");
    expect(panel).not.toMatch(/preferredLanguage/);
    expect(autocomplete).toContain("dateOfService");
    expect(autocomplete).toContain("searchIcd10Catalog");
    expect(readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx")).toContain("EncounterDiagnosticsPanel");
    expect(readSrc("features/clinic-care/ClinicCareAmbulatoryWorkspacePanels.tsx")).toContain("EncounterDiagnosticsPanel");
    expect(readSrc("features/inpatient-workspace/InpatientProviderWorkspacePanel.tsx")).toContain(
      "EncounterDiagnosticsPanel",
    );
    expect(readSrc("features/dental-care/EnterpriseDentalEncounterWorkspace.tsx")).toContain("EncounterDiagnosticsPanel");
    const observation = readSrc("features/observation-workspace/ObservationWorkspacePanel.tsx");
    expect(observation).not.toContain("Icd10DiagnosisSearchAutocomplete");
    const encounterPage = readFileSync(join(__dirname, "../../../app/app/encounters/[id]/page.tsx"), "utf8");
    expect(encounterPage).toContain("EncounterDiagnosticsPanel");
  });

  it("locale switch keeps one canonical code and Spanish-only display when locale is ES", () => {
    const es = formatIcd10ServerResolvedOneLineDisplay({
      code: "J4B",
      displayLabel: "Micetoma pulmonar",
      displayResolution: "EXACT_GOVERNED_LABEL",
    });
    const en = formatIcd10ServerResolvedOneLineDisplay({
      code: "J4B",
      displayLabel: "Pulmonary mycetoma",
      displayResolution: "EXACT_SOURCE_LABEL",
    });
    expect(es.primary).toBe("Micetoma pulmonar");
    expect(es.primary).not.toMatch(/pulmonary/i);
    expect(en.primary).toBe("Pulmonary mycetoma");
    expect(es.metadata).toBe("J4B");
    expect(en.metadata).toBe("J4B");
    expect(
      isDuplicateDischargeDiagnosis(
        { code: "J4B", description: "Micetoma pulmonar" },
        [{ code: "J4B", description: "Pulmonary mycetoma" }],
      ),
    ).toBe(true);
  });
});
