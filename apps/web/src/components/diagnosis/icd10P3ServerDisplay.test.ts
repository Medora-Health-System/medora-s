import { describe, expect, it } from "vitest";
import { formatIcd10ServerResolvedOneLineDisplay } from "@medora/shared";
import { isDuplicateDischargeDiagnosis } from "./icd10DiagnosisSearchHelpers";

describe("MEDUI.TRILANG.DX.P3 search/list UI presentation", () => {
  it("EN exact source shows English label with code metadata", () => {
    const line = formatIcd10ServerResolvedOneLineDisplay({
      code: "R10.85",
      displayLabel: "Abdominal pain, unspecified site",
      displayResolution: "EXACT_SOURCE_LABEL",
    });
    expect(line.primary).toBe("Abdominal pain, unspecified site");
    expect(line.metadata).toBe("R10.85");
  });

  it("ES exact governed R10.85 shows Spanish label, not English", () => {
    const line = formatIcd10ServerResolvedOneLineDisplay({
      code: "R10.85",
      displayLabel: "Dolor abdominal en varios sitios",
      displayResolution: "EXACT_GOVERNED_LABEL",
    });
    expect(line.primary).toBe("Dolor abdominal en varios sitios");
    expect(line.primary).not.toMatch(/abdominal pain/i);
    expect(line.metadata).toBe("R10.85");
  });

  it("FR exact governed R10.85 shows French label, not English", () => {
    const line = formatIcd10ServerResolvedOneLineDisplay({
      code: "R10.85",
      displayLabel: "Douleur abdominale à plusieurs sites",
      displayResolution: "EXACT_GOVERNED_LABEL",
    });
    expect(line.primary).toBe("Douleur abdominale à plusieurs sites");
    expect(line.primary).not.toMatch(/abdominal pain/i);
  });

  it.each(["A42.1", "I77.811", "R14.0", "G43.D0", "G43.D1"] as const)(
    "UNLOCALIZED_CODE %s is code-only with no CODE — CODE",
    (code) => {
      const line = formatIcd10ServerResolvedOneLineDisplay({
        code,
        displayLabel: code,
        displayResolution: "UNLOCALIZED_CODE",
      });
      expect(line.primary).toBe(code);
      expect(line.metadata).toBeNull();
      expect(`${line.primary}${line.metadata ?? ""}`).not.toContain("—");
      expect(`${line.primary}${line.metadata ?? ""}`).not.toContain("·");
    },
  );

  it("does not leak English source into FR/ES unlocalized rows even if shortDescription is present in the DTO", () => {
    const adversarial = {
      code: "A42.1",
      shortDescription: "Abdominal actinomycosis",
      longDescription: "Abdominal actinomycosis",
      displayLabel: "A42.1",
      displayResolution: "UNLOCALIZED_CODE" as const,
    };
    const es = formatIcd10ServerResolvedOneLineDisplay(adversarial);
    expect(es.primary).toBe("A42.1");
    expect(es.metadata).toBeNull();
    expect(es.primary).not.toBe(adversarial.shortDescription);
    const fr = formatIcd10ServerResolvedOneLineDisplay({
      ...adversarial,
      displayLabel: "A42.1",
    });
    expect(fr.primary).toBe("A42.1");
    expect(fr.primary).not.toContain("Abdominal actinomycosis");
  });

  it("locale switch does not create a duplicate when canonical code is unchanged", () => {
    const selected = [{ code: "R10.85", description: "Abdominal pain, unspecified site" }];
    expect(
      isDuplicateDischargeDiagnosis(
        { code: "R10.85", description: "Dolor abdominal en varios sitios" },
        selected
      )
    ).toBe(true);
  });

  it("cut-over surfaces never concatenate CODE — CODE or CODE · CODE", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const webRoot = join(__dirname, "../..");
    const autocomplete = readFileSync(join(webRoot, "components/diagnosis/Icd10DiagnosisSearchAutocomplete.tsx"), "utf8");
    const panel = readFileSync(join(webRoot, "components/encounters/EncounterDiagnosticsPanel.tsx"), "utf8");
    const entry = readFileSync(join(webRoot, "components/diagnosis/Icd10DiagnosisEntryPanel.tsx"), "utf8");
    const clinic = readFileSync(join(webRoot, "features/clinic-care/ClinicCareAmbulatoryWorkspacePanels.tsx"), "utf8");
    const inpatient = readFileSync(join(webRoot, "features/inpatient-workspace/InpatientProviderWorkspacePanel.tsx"), "utf8");
    const dental = readFileSync(join(webRoot, "features/dental-care/EnterpriseDentalEncounterWorkspace.tsx"), "utf8");
    const ed = readFileSync(join(webRoot, "features/emergency/EmergencyActiveWorkspaceView.tsx"), "utf8");
    expect(autocomplete).toContain("formatIcd10ServerResolvedOneLineDisplay");
    expect(autocomplete).not.toContain("getLocalizedDiagnosisDisplayLabel");
    expect(autocomplete).not.toContain("diagnosisFrenchDisplayLabels");
    expect(panel).toContain("formatIcd10ServerResolvedOneLineDisplay");
    expect(panel).toContain("diagnosisRowExactLabel");
    expect(panel).not.toContain("getLocalizedDiagnosisDisplayLabel");
    expect(panel).not.toContain("diagnosisFrenchDisplayLabels");
    expect(entry).not.toContain("diagnosisFrenchDisplayLabels");
    expect(clinic).toContain("EncounterDiagnosticsPanel");
    expect(inpatient).toContain("EncounterDiagnosticsPanel");
    expect(dental).toContain("EncounterDiagnosticsPanel");
    expect(ed).toContain("EncounterDiagnosticsPanel");
    expect(ed).toContain("Icd10DiagnosisEntryPanel");
    expect(panel).not.toMatch(/\$\{[^}]*code[^}]*\}\s*[—·]/);
    expect(panel).toContain("description: pendingAdd.hit.shortDescription");
    expect(panel).not.toContain("description: pendingAdd.hit.displayLabel");
  });
});
