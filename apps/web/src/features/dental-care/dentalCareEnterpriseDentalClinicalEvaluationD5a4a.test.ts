import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  D5A4A_CERTIFICATION_ID,
  D5A4A_CHIEF_CONCERN_CODES,
  D5A4A_FORBIDDEN_MEDICAL_COMPLAINT_MARKERS,
  buildDentalClinicalEvaluationSavePayload,
  emptyDentalClinicalEvaluationV1,
  readDentalClinicalEvaluationFromNursingAssessment,
} from "@medora/shared";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

describe("MEDUI.D5A.4A enterprise dental clinical evaluation", () => {
  it("exports certification id", () => {
    expect(D5A4A_CERTIFICATION_ID).toBe("MEDUI.D5A.4A");
  });

  it("1: Dental Evaluation does not mount ambulatory medical evaluation panel", () => {
    const workspace = readFileSync(
      join(__dirname, "EnterpriseDentalEncounterWorkspace.tsx"),
      "utf8"
    );
    expect(workspace).toContain("EnterpriseDentalClinicalEvaluationPanel");
    expect(workspace).not.toContain("ClinicCareAmbulatoryMedicalEvaluationPanel");
    expect(workspace).not.toContain("ProviderDocumentationWorkspace");
  });

  it("1b: Dental chief concern vocabulary excludes generic medical complaints", () => {
    const joined = D5A4A_CHIEF_CONCERN_CODES.join("|").toLowerCase();
    expect(joined).not.toContain("chest");
    expect(joined).not.toContain("abdominal");
    expect(joined).not.toContain("headache");
    expect(joined).not.toContain("flank");
    expect(joined).not.toContain("limb");
    expect(D5A4A_FORBIDDEN_MEDICAL_COMPLAINT_MARKERS.some((m) => m.includes("ecg"))).toBe(true);
  });

  it("2–5: dental evaluation panel source has HPI, exam, CDM — not medical MDM templates", () => {
    const panel = readFileSync(join(__dirname, "EnterpriseDentalClinicalEvaluationPanel.tsx"), "utf8");
    expect(panel).toContain('testId="dental-eval-hpi"');
    expect(panel).toContain('testId="dental-eval-extraoral"');
    expect(panel).toContain('testId="dental-eval-intraoral"');
    expect(panel).toContain('testId="dental-eval-cdm"');
    expect(panel).not.toContain("hv-smoking-cessation");
    expect(panel).not.toContain("chest_pain");
    expect(panel).not.toContain("PROVIDER_DOCUMENTATION_TEMPLATES");
    expect(panel).not.toContain("ECG");
  });

  it("6–8: reuses enterprise patient/encounter/history — no DentalPatient/DentalNote", () => {
    const panel = readFileSync(join(__dirname, "EnterpriseDentalClinicalEvaluationPanel.tsx"), "utf8");
    const workspace = readFileSync(
      join(__dirname, "EnterpriseDentalEncounterWorkspace.tsx"),
      "utf8"
    );
    expect(panel).toContain("apiFetch(`/encounters/${encounter.id}`");
    expect(panel).toContain("sign-provider-documentation");
    expect(panel + workspace).not.toMatch(/DentalPatient|DentalMRN|DentalNote|DentalClinicalNote/);
    expect(workspace).toContain("PatientClinicalHistoryProfileBlock");
  });

  it("9: D5A.4 odontogram section remains active", () => {
    const workspace = readFileSync(
      join(__dirname, "EnterpriseDentalEncounterWorkspace.tsx"),
      "utf8"
    );
    expect(workspace).toContain("EnterpriseDentalOdontogramPanel");
  });

  it("10–12: save payload persists and reloads encounter-scoped evaluation", () => {
    const e = emptyDentalClinicalEvaluationV1();
    e.chiefConcerns = ["TOOTH_PAIN"];
    e.hpi.coldSensitivity = "YES";
    e.extraoral.tmj = "OK";
    e.assessment = "Pulpitis";
    e.clinicalDecision.findingsReviewed = true;
    const payload = buildDentalClinicalEvaluationSavePayload({
      previousNursingAssessment: { dentalServiceLineV1: { serviceLine: "DENTAL" } },
      evaluation: e,
      chiefComplaintLabelFor: (c) => c,
    });
    expect(payload.nursingAssessment.dentalClinicalEvaluationV1).toBeTruthy();
    const reloaded = readDentalClinicalEvaluationFromNursingAssessment(payload.nursingAssessment);
    expect(reloaded.chiefConcerns).toEqual(["TOOTH_PAIN"]);
    expect(reloaded.hpi.coldSensitivity).toBe("YES");
    expect(reloaded.assessment).toBe("Pulpitis");
  });

  it("15–16: EN and FR dentalCareD5a4a strings resolve", () => {
    const enBlock = (en as any).dentalCareD5a4a;
    const frBlock = (fr as any).dentalCareD5a4a;
    expect(enBlock.concerns.TOOTH_PAIN).toBeTruthy();
    expect(frBlock.concerns.TOOTH_PAIN).toBeTruthy();
    expect(enBlock.sections.hpi).toBeTruthy();
    expect(frBlock.sections.clinicalDecision).toBeTruthy();
    expect(String(enBlock.concerns.TOOTH_PAIN).toLowerCase()).not.toContain("chest");
    expect(String(frBlock.cdm.findingsReviewed)).not.toContain("ECG");
  });

  it("17: PLANNED legend uses states key — no raw findings.PLANNED", () => {
    const legend = readFileSync(
      join(__dirname, "odontogram/DentalOdontogramLegend.tsx"),
      "utf8"
    );
    expect(legend).toContain('i18nPrefix: "states"');
    expect(legend).not.toContain("dentalCareD5a4.findings.${item.key}");
    expect((en as any).dentalCareD5a4.states.PLANNED).toBe("Planned");
    expect((fr as any).dentalCareD5a4.states.PLANNED).toBe("Planifié");
    expect((en as any).dentalCareD5a4.findings.PLANNED).toBeUndefined();
  });

  it("panel save/sign controls exist", () => {
    const panel = readFileSync(join(__dirname, "EnterpriseDentalClinicalEvaluationPanel.tsx"), "utf8");
    expect(panel).toContain('data-testid="dental-eval-save"');
    expect(panel).toContain('data-testid="dental-eval-sign"');
  });
});
