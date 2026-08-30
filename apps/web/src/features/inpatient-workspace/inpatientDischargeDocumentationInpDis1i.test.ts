/**
 * INP.DIS.1I — Discharge board documentation hardening regressions (source-level).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateInpatientPatientInstructionsFromDiagnoses,
  inpatientDiagnosisHasSpecificInstructionTemplate,
} from "./inpatientPatientInstructionsFromDiagnoses";

const boardPath = join(__dirname, "InpatientDischargeBoard.tsx");
const autocompletePath = join(
  __dirname,
  "../../components/diagnosis/Icd10DiagnosisSearchAutocomplete.tsx"
);
const printPath = join(__dirname, "../../components/encounters/DischargePrintLayout.tsx");
const enPath = join(__dirname, "../../i18n/messages/inpatientDischargeBoardInpDis1f.en.ts");
const frPath = join(__dirname, "../../i18n/messages/inpatientDischargeBoardInpDis1f.fr.ts");

describe("INP.DIS.1I discharge documentation UX", () => {
  it("diagnosis search is description-primary with keyboard + catalog error", () => {
    const auto = readFileSync(autocompletePath, "utf8");
    const board = readFileSync(boardPath, "utf8");
    expect(auto).toContain("fontWeight: 600");
    expect(auto).toContain("WebkitLineClamp: 2");
    expect(auto).toContain("interpretIcd10SearchKeyDown");
    expect(auto).toContain("searchFailedLabel");
    expect(auto).toContain("alreadyAddedLabel");
    expect(auto).toContain("activeIndex");
    expect(board).toContain("Icd10DiagnosisSearchAutocomplete");
    expect(board).toContain("unableToSearchDiagnoses");
    expect(board).toContain("isDuplicateDischargeDiagnosis");
    expect(board).not.toContain("searchIcd10Catalog(q, 8)");
  });

  it("selected diagnosis cards show description first and do not guess a new primary", () => {
    const board = readFileSync(boardPath, "utf8");
    expect(board).toContain("removePrimary");
    expect(board).toContain("noPrimaryWarning");
    expect(board).toContain("isPrimary: false");
    expect(board).toContain("isPrimary: providerDoc.dischargeDiagnoses.length === 0");
    expect(board).toContain("{row.description || tp(\"none\")}");
    expect(board).toContain("{row.code ? (");
  });

  it("refresh from chart names authored fields and preserves clinician-edited course", () => {
    const board = readFileSync(boardPath, "utf8");
    expect(board).toContain("listProtectedChartFieldsWithUpdates");
    expect(board).toContain("refreshConfirmIntro");
    expect(board).toContain("chartUpdatesAvailable");
    expect(board).toContain("forceReplaceFields: []");
    expect(board).toContain("instructionSuggestionPending");
    expect(board).toContain("suggestedInstructionUpdates");
  });

  it("empty-state helpers are presentation-only", () => {
    const board = readFileSync(boardPath, "utf8");
    expect(board).toContain("emptyChart.consultations");
    expect(board).toContain("emptyChart.procedures");
    expect(board).toContain("emptyChart.findings");
    expect(board).toContain("emptyChart.complications");
    expect(board).not.toContain('complications: "No complications"');
    expect(board).not.toContain("placeholder={tp(\"emptyChart");
  });

  it("clinical summary and print sanitize SOAP and show description+code", () => {
    const board = readFileSync(boardPath, "utf8");
    const print = readFileSync(printPath, "utf8");
    expect(board).toContain("formatDischargeNarrativeForDisplay");
    expect(board).toContain("formatInpatientDischargeDiagnosisDisplay");
    expect(board).toContain("clinicalSummaryPrimary");
    expect(board).toContain("formatInpatientDischargePendingStudyTypeLabel");
    expect(board).toContain("enumLabel");
    expect(print).toContain("formatDischargeNarrativeForDisplay");
    expect(print).toContain("formatInpatientDischargeDiagnosisDisplay");
    expect(print).toContain("inpatientDischargeDocumentation.hospitalCourse");
    expect(print).toContain("formatInpatientDischargeHumanLabel");
  });

  it("EN/FR include diagnosis search and empty-chart helpers", () => {
    const en = readFileSync(enPath, "utf8");
    const fr = readFileSync(frPath, "utf8");
    for (const src of [en, fr]) {
      expect(src).toContain("unableToSearchDiagnoses");
      expect(src).toContain("alreadyAdded");
      expect(src).toContain("noDiagnosisTemplate");
      expect(src).toContain("chartUpdatesAvailable");
      expect(src).toContain("emptyChart");
      expect(src).toContain("removePrimary");
      expect(src).toContain("HOME_WITH_HOME_HEALTH");
    }
    expect(en).toContain("Unable to search diagnoses. Try again.");
    expect(fr).toContain("Impossible de rechercher les diagnostics. Réessayez.");
    expect(en).not.toContain("HOME_WITH_HOME_HEALTH: \"HOME_WITH_HOME_HEALTH\"");
  });

  it("instruction engine preserves description-first summary and skips code-only lookup", () => {
    const empty = generateInpatientPatientInstructionsFromDiagnoses({
      diagnoses: [{ id: "x", code: "A41.9", description: "", isPrimary: true, sortOrder: 0 }],
      locale: "en",
      facilityDisplayName: "Test",
    });
    expect(empty.hasDiagnosisSpecificTemplate).toBe(false);
    expect(empty.instructions.diagnosisInstructions).toBeUndefined();

    const { instructions, hasDiagnosisSpecificTemplate } =
      generateInpatientPatientInstructionsFromDiagnoses({
        diagnoses: [
          {
            id: "dx1",
            code: "R07.9",
            description: "Chest pain, unspecified",
            isPrimary: true,
            sortOrder: 0,
          },
        ],
        locale: "en",
        facilityDisplayName: "Test Hospital",
      });
    expect(instructions.dischargeDiagnosisSummary).toContain("Chest pain, unspecified (R07.9)");
    expect(instructions.patientInstructionsGiven).toBe(false);
    expect(hasDiagnosisSpecificTemplate).toBe(
      inpatientDiagnosisHasSpecificInstructionTemplate({
        code: "R07.9",
        description: "Chest pain, unspecified",
      })
    );
    expect(instructions.returnPrecautions?.trim().length).toBeGreaterThan(0);
  });
});
