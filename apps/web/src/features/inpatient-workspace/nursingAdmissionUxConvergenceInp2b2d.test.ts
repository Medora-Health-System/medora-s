/**
 * MEDUI.INP.2B.2D — sticky actions, MAR exclusion, i18n, generalization.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

const root = join(__dirname);
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const PRODUCTION_FACILITY = "90395a66-20d0-4165-aa76-e37ba3d520ed";

const SURFACE_FILES = [
  "InpatientAdmissionClinicalShell.tsx",
  "NursingAdmissionReviewDashboard.tsx",
  "NursingAdmissionWorkspaceChromeInp2b1.tsx",
  "NursingAdmissionEnterpriseHistoryEditor.tsx",
];

const ENGLISH_LEAKS = [
  "Nursing Admission",
  "Medical history",
  "Surgical history",
  "Home medications",
  "Social history",
  "Unable to verify",
  "Recreational substances",
  "Complete Nursing Admission",
  "Nursing handoff & admission completion",
];

describe("MEDUI.INP.2B.2D nursing admission final convergence", () => {
  it("sticky selected state uses persisted verificationStatus + verifiedAt", () => {
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("nursingAdmissionPreloadActionIsSelected");
    expect(shell).toContain("chipSelected");
    expect(shell).toContain("SMOKING");
    expect(shell).toContain("SOCIAL_HISTORY");
  });

  it("MAR workspace does not mount medication-reconciliation controls", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).not.toMatch(/mode=["']medications["']/);
    expect(panel).toContain("MedicationAdministrationTab");
  });

  it("home-med editor reuses catalog search with 3-character minimum", () => {
    const editor = read("NursingAdmissionEnterpriseHistoryEditor.tsx");
    expect(editor).toContain("SharedCatalogAutocomplete");
    expect(editor).toContain("nursingAdmissionHomeMedSearchMinChars");
    expect(editor).toContain("minChars={nursingAdmissionHomeMedSearchMinChars()}");
    expect(editor).toContain("homeMedications");
    expect(editor).not.toContain("/orders");
    expect(editor).not.toContain("MedicationDoseInstance");
  });

  it("FR Nursing Admission chrome is not English-leaked in i18n values", () => {
    expect(fr.inpatientAdmissionInp2b1.title).toBe("Admission infirmière");
    expect(fr.inpatientAdmissionInp2b1.steps).toBe("Étapes");
    expect(fr.inpatientAdmissionInp2b2d.preload.pmh).not.toBe("Medical history");
    expect(fr.inpatientAdmissionInp2b2d.preload.smoking).toBe("Tabac");
    expect(fr.hospitalAdmissionD4a1.verify.CONFIRMED).toBe("Confirmer");
    expect(fr.inpatientAdmissionInp2b2.review.completeAdmission).toBe(
      "Terminer l’admission infirmière"
    );
    for (const phrase of ENGLISH_LEAKS) {
      expect(JSON.stringify(fr.inpatientAdmissionInp2b1)).not.toContain(phrase);
      expect(JSON.stringify(fr.inpatientAdmissionInp2b2d)).not.toContain(phrase);
    }
  });

  it("EN locale still has English chrome via i18n", () => {
    expect(en.inpatientAdmissionInp2b1.title).toMatch(/Nursing|Admission/i);
    expect(en.inpatientAdmissionInp2b2d.preload.pmh).toBe("Medical history");
  });

  it("implementation does not hard-code a production facility ID", () => {
    for (const file of SURFACE_FILES) {
      expect(read(file)).not.toContain(PRODUCTION_FACILITY);
    }
  });

  it("Stage 6 dashboard maps enums through i18n", () => {
    const dash = read("NursingAdmissionReviewDashboard.tsx");
    expect(dash).toContain("inpatientAdmissionInp2b2d.handoffStatus");
    expect(dash).toContain("stage6-notify-${value}");
    expect(dash).toContain("stage6-handoff-${status}");
    expect(dash).not.toContain("{String(handoffAnswers.handoffStatus ??");
  });

  it("Save & Continue uses persistableAdmissionSectionCompletion rather than API CONTINUE", () => {
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("persistableAdmissionSectionCompletion");
    expect(shell).toContain('persistSection(undefined, "CONTINUE")');
    expect(shell).not.toMatch(/completionState:\s*persistModeRef/);
    expect(shell).not.toMatch(/completionState:\s*"CONTINUE"/);
  });
});
