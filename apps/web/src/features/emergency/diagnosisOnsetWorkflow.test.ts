import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("diagnosisOnsetWorkflow (MEDUI.EDBOARD.DIAGNOSIS_ONSET)", () => {
  const panel = readSrc("components/encounters/EncounterDiagnosticsPanel.tsx");
  const entry = readSrc("components/diagnosis/Icd10DiagnosisEntryPanel.tsx");
  const dialog = readSrc("components/diagnosis/AddDiagnosisDialog.tsx");
  const en = readSrc("i18n/messages/en.ts");
  const fr = readSrc("i18n/messages/fr.ts");

  it("catalog selection opens governed add dialog instead of immediate save", () => {
    expect(panel).toContain("selectionOnly");
    expect(panel).toContain("onSelectCatalog");
    expect(panel).toContain("<AddDiagnosisDialog");
    expect(panel).not.toContain("onGoPatientChart");
    expect(entry).not.toContain("diagnosisEntry.primaryOrderHint");
  });

  it("exposes clinical onset and documented timestamp separately", () => {
    expect(panel).toContain("diagnosisOnset.clinicalOnset");
    expect(panel).toContain("documentedLine");
    expect(panel).toContain("formatDocumentedAt");
    expect(dialog).toContain('role="dialog"');
    expect(dialog).toContain("ClinicalOnsetFields");
  });

  it("supports onset edit on open charts", () => {
    expect(panel).toContain("edit-onset-");
    expect(panel).toContain('mode="editOnset"');
    expect(panel).toContain("updateDiagnosis");
  });

  it("mirrors EN/FR onset keys", () => {
    expect(en).toContain("diagnosisOnset:");
    expect(fr).toContain("diagnosisOnset:");
    expect(en).toContain('clinicalOnset: "Clinical onset"');
    expect(fr).toContain('clinicalOnset: "Début clinique"');
    expect(en).toContain('headingShort: "Diagnoses"');
    expect(fr).toContain('headingShort: "Diagnostics"');
  });
});
